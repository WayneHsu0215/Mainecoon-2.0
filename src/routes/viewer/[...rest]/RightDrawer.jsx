import {Icon} from "@iconify/react";
import SpecimenList from "./Specimen.jsx";
import React, {useState} from "react";
import DescriptionPlate from "./DescriptionPlate.jsx";
import Annotaions from "./Annotaions.jsx";
import GeometryPicker from "./GeometryPicker.jsx";
import mdiAddSeries from '@iconify-icons/mdi/add';
import {generateSeriesUID} from "../../../lib/search/index.js";
import PatientDetails from "./PatientDetails.jsx";

const RightDrawer = ({
                         detail,
                         urlInfo,
                         SMseriesUid,
                         labelOpen,
                         handleLabelOpen,
                         Loading,
                         Layers,
                         RightDrawerOpen,
                         handleDeleteAnn,
                         CurrentDraw,
                         onMessageChange,
                         isInfoOpen,
                         handleInfoOpen
                     }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [drawTypes, setDrawTypes] = useState('');
    const [currentDraw, setCurrentDraw] = CurrentDraw;

    const AddNewSeries = (value) => {
        const seriesUid = generateSeriesUID();
        setDrawTypes(value);
        onMessageChange({name: 'addSeries', type: value, seriesUid: seriesUid, smSeriesUid: SMseriesUid});
        setIsOpen(false);
        setCurrentDraw({seriesUid: seriesUid, index: 0});
        onMessageChange({seriesUid: seriesUid});
    };

    const openGeometryPicker = (event) => {
        event.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleMessage = (message) => {
        onMessageChange(message);
    };

    return (
        <div className="h-auto overflow-y-auto shrink-0 w-96 z-50">
            <div className="flex flex-col w-full h-full border-end ">
                <div className="flex flex-row justify-start ">
                    <div className="flex z-30">
                        <button
                            className="flex items-center bg-gray-400 hover:bg-gray-600 text-white font-bold rounded-r-lg px-3 py-2 "
                            onClick={RightDrawerOpen}>{'>>'}
                        </button>
                    </div>
                    <div className="flex flex-row items-center gap-3 px-2 pt-3 pb-2 rounded-md ml-1 ">
                        <button
                            onClick={(e) => handleLabelOpen(e, 3)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${labelOpen[3] !== 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                            <div
                                className={`w-4 h-4 bg-white rounded-full transform transition-all duration-300 ${labelOpen[3] !== 0 ? 'translate-x-6' : ''}`}/>
                        </button>
                        <label htmlFor="Slide label" className="font-sans font-medium text-gray-700 ">
                            Slide label
                        </label>
                    </div>
                    <div className="flex flex-row items-center gap-3 px-2 pt-3 pb-2 rounded-md ml-1 ">
                        <button
                            onClick={(e) => handleLabelOpen(e, 4)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${labelOpen[4] !== 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                        >
                            <div
                                className={`w-4 h-4 bg-white rounded-full transform transition-all duration-300 ${labelOpen[4] !== 0 ? 'translate-x-6' : ''}`}/>
                        </button>
                        <label htmlFor="Specimens" className="font-sans font-medium text-gray-700 ">
                            Specimens
                        </label>
                    </div>
                </div>
                {isInfoOpen && (
                    <div
                        className={`h-auto rounded-xl ${labelOpen[0] !== 0 ? ("border-2 m-2 border-gray-200 ") : ("hidden")}`}>
                        <div className="flex justify-between mr-3">
                            <label className="text-xl font-sans font-bold text-green-400 ml-1 p-2">
                                Info
                            </label>
                            <button
                                onClick={handleInfoOpen}
                                className="flex items-center p-1 transition-all justify-center duration-300 hover:bg-red-400 mt-1 mb-1 rounded-lg w-8"
                            >
                                X
                            </button>
                        </div>
                        <div className={`h-auto ${labelOpen[0] !== 0 ? ("border-t mx-2 border-gray-200 ") : ("hidden")}`}>
                            <PatientDetails labelOpen={labelOpen} detail={detail} label="Patient" style="Patient"/>
                        </div>
                    </div>
                )}
                <div className={`h-auto rounded-xl ${labelOpen[4] !== 0 ? ("border-2 m-2 border-gray-200 ") : ("hidden")}`}>
                    <DescriptionPlate label="Specimens"
                                      icon="pajamas:details-block"
                                      isOpen={labelOpen[4] !== 0}
                                      onClick={(e) => handleLabelOpen(e, 4)}
                    >
                        <SpecimenList urlInfo={urlInfo}/>
                    </DescriptionPlate>
                </div>
                <div
                    className={`h-auto rounded-xl ${labelOpen[3] !== 0 ? ("border-2 m-2 border-gray-200 ") : ("hidden")}`}>
                    <DescriptionPlate label="Slide label"
                                      icon="pajamas:details-block"
                                      isOpen={labelOpen[3] !== 0}
                                      onClick={(e) => handleLabelOpen(e, 3)}
                    >
                        <SpecimenList urlInfo={urlInfo}/>
                    </DescriptionPlate>
                </div>
                <div className={`h-auto rounded-xl ${labelOpen[5] !== 0 && "border-2 m-2 border-gray-200 "}`}
                >
                    <DescriptionPlate
                        label="Annotations"
                        icon="pajamas:details-block"
                        isOpen={labelOpen[5] !== 0}
                        onClick={(e) => handleLabelOpen(e, 5)}
                        action={
                            <>
                                <button
                                    className="border-1 hover:bg-green-200 rounded-lg m-2 p-1 font-sans font-bold text-sm"
                                    onClick={openGeometryPicker}
                                >
                                    <Icon icon={mdiAddSeries} width="20" height="20"/>
                                </button>
                                <div className="relative">
                                    <div
                                        className={`absolute bg-white -right-8 z-10 border-2 rounded-xl p-2 mt-3 flex ${
                                            isOpen ? "" : "hidden"
                                        }`}
                                    >
                                        <GeometryPicker
                                            className="bg-white/80"
                                            onPick={(value) => AddNewSeries(value)}
                                            onClick={openGeometryPicker}
                                        />
                                    </div>
                                </div>
                            </>
                        }
                    >
                        <div className=" max-h-[700px] h-auto overflow-y-auto">
                            <Annotaions
                                Layers={Layers}
                                onMessageChange={handleMessage}
                                Loading={Loading}
                                handleDeleteAnn={handleDeleteAnn}
                                CurrentDraw={CurrentDraw}
                            />
                        </div>
                    </DescriptionPlate>
                </div>
            </div>
        </div>
    );
};

export default RightDrawer;
