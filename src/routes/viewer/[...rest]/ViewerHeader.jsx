import './pacman-loader.css';
import {useContext, useState} from "react";
import mainecoon from "../../../assests/mainecoon.png"
import {Link} from 'react-router-dom';




import GeometryPicker from "./GeometryPicker.jsx";
import {AnnotationsContext} from "../../../lib/AnnotaionsContext.jsx";
import Cookies from 'js-cookie';
import oauthConfig from '../../../config/oauthConfig.js';
import {toast} from "react-toastify";
import {ServerContext} from "../../../lib/ServerContext.jsx";
import {combineUrl} from "../../../lib/search/index.js";

const ViewerPageHeader = ({
                              drawType,
                              DrawColor,
                              save,
                              onMessageChange,
                              studyUid,
                              seriesUid,
                              imageLoading,
                              handleInfoOpen
                          }) => {
    const [saveAnnotations, setSaveAnnotations] = save;
    const [, setDrawColor] = DrawColor;
    const [annotationList] = useContext(AnnotationsContext)
    const [loading, setLoading] = useState(false);

    const [server] = useContext(ServerContext)

    const getServerUrl = (server) => {
        const url = combineUrl(server);
        return url;
    }

    const handleSaveAnnotations = (studyUid, seriesUid) => {
        setSaveAnnotations(!saveAnnotations);
        const totalPixelMatrixColumns = annotationList.totalPixelMatrixColumns;

        const formatCoordinates = (type, data) => {
            switch (type) {
                case 'POLYLINE':
                    return data.map(shape => `(${shape[0]},${-shape[1]})`);
                case 'POLYGON':
                    return data.flatMap(shape => shape.map(nestedList => `(${nestedList[0]},${-nestedList[1]})`));
                case 'RECTANGLE':
                    return data.flatMap(nestedList => nestedList.map(coordinateList => `(${coordinateList[0]},${-coordinateList[1]})`));
                case 'POINT':
                    return data.map(shape => `(${shape[0]},${-shape[1]})`);
                case 'ELLIPSE':
                    let formattedCoordinates = [];
                    let MaxX = -Infinity, MaxY = -Infinity, MinX = Infinity, MinY = Infinity;
                    let pointA = '', pointB = '', pointC = '', pointD = '';

                    data.forEach(nestedList => {
                        nestedList.forEach(coordinateList => {
                            coordinateList.map((coordinateList) => {
                                if (coordinateList[0] > MaxX) {
                                    MaxX = coordinateList[0];
                                    pointA = `(${coordinateList[0]},${-coordinateList[1]})`;
                                }
                                if (coordinateList[0] < MinX) {
                                    MinX = coordinateList[0];
                                    pointC = `(${coordinateList[0]},${-coordinateList[1]})`;
                                }
                                if (coordinateList[1] > MaxY) {
                                    MaxY = coordinateList[1];
                                    pointB = `(${coordinateList[0]},${-coordinateList[1]})`;
                                }
                                if (coordinateList[1] < MinY) {
                                    MinY = coordinateList[1];
                                    pointD = `(${coordinateList[0]},${-coordinateList[1]})`;
                                }
                            });
                        });
                    });

                    formattedCoordinates.push(pointB, pointD, pointC, pointA);
                    return formattedCoordinates;
                default:
                    return [];
            }
        };

        let saveDataJson = null;
        let save = false;

        Object.values(annotationList).forEach(annotation => {
            Object.values(annotation).forEach(group => {
                if (group.editable === true) {
                    const data = Object.values(group.group).flatMap(item => {
                        if (typeof item.pointsData === 'object' && Object.keys(item.pointsData).length === 0) {
                            return [];
                        }
                        return (item.graphicType === 'POLYLINE' || item.graphicType === 'POLYGON')
                            ? item.pointsData.map(point => ({
                                type: item.graphicType,
                                GroupName: item.groupName,
                                coordinates: formatCoordinates(item.graphicType, point),
                            }))
                            : [{
                                type: item.graphicType,
                                GroupName: item.groupName,
                                coordinates: formatCoordinates(item.graphicType, item.pointsData),
                            }];
                    });
                    if (data.length > 0) {
                        saveDataJson = JSON.stringify({
                            server: getServerUrl(server),
                            token: oauthConfig.enabled ? Cookies.get('access_token') : undefined,
                            totalPixelMatrixColumns,
                            data
                        });
                        save = true;
                    }
                }
            });
        });

        if (!save) {
                toast.error('Please finish editing before saving');
            return;
        }

        setLoading(true);

        fetch(`/api/SaveAnnData/studies/${studyUid}/series/${seriesUid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: saveDataJson,
        })
            .then(response => {
                setLoading(false);
                if (response.ok) {
                    toast.success('Annotations saved successfully');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    toast.error('Failed to save annotations');
                }
            })
            .catch(() => {
                setLoading(false);
                toast.error('Network error, please try again');
            });
    };

    const handleDraw = (name, type) => {
        onMessageChange({name: name, type: type});
    }

    const handleDrawColor = (e) => {
        const hexColor = e.target.value;
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const rgbaColor = `rgba(${r}, ${g}, ${b}, 1)`;
        setDrawColor(rgbaColor);
    }


    return (
        <>
            <header className="viewer-header">
                <Link to="/search" className="viewer-brand"><img src={mainecoon} alt=""/><span>MAINECOON<small>Pathology viewer</small></span></Link>
                <div className="viewer-header-actions">
                    <Link to="/upload" className="viewer-button">Upload images</Link>
                    <Link to="/search" className="viewer-button">Back to search</Link>
                    <button onClick={handleInfoOpen}>Patient info</button>
                    <button className="viewer-save" disabled={loading || imageLoading || !seriesUid} onClick={() => handleSaveAnnotations(studyUid, seriesUid)}>{loading ? 'Saving…' : 'Save annotations'}</button>
                </div>
            </header>
            <div className="viewer-tools" role="toolbar" aria-label="Annotation tools">
                <button aria-pressed={!drawType[0]} onClick={() => handleDraw('cancel', '')}>Pan</button>
                <GeometryPicker className="viewer-geometries" activeType={drawType[0]} disabled={imageLoading || !seriesUid} onPick={(type) => handleDraw('drawtype', type)}/>
                <label className="viewer-color">Color<input type="color" aria-label="Annotation color" defaultValue="#ff0000" onChange={handleDrawColor}/></label>
            </div>
            {loading && <div className="viewer-saving" role="status" aria-live="polite">Saving annotations…</div>}
        </>
    );
};
export default ViewerPageHeader;
