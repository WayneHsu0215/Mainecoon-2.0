import React, {useContext, useEffect, useRef, useState} from 'react';
import 'ol/ol.css';
import {
    Attribution,
    defaults as defaultControls,
    FullScreen,
    OverviewMap,
    Rotate,
    ScaleLine,
    Zoom,
    ZoomSlider,
    ZoomToExtent
} from 'ol/control';
import Map from 'ol/Map.js';
import MousePosition from 'ol/control/MousePosition.js';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {computeAnnotationFeatures, getRandomColor, lightenColor, updateAnnotation} from '../../../lib/microscopy-viewers/annotation';
import {computePyramidInfo} from '../../../lib/microscopy-viewers/pyramid';
import {groupFocalPlanes, defaultFocalPlaneIndex} from '../../../lib/microscopy-viewers/focal-planes.js';
import {Fill, Stroke, Style} from 'ol/style';
import {AnnotationsContext} from "../../../lib/AnnotaionsContext.jsx";
import CircleStyle from "ol/style/Circle.js";
import VectorImageLayer from "ol/layer/VectorImage.js";
import {DragRotateAndZoom, defaults as defaultInteractions, Select, Translate, Snap} from 'ol/interaction.js';

const MicroscopyViewer = ({baseUrl, studyUid, seriesUid, images, layers,annotations, NewSeriesInfo,DrawColor,onMessageChange}) => {
    const [newSeriesInfo, setNewSeriesInfo] = NewSeriesInfo
    const {status} = newSeriesInfo;
    const [errorMessage, setErrorMessage] = useState(undefined);
    const [layer, setLayer] = layers;
    const mapRef = useRef(null);
    const targetRef = useRef(null);
    const imageLayerRef = useRef(null);
    const overviewLayerRef = useRef(null);
    const [focalPlanes, setFocalPlanes] = useState([]);
    const [focalPlaneIndex, setFocalPlaneIndex] = useState(0);

    const changeFocalPlane = (index) => {
        if (!mapRef.current || !focalPlanes[index]) return;
        try {
            const {layer} = computePyramidInfo(baseUrl, studyUid, seriesUid, focalPlanes[index].images);
            imageLayerRef.current.setSource(layer.getSource());
            overviewLayerRef.current.setSource(layer.getSource());
            setFocalPlaneIndex(index);
            setErrorMessage(undefined);
        } catch (error) { setErrorMessage(error.message); }
    };
    useEffect(() => {
        const observer = new ResizeObserver(() => mapRef.current?.updateSize());
        if (targetRef.current) observer.observe(targetRef.current);
        return () => observer.disconnect();
    }, []);
    const [annotationList, setAnnotationList] = useContext(AnnotationsContext)

    const findMaxToalPixelMatrixColumns = (images) => {
        let max = 0;
        let instanceUid = ''
        images.map((image) => {
            if (image.totalPixelMatrixColumns > max) {
                // max = image.totalPixelMatrixColumns
                instanceUid = image.instanceUID
            }
        })
        return instanceUid
    }

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setErrorMessage(undefined);
                const planes = groupFocalPlanes(images);
                const index = defaultFocalPlaneIndex(planes);
                setFocalPlanes(planes);
                setFocalPlaneIndex(index);
                const {extent, layer, resolutions, view, PixelSpacings} = computePyramidInfo(baseUrl, studyUid, seriesUid, planes[index].images);
                imageLayerRef.current = layer;
                overviewLayerRef.current = new TileLayer({source: layer.getSource()});
                const viewerElement = targetRef.current;

                const controls = [
                    // ...defaultControls().getArray(),
                    new MousePosition({
                        wrapX: false,
                        coordinateFormat: (c) => c ? `(${c[0].toFixed(2)}, ${-c[1].toFixed(2)})` : '',
                        className: 'absolute left-auto right-0 m-2 rounded-sm bg-white/75 px-1 py-0.5 text-xs font-medium',
                    }),
                    new OverviewMap({
                        collapsed: false,
                        // className: 'custom-overview-map',
                        layers: [overviewLayerRef.current],
                    }),
                    ...(PixelSpacings ? [new ScaleLine({units: 'metric', className: 'ol-scale-line'})] : []),
                    new ScaleLine(),
                    new FullScreen(),
                    // new Rotate(),
                    new ZoomSlider(),
                    new ZoomToExtent({extent, tipLabel: "Fit slide to view"}),
                    new Zoom({
                        className: 'zoom-control' // 添加自定义的类名
                    }),
                    // new Attribution(),
                ];

                const select = new Select();

                const translate = new Translate({
                    features: select.getFeatures(),
                });

                mapRef.current = new Map({
                    // shift+drag to rotate and zoom
                    interactions: defaultInteractions().extend([new DragRotateAndZoom(),select, translate]),
                    controls,
                    target: viewerElement,
                    layers: [layer],
                    view,
                });

                // mapRef.current.on('loadstart', () => setLoading(true));
                // mapRef.current.on('loadend', () => setLoading(false));
                mapRef.current.getView().fit(extent, {size: mapRef.current.getSize()});
                let tempLayer = {}

                Object.keys(annotationList).map(async (key) => {
                    const {features, group, seriesUid, centerCoordinatesArray} = await computeAnnotationFeatures(annotationList[key], resolutions);
                    if (cancelled) return;
                    const annotationGroup = Object.values(group);
                    features.forEach((feature, index) => {
                        if (feature.length > 0) {
                            const groupColor = getRandomColor();
                            const fill = group.graphicType === "POLYGON" ?
                                new Fill({color: lightenColor(groupColor)}) : undefined;
                            const style = new Style({
                                stroke: new Stroke({color: groupColor, width: 2}),
                                fill,
                                image: new CircleStyle({
                                    radius: 5,
                                    fill: new Fill({color: 'rgba(255,255,255,0.2)'}),
                                    stroke: new Stroke({color: groupColor, width: 2})
                                })
                            });
                            setAnnotationList(prevAnnotations => ({
                                ...prevAnnotations,
                                totalPixelMatrixColumns: findMaxToalPixelMatrixColumns(images),
                                [key]: [
                                    {
                                        ...prevAnnotations[key][0],
                                        group: {
                                            ...prevAnnotations[key][0].group,
                                            [annotationGroup[index].groupUid]: {
                                                ...prevAnnotations[key][0].group[annotationGroup[index].groupUid],
                                                color: groupColor,
                                                currentCenterCoordinatesIndex: 0,
                                                centerCoordinates: centerCoordinatesArray[index]
                                            }
                                        }
                                    }
                                ]
                            }));
                            const source = new VectorSource({wrapX: false, features: feature});

                            // let newLayer = mapRef.current.getLayers().getArray().find(layer => layer.get('seriesUid') === seriesUid);
                            let newLayer;
                            if (annotationGroup[0].numberOfAnnotations > 1000) {
                                newLayer = new VectorImageLayer({source, extent, style});
                            } else if (annotationGroup[0].numberOfAnnotations < 1000) {
                                newLayer = new VectorLayer({source, extent, style});
                            }
                            // newLayer = new VectorLayer({source, extent, style});
                            newLayer.setVisible(false);
                            mapRef.current.addLayer(newLayer)
                            tempLayer = {
                                ...tempLayer,
                                [seriesUid]: {
                                    ...(tempLayer[seriesUid] || {}),
                                    [annotationGroup[index].groupUid]: newLayer
                                }
                            }
                        }
                    });
                    onMessageChange({mapRef:mapRef})
                    setLayer(tempLayer);
                });
            } catch (error) {
                setErrorMessage(`Failed to load image: ${error.message}`);
                console.error(error);
            }
        };
        // {((images.length > 0)&&(Object.values(annotationList).length !== 0)) && fetchData()}
        {images.length > 0 && fetchData()}
        return () => {
            cancelled = true;
            mapRef.current?.setTarget(undefined);
            mapRef.current?.dispose();
            mapRef.current = null;
        };
    }, [baseUrl, studyUid, seriesUid, images,annotations]);

    useEffect(() => {updateAnnotation(mapRef, NewSeriesInfo, layers, setAnnotationList,DrawColor)}, [status])

    return (
        <div className="viewer-map-container">
            <div id="ViewerID" ref={targetRef} className="viewer-map"/>
            {focalPlanes.length > 1 && <label className="viewer-focal-plane">
                Z plane
                <select aria-label="Z focal plane" value={focalPlaneIndex} onChange={event => changeFocalPlane(Number(event.target.value))}>
                    {focalPlanes.map((plane, index) => <option key={plane.key} value={index}>
                        {index + 1} / {focalPlanes.length}{plane.z === null ? '' : ` · Z ${plane.z}`}
                    </option>)}
                </select>
            </label>}
            {errorMessage && <div className="viewer-map-error" role="alert">{errorMessage}</div>}
        </div>
    );
};
export default MicroscopyViewer;
