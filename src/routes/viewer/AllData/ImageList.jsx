import React, {useContext, useEffect, useState} from 'react';
import SearchResult from "../../search/SearchResult.jsx";
import {ServerContext} from "../../../lib/ServerContext.jsx";
import {CombineSearchURL, fetchPatientDetails} from "../../../lib/search/index.js";


const ImageList = ({handleSlideDrawerOpen,isSlidesOpen}) => {
    const [server, setServer] = useContext(ServerContext);
    const [image, setImage] = useState();
    const [parameter, setParameter] = useState({
        StudyDate: undefined,
        StudyTime: undefined,
        AccessionNumber: undefined,
        ModalitiesInStudy: "SM",
        ReferringPhysicianName: undefined,
        PatientName: undefined,
        PatientID: undefined,
        StudyInstanceUID: undefined,
        StudyID: undefined
    });


    useEffect(() => {
        const searchUrl = CombineSearchURL(parameter, server, 10, 0);
        fetch(searchUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    return [];
                }
            })
            .then(data => {
                console.log('data:', data);
                setImage(data)
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setImage([]);
            });

    }, [])


    const [moreInfo, setMoreInfo] = useState(false);
    const handleMoreInfo = () => {
        setMoreInfo(!moreInfo)
    }



    return (
        <>
            {isSlidesOpen && (
                <div className="flex-grow w-auto border-r border-gray-400 ">
                    <div className="h-full overflow-y-auto">
                        <div className="flex items-center justify-between gap-3 p-2 mt-1 mx-2 border-b-2 ">
                            <label htmlFor="moreInfo" className="text-xl font-sans font-bold text-green-400">
                                Slides
                            </label>
                            <div className="flex items-center justify-end">
                                <button
                                    className="flex items-center bg-gray-400 hover:bg-gray-600 text-white font-bold rounded-l-lg px-3 py-3"
                                    onClick={handleSlideDrawerOpen}
                                >{'<<'}
                                </button>
                            </div>
                        </div>
                        {image ? (
                            <>
                                <div
                                    className="flex items-center gap-3 px-2 pt-3 pb-2 rounded-md ml-1 ">
                                    <button
                                        onClick={handleMoreInfo}
                                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${moreInfo ? 'bg-blue-500' : 'bg-gray-300'}`}
                                    >
                                        <div
                                            className={`w-4 h-4 bg-white rounded-full transform transition-all duration-300 ${moreInfo ? 'translate-x-6' : ''}`}/>
                                    </button>
                                    <label htmlFor="moreInfo" className="font-sans font-medium text-gray-700 ">
                                        MORE INFO
                                    </label>
                                </div>
                                <div className="bg-white mx-2">
                                    <table className="w-full ">
                                        {!image && image?.length === 0 ? (
                                            <tbody>
                                            <tr>
                                                <td colSpan={8} className="text-center">
                                                    <p className="p-5 text-xl font-serif">No Results Found</p>
                                                </td>
                                            </tr>
                                            </tbody>
                                        ) : (
                                            <tbody>
                                            {image?.map((result) => (
                                                <tr key={result.id}>
                                                    <td className="w-full">
                                                        <div className="flex w-96 h-full overflow-hidden ">
                                                            <SearchResult Result={result} locate="viewer"
                                                                          moreInfo={moreInfo}/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        )}
                                    </table>
                                </div>
                            </>) : (
                            <div className="loading-container w-96">
                                <div className="loading items-center"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export {ImageList};
