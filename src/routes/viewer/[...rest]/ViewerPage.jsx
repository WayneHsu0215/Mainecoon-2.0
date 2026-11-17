import React, {useContext, useEffect, useRef, useState} from 'react';
import MicroscopyViewer from './MicroscopyViewer';
import {combineUrl, fetchPatientDetails, generateSeriesUID} from "../../../lib/search/index.js";
import {Icon} from "@iconify/react";
import ViewerPageHeader from "./ViewerHeader.jsx";
import "./viewer.css";
import {getAnnotations, getImagingInfo, getSeriesInfo} from '../../../lib/dicom-webs/series';
import {DICOMWEB_URLS} from '../../../lib/dicom-webs';
import {getSlideLabel} from "../../../lib/image/index.js";
import RightDrawer from "./RightDrawer.jsx";
import {AnnotationsContext} from "../../../lib/AnnotaionsContext.jsx";
import {easeOut} from "ol/easing.js";
import {Overlay} from "ol";
import {toast} from "react-toastify";
import {ImageList} from "../AllData/ImageList.jsx";

const ViewerPage = () => {
    const searchParams = new URLSearchParams(window.location.search)
    const server = searchParams.get('server') || DICOMWEB_URLS[0].name;
    const baseUrl = combineUrl(server)
    const studyUid = searchParams.get('studyUid')
    const seriesUidFromPreviewImage = searchParams.get('seriesUid')
    const [seriesUID, setSeriesUID] = useState('')
    const [AllSeriesID, setAllSeriesID] = useState([])
    const urlInfo = {server, studyUid, seriesUID}
    const [smSeries, setSmSeries] = useState([])
    const [annSeries, setAnnSeries] = useState([])
    const [images, setImages] = useState([])
    const [annotations, setAnnotations] = useState({})
    const [isLeftOpen, setIsLeftOpen] = useState(false)
    const [isRightOpen, setIsRightOpen] = useState(() => window.innerWidth >= 1100)
    const [labelOpen, setLabelOpen] = useState([1, 1, 1, 1, 1, 1])
    const [drawType, setDrawType] = useState(null)
    const [save, setSave] = useState(false)
    const [layers, setLayers] = useState({})
    const [data, setData] = useState([])
    const patientDetails = fetchPatientDetails(data[0])
    const [annotationList, setAnnotationList] = useContext(AnnotationsContext)
    const [drawColor, setDrawColor] = useState('rgba(255, 0, 0, 1)')
    const [loading, setLoading] = useState(false);
    const [currentDraw, setCurrentDraw] = useState({seriesUid: "", index: ""})
    const [newSeriesInfo, setNewSeriesInfo] = useState({
        action: '',
        name: '',
        status: false,
        type: '',
        annSeriesUid: '',
        annGroupUid: '',
        smSeriesUid: ''
    })
    const [annotationSeriesUid, setAnnotationSeriesUid] = useState('')
    const [isInfoOpen, setIsInfoOpen] = useState(true)

    const RightDrawerOpen = () => {
        setFocused(false);
        setIsRightOpen(!isRightOpen);
        if (window.innerWidth < 1100) setIsSlidesOpen(false)
    }



    const handleLabelOpen = (e, value) => {
        e.preventDefault();
        const newLabelOpen = [...labelOpen];
        newLabelOpen[value] = newLabelOpen[value] === 0 ? 1 : 0;
        setLabelOpen(newLabelOpen);
    }


    useEffect(() => {
        try {
            const fetchSeries = async () => {
                try {
                    const seriesResult = await fetch(`${combineUrl(server)}/studies/${studyUid}/series`);
                    const seriesJson = await seriesResult.json();
                    let sm = [], ann = [];
                    let SeriesUID = ''
                    for (const series of seriesJson) {
                        const attribute = series["00080060"]?.Value[0];
                        const seriesId = series["0020000E"]?.Value[0];
                        AllSeriesID.push(seriesId);
                        if (attribute === "SM") {
                            const slideTitle = await getSlideLabel(baseUrl, studyUid, seriesId);
                            sm.push([seriesId, slideTitle]);
                            SeriesUID = seriesId
                        } else if (attribute === "ANN") {
                            const accessionNumber = series["00080050"]?.Value?.[0] ?? "unknown";
                            ann.push([seriesId, accessionNumber]);
                        }
                    }
                    setSmSeries(sm);
                    setAnnSeries(ann);
                    if (!seriesUidFromPreviewImage) {
                        setSeriesUID(SeriesUID);
                    } else {
                        setSeriesUID(seriesUidFromPreviewImage);
                    }

                } catch (error) {
                    console.error("Error fetching series:", error);
                }
            };

            const fetchDetails = async () => {
                try {
                    const response = await fetch(`${combineUrl(server)}/studies?ModalitiesInStudy=SM&StudyInstanceUID=${studyUid}`);
                    const data = await response.json();
                    setData(data)
                } catch (e) {
                    console.log('error', e)
                }
            }
            fetchSeries()
            fetchDetails();
        } catch (e) {
            console.log(e)
        }
    }, [server])


    useEffect(() => {
        const fetchData = async () => {
            if (studyUid === null || seriesUID === null || studyUid === "" || seriesUID === "") return;
            const series = await getSeriesInfo(baseUrl, studyUid, seriesUID);
            const SeriesUID = series?.modality === 'SM' ? seriesUID : series?.referencedSeriesUid;
            setSeriesUID(SeriesUID);
            const imagingInfo = await getImagingInfo(baseUrl, studyUid, seriesUID);
            setImages(imagingInfo);
        };
        fetchData();
    }, [seriesUID])

    // 依據annSeries抓出對應的annotations
    useEffect(() => {
        async function processAnnotations() {
            const promises = annSeries.map(async (ann) => {
                const seriesUid = ann[0];
                const instances = await getAnnotations(baseUrl, studyUid, seriesUid);
                return {seriesUid, instances};
            });
            const results = await Promise.all(promises);
            const annotations = {};
            results.forEach(({seriesUid, instances}) => {
                annotations[seriesUid] = instances;
            });
            setAnnotations(annotations)
            setAnnotationList(annotations)
        }

        processAnnotations()
    }, [annSeries])

    const [centerCoordinatesData, setCenterCoordinatesData] = useState({})

    const handleMessageChange = (message) => {
        const {
            action,
            name,
            type,
            seriesUid,
            groupUid,
            smSeriesUid,
            centerCoordinates,
            currentCenterCoordinatesIndex
        } = message
        if (name === 'deleteGroup' || name === 'deleteSeries') {
            setAnnotationSeriesUid('')
        } else {
            setAnnotationSeriesUid(seriesUid)
        }

        const actionMap = {
            addSeries: 'add',
            addGroup: 'add',
            currentDraw: 'update',
            deleteGroup: 'delete',
            deleteSeries: 'delete',
            cancel: 'cancel',
            panTo: 'panTo'
        }

        if (actionMap[name]) {
            if (name === 'panTo') {
                setCenterCoordinatesData({
                    action: action,
                    centerCoordinates: centerCoordinates,
                    currentCenterCoordinatesIndex: currentCenterCoordinatesIndex,
                    seriesUid: seriesUid,
                    groupUid: groupUid,
                })
            } else {
                setNewSeriesInfo({
                    action: actionMap[name],
                    name: name,
                    status: true,
                    type: type,
                    annSeriesUid: seriesUid,
                    annGroupUid: groupUid,
                    smSeriesUid: smSeriesUid
                })
            }
        }
    };
    const map = useRef(null);

    function panTo(action, index, centerCoordinates, seriesUid, groupUid) {
        if (centerCoordinates[index][0] !== 0 && centerCoordinates[index][1] !== 0) {
            if (map.current) {
                const view = map.current.getView();
                view.animate({
                    center: centerCoordinates[index],
                    zoom: view.getZoom() + 5, // 或者設定一個特定的縮放級別
                    duration: 1000,
                    easing: easeOut,
                });

                let markerOverlay = map.current.getOverlayById('markerOverlay');
                if (!markerOverlay) {
                    const markerElement = document.createElement('div');
                    markerElement.style.width = '3px';
                    markerElement.style.height = '3px';
                    markerElement.style.backgroundColor = 'red';
                    markerElement.style.borderRadius = '50%';

                    markerOverlay = new Overlay({
                        element: markerElement,
                        positioning: 'center-center',
                        id: 'markerOverlay'
                    });
                    map.current.addOverlay(markerOverlay);
                }

                // 設置Overlay的位置
                markerOverlay.setPosition(centerCoordinates[index]);
            }
        }
        setAnnotationList(prevAnnotations => ({
            ...prevAnnotations,
            [seriesUid]: prevAnnotations[seriesUid].map(annotation => ({
                ...annotation,
                group: {
                    ...annotation.group,
                    [groupUid]: {
                        ...annotation.group[groupUid],
                        currentCenterCoordinatesIndex:
                            action === 'next'
                                ? (index + 1) % annotation.group[groupUid].centerCoordinates.length
                                : (index - 1 + annotation.group[groupUid].centerCoordinates.length) %
                                annotation.group[groupUid].centerCoordinates.length,
                    }
                }
            }))
        }));


    }

    useEffect(() => {
        if (centerCoordinatesData.centerCoordinates) {
            panTo(
                centerCoordinatesData.action,
                centerCoordinatesData.currentCenterCoordinatesIndex,
                centerCoordinatesData.centerCoordinates,
                centerCoordinatesData.seriesUid,
                centerCoordinatesData.groupUid
            )
        }
    }, [centerCoordinatesData]);

    const handlePanToMessage = (message) => {
        const {mapRef} = message
        map.current = mapRef.current
    }

    const getDrawType = (value) => {
        const {name, type} = value;
        setDrawType(type);
        if (name === 'cancel') {
            setAnnotationSeriesUid('')
            setCurrentDraw({seriesUid: "", index: ""});
            handleMessageChange({name: 'cancel', type: '', seriesUid: '', groupUid: '', smSeriesUid: ''});
        } else if (name === 'drawtype') {
            if (annotationSeriesUid === "") {
                const seriesUid = generateSeriesUID();
                handleMessageChange({
                    name: 'addSeries',
                    type: type,
                    seriesUid: seriesUid,
                    groupUid: '',
                    smSeriesUid: seriesUID
                });
                setCurrentDraw({seriesUid: seriesUid, index: 0});
            } else {
                const groupEntries = Object.entries(annotationList[annotationSeriesUid][0].group);
                const matchingGroups = groupEntries.filter(([key, item]) => item.graphicType === type);
                if (matchingGroups.length > 0) {
                    const latestGroupEntry = matchingGroups[matchingGroups.length - 1];
                    const groupUid = latestGroupEntry[0];

                    handleMessageChange({
                        name: "currentDraw",
                        type: type,
                        seriesUid: annotationSeriesUid,
                        groupUid: groupUid
                    });
                    setCurrentDraw({seriesUid: annotationSeriesUid, index: groupEntries.indexOf(latestGroupEntry)});
                } else {
                    handleMessageChange({name: "addGroup", type: type, seriesUid: annotationSeriesUid, groupUid: ""});
                    const groupLength = Object.keys(annotationList[annotationSeriesUid][0].group).length;
                    setCurrentDraw({seriesUid: annotationSeriesUid, index: groupLength});
                }
            }
        }
    }

    // const handleDeleteAnn = (e, seriesUid) => {
    //     e.preventDefault();
    //     fetch(`${combineUrl(server)}/studies/${studyUid}/series/${seriesUid}/delete-with-reason`, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //             reason: 'Delete annotation series',
    //         }),
    //     })
    //         .then((response) => {
    //             if (response.ok) {
    //                 // Post成功，执行delete请求
    //                 fetch(`${combineUrl(server)}/studies/${studyUid}/series/${seriesUid}`, {
    //                     method: 'DELETE',
    //                     headers: {
    //                         'Content-Type': 'application/json',
    //                     },
    //                 })
    //                     .then((deleteResponse) => {
    //                         if (deleteResponse.ok) {
    //                             // 删除成功，更新状态
    //                             const newAnnAccessionNumber = annSeries.filter((item) => item[0] !== seriesUid);
    //                             setAnnSeries(newAnnAccessionNumber);
    //                             // 刷新页面
    //                             window.location.reload(); // 刷新整个页面
    //
    //                         }
    //                     })
    //                     .catch((error) => {
    //                         console.error('Error deleting series:', error);
    //                     });
    //             }
    //         })
    //         .catch((error) => {
    //             console.error('Error posting delete reason:', error);
    //         });
    // };
    const handleDeleteAnn = (e, seriesUid) => {
        toast.error('刪除功能目前遇到伺服器錯誤，目前維修中')
    };

    const handleInfoOpen = () => {
        setFocused(false);
        setIsRightOpen(true);
        setIsInfoOpen(value => !value);
        if (window.innerWidth < 1100) setIsSlidesOpen(false)
    }

    const [isSlidesOpen, setIsSlidesOpen] = useState(() => window.innerWidth >= 1400);
    const [focused, setFocused] = useState(false);
    const handleSlideDrawerOpen = () => {
        setFocused(false);
        setIsSlidesOpen(!isSlidesOpen);
        if (window.innerWidth < 1100) setIsRightOpen(false)
    }

    return (
        <main className="viewer-shell">
            <ViewerPageHeader drawType={[drawType, setDrawType]} save={[save, setSave]}
                detail={patientDetails} onMessageChange={getDrawType} DrawColor={[drawColor, setDrawColor]}
                studyUid={studyUid} seriesUid={seriesUID} imageLoading={loading} handleInfoOpen={handleInfoOpen}/>
            <nav className="viewer-workspace-bar" aria-label="Workspace panels">
                <div className="viewer-panel-actions">
                    <button aria-pressed={isSlidesOpen && !focused} onClick={handleSlideDrawerOpen}>Slides</button>
                    <button aria-pressed={isRightOpen && !focused} onClick={RightDrawerOpen}>Details & annotations</button>
                </div>
                <span className="viewer-study" title={studyUid || ''}>{studyUid ? 'Study · ' + studyUid : 'No study selected'}</span>
                <button aria-pressed={focused} onClick={() => setFocused(value => !value)}>{focused ? 'Restore panels' : 'Focus mode'}</button>
            </nav>
            <div className="viewer-workspace">
                {!focused && isSlidesOpen && <aside className="viewer-slides" aria-label="Slides"><ImageList isSlidesOpen={isSlidesOpen} handleSlideDrawerOpen={handleSlideDrawerOpen}/></aside>}
                <section className="viewer-canvas" aria-label="Slide image">
                    <MicroscopyViewer
                        baseUrl={baseUrl}
                        studyUid={studyUid}
                        seriesUid={seriesUID}
                        images={images}
                        layers={[layers, setLayers]}
                        Loading={[loading, setLoading]}
                        className="grow"
                        NewSeriesInfo={[newSeriesInfo, setNewSeriesInfo]}
                        DrawColor={drawColor}
                        annotations={annotations}
                        onMessageChange={handlePanToMessage}
                    />

                    {!studyUid && <div className="viewer-empty"><h2>Select a slide to begin</h2><p>Open Slides or return to search to choose a study.</p></div>}
                </section>
                {!focused && isRightOpen && <aside className="viewer-details" aria-label="Details and annotations">
                        <RightDrawer
                            labelOpen={labelOpen}
                            handleLabelOpen={handleLabelOpen}
                            handleDeleteAnn={handleDeleteAnn}
                            RightDrawerOpen={RightDrawerOpen}
                            onMessageChange={handleMessageChange}
                            Layers={[layers, setLayers]}
                            detail={patientDetails}
                            Loading={loading}
                            SMseriesUid={seriesUID}
                            urlInfo={urlInfo}
                            drawType={drawType}
                            CurrentDraw={[currentDraw, setCurrentDraw]}
                            isInfoOpen={isInfoOpen}
                            handleInfoOpen={handleInfoOpen}
                        />

                </aside>}
            </div>
            <footer className="viewer-status"><span>{drawType ? 'Drawing · ' + drawType : 'Pan mode'}</span><span>Scroll to zoom · Drag to pan · Double-click to finish a line or polygon</span></footer>
        </main>
    );
};
export default ViewerPage;
