import React, {useContext, useEffect, useMemo, useState} from 'react';
import SearchResult from "../../search/SearchResult.jsx";
import {ServerContext} from "../../../lib/ServerContext.jsx";
import {CombineSearchURL, fetchPatientDetails} from "../../../lib/search/index.js";
import SearchForm from "../../search/SearchForm.jsx";
import {Icon} from "@iconify/react";


const ImageList = ({handleSlideDrawerOpen, isSlidesOpen}) => {
    const [server, setServer] = useContext(ServerContext);
    const [image, setImage] = useState();
    const [parameter, setParameter] = useState({
        StudyDateStart: undefined,
        StudyDateEnd: undefined,
        StudyTime: undefined,
        AccessionNumber: undefined,
        ModalitiesInStudy: "SM",
        ReferringPhysicianName: undefined,
        PatientName: undefined,
        PatientID: undefined,
        StudyInstanceUID: undefined,
        StudyID: undefined
    })

    const url = location.href;
    const params = new URLSearchParams(new URL(url).search);
    setServer(params.get('server'));



    const [isLoading, setIsLoading] = useState(false);
    const [isMouseOn, setIsMouseOn] = useState(false);

    const [pageLimit, setPageLimit] = useState(10);
    const [pageOffset, setPageOffset] = useState(0);
    const [isSearch, setIsSearch] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);


    useEffect(() => {
        const searchUrl = CombineSearchURL(parameter, server, pageLimit, 0);
        fetch(searchUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    return [];
                }
            })
            .then(data => {
                setImage(data)
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setImage([]);
            });
    }, [server, pageLimit])


    const [moreInfo, setMoreInfo] = useState(false);
    const handleMoreInfo = () => {
        setMoreInfo(!moreInfo)
    }

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

    const handlePageLimitChange = (e) => {
        setPageLimit(e.target.value)
    }

    const handlePageOffsetChange = (e) => {
        setPageOffset(e.target.value)
    }

    function newPageOffset() {
        return Number(pageOffset) + Number(pageLimit)
    }

    const [pageLimitGTResultLeft, setPageLimitGTResultLeft] = useState(false);

    const handleNextPage = () => {
        const newOffset = newPageOffset()
        setPageOffset(newOffset)
        const searchUrl = CombineSearchURL(parameter, server, pageLimit, newOffset);

        fetch(searchUrl)
            .then(response => {
                if (response.ok) {
                    if (response.status === 204) {
                        return [];
                    } else if (response.status === 200) {
                        return response.json();
                    } else {
                        return [];
                    }
                } else {
                    return [];
                }
            })
            .then(data => {
                setImage(data)
                // ===== 再查詢一次：將 pageLimit 和 pageOffset 加大後發送請求 =====
                const newLimit = Number (pageLimit) + Number (pageLimit);
                const searchUrl = CombineSearchURL(parameter, server, newLimit, newOffset);
                // 回傳 fetch( ... ) 結果給後續 then 處理
                fetch(searchUrl)
                    .then(response => {
                        if (response.ok) {
                            if (response.status === 204) {
                                return [];
                            } else if (response.status === 200) {
                                return response.json();
                            } else {
                                return [];
                            }
                        } else {
                            return [];
                        }
                    })
                    .then(dataLeft => {
                        if (dataLeft.length - pageLimit <= 0) {
                            setPageLimitGTResultLeft(true);
                        } else {
                            setPageLimitGTResultLeft(false);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                        setImage([]);
                    });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setImage([]);
            });
    }

    const handlePreviousPage = () => {
        if (pageOffset === 0) {
            return
        }
        const newOffset = pageOffset - pageLimit
        setPageOffset(newOffset)
        const searchUrl = CombineSearchURL(parameter, server, pageLimit, newOffset);
        fetch(searchUrl)
            .then(response => {
                if (response.ok) {
                    if (response.status === 204) {
                        return [];
                    } else if (response.status === 200) {
                        return response.json();
                    } else {
                        return [];
                    }
                } else {
                    return [];
                }
            })
            .then(data => {
                setImage(data)
                if (data.length - pageLimit >= 0) {
                    setPageLimitGTResultLeft(false)
                }else{
                    setPageLimitGTResultLeft(true)
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setImage([]);
            });
    }

    const searchFormProps = useMemo(() => ({
        setSearchResults: setImage,
        pageLimit,
        Parameter: [parameter, setParameter],
        pageOffset,
        setIsLoading,
        setIsMouseOn,
        location: "ImageList",
        setIsSearch
    }), [pageLimit, parameter, pageOffset]);

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
                        <div className="flex items-center justify-between px-2 pt-3 pb-2 rounded-md ml-1 ">
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
                                {["PatientID", "PatientName", "StudyInstanceUID", "AccessionNumber", "StudyDate", "Search"].map((name) => (
                                    <SearchForm key={name} name={name} {...searchFormProps} />
                                ))}
                            </div>
                        )}
                        {image?.length > 0 ? (
                            <>
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
                                                            <div className={`flex ${!isSearch ? ("w-80"):("w-full")} h-full  `}>
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
                            image?.length === 0 ? (
                                <div className="flex items-center justify-center w-96 h-full">
                                    <p className="text-2xl font-serif">No Results Found</p>
                                </div>
                            ) : (
                                <div className="loading-container w-96">
                                    <div className="loading items-center"></div>
                                </div>
                            )
                        )}
                    </div>
                    <div className="relative">
                        <div
                            className="absolute bottom-0 left-0 right-0 flex items-center py-2 px-1 mt-1 z-10  border-t bg-white bg-opacity-60 hover:bg-opacity-100">
                            <div className="flex flex-row justify-between w-full items-center mx-1">
                                <button
                                    className="flex items-center justify-between gap-3 bg-green-400 hover:bg-green-600 text-white font-bold rounded px-3.5 py-2"
                                    onClick={handlePreviousPage} disabled={pageOffset === 0 && pageLimit > 0}
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
                                        className="w-14 h-7 border-2 text-center border-gray-200 rounded ml-2"
                                        placeholder="Page Limit"
                                        onChange={(e) => handlePageLimitChange(e)}
                                    />
                                </div>
                                <div className="flex">
                                    <p>Offset:</p>
                                    <input
                                        type="number"
                                        min="0"
                                        name="offset"
                                        value={pageOffset}
                                        className="w-14 h-7 border-2 text-center border-gray-200 rounded ml-2"
                                        placeholder="PageOffset"
                                        onChange={(e) => handlePageOffsetChange(e)}
                                    />
                                </div>
                                <button
                                    className="flex items-center bg-green-400 hover:bg-green-600 text-white font-bold rounded px-3.5 py-2"
                                    onClick={handleNextPage}
                                    disabled={pageLimitGTResultLeft}
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
