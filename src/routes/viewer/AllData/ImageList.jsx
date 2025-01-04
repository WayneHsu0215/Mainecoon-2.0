import React, {useContext, useEffect, useState} from 'react';
import SearchResult from "../../search/SearchResult.jsx";
import {ServerContext} from "../../../lib/ServerContext.jsx";
import {CombineSearchURL, fetchPatientDetails} from "../../../lib/search/index.js";
import SearchForm from "../../search/SearchForm.jsx";
import {Icon} from "@iconify/react";


const ImageList = ({handleSlideDrawerOpen, isSlidesOpen}) => {
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
    })


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

    }, [server])


    const [moreInfo, setMoreInfo] = useState(false);
    const handleMoreInfo = () => {
        setMoreInfo(!moreInfo)
    }

    const [isLoading, setIsLoading] = useState(false);
    const [isMouseOn, setIsMouseOn] = useState(false);

    const [pageLimit, setPageLimit] = useState(10);
    const [pageOffset, setPageOffset] = useState(0);
    const [handleNextPageChange, setHandleNextPageChange] = useState(false);
    const [isSearch, setIsSearch] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const handleSearch = () => {
        if (isSearch) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsSearch(false);
                setIsAnimating(false);
            }, 500);
        } else {
            setIsSearch(true);
        }
    }

    console.log('imageLength:', image?.length);


    return (
        <>
            {isSlidesOpen && (
                <div className="flex-grow w-auto border-r border-gray-400 max-w-2xl">
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
                                    className="flex items-center justify-between px-2 pt-3 pb-2 rounded-md ml-1 ">
                                    <div className="flex gap-3 shrink-0">
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
                                    {!isSearch ? (
                                        <div className="flex items-center border rounded-lg border-black p-2 font-bold"
                                             onClick={handleSearch}>
                                            <Icon icon="cil:search" className="w-6 h-6"/>
                                            <span>Search </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center p-2 font-bold w-full justify-end"
                                             onClick={handleSearch}>
                                            <Icon icon="line-md:chevron-small-up" width="20" height="20"/>
                                        </div>
                                    )}
                                </div>
                                {isSearch && (
                                    <div
                                        className={`flex flex-col ${isAnimating ? "animate-slideUp" : "animate-slideDown"}
                                    transition-all duration-500 border-b border-black mb-2 pb-2 mx-3`}>
                                        <SearchForm name="PatientID" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsLoading={setIsLoading}
                                                    setIsMouseOn={setIsMouseOn} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                        <SearchForm name="PatientName" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsMouseOn={setIsMouseOn}
                                                    setIsLoading={setIsLoading} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                        <SearchForm name="StudyInstanceUID" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsMouseOn={setIsMouseOn}
                                                    setIsLoading={setIsLoading} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                        <SearchForm name="AccessionNumber" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsMouseOn={setIsMouseOn}
                                                    setIsLoading={setIsLoading} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                        <SearchForm name="StudyDate" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsMouseOn={setIsMouseOn}
                                                    setIsLoading={setIsLoading} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                        <SearchForm name="Search" setSearchResults={setImage}
                                                    pageLimit={pageLimit} Parameter={[parameter, setParameter]}
                                                    pageOffset={pageOffset} setIsMouseOn={setIsMouseOn}
                                                    setIsLoading={setIsLoading} location="ImageList"
                                                    setIsSearch={setIsSearch}/>
                                    </div>
                                )}


                                <div className="bg-white mx-2 pb-16 ">
                                    <div className="m-2">
                                        <table className="w-full ">
                                            {!image && image?.length === 0 ? (
                                                <tbody>
                                                <tr>
                                                    <td colSpan={6} className="text-center">
                                                        <p className="p-5 text-xl font-serif">No Results Found</p>
                                                    </td>
                                                </tr>
                                                </tbody>
                                            ) : (
                                                <tbody>
                                                {image?.map((result) => (
                                                    <tr key={result.id}>
                                                        <td className="w-full">
                                                            <div className="flex w-80 h-full  ">
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
                                </div>
                            </>
                        ) : (
                            <div className="loading-container w-96">
                                <div className="loading items-center"></div>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <div
                            className="absolute bottom-0 left-0 right-0 flex items-center py-2 px-1 mt-1 z-10  border-t bg-white bg-opacity-60 hover:bg-opacity-100">
                            <div className="flex flex-row justify-between w-full items-center mx-1">
                                <button
                                    className="flex items-center justify-between gap-3 bg-green-400 hover:bg-green-600 text-white font-bold rounded px-3 py-1"
                                    onClick={handleSlideDrawerOpen}
                                >
                                    {'<'}
                                </button>
                                <div className="flex">
                                    <p>Limit:</p>
                                    <input
                                        type="number"
                                        min="1"
                                        name="limit"
                                        value={pageLimit}
                                        className="w-28 h-7 border-2 text-center border-gray-200 rounded ml-2"
                                        placeholder="Page Limit"
                                    />
                                </div>
                                <button
                                    className="flex items-center bg-green-400 hover:bg-green-600 text-white font-bold rounded px-3 py-1"
                                    onClick={handleSlideDrawerOpen}
                                >
                                    {'>'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export {ImageList};
