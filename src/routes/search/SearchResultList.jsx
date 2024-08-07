import React, {useContext, useEffect, useRef, useState} from 'react';
import SearchResult from "./SearchResult.jsx";
import {firstQuery} from "../../lib/search/index.js";
import L_Modal from "../imageReport/LoadingModal.jsx";
import {ServerContext} from "../../lib/ServerContext.jsx";

const SearchResultList = ({state}) => {
    const searchResultListRef = useRef();
    const [results, setResults] = useState([]);
    // function onScroll() {
    //     if (searchResultListRef.current) {
    //         const clientHeight = searchResultListRef.current.clientHeight;
    //         const scrollHeight = searchResultListRef.current.scrollHeight;
    //         const scrollTop = searchResultListRef.current.scrollTop;
    //
    //         // 卷軸觸底行為
    //         if (scrollTop + clientHeight === scrollHeight) {
    //             // 下一階段查詢 不是空的才查詢
    //             // if (!isNextQueryEmpty) {
    //             //     dispatch(getNextTenResult(queryParameter));
    //             // }
    //         }
    //     }
    // }
    const [server,setServer] = useContext(ServerContext)
    const [isLoading, setIsLoading] = useState(true);
    useEffect( () => {
        setIsLoading(true);
        firstQuery(state.parameter,server).then(({ result } ) => {
            setResults(Array.isArray(result) ? result : [])
            setIsLoading(false);
            return result
        })
        const { limit, offset } = state.parameter;
        firstQuery({...state.parameter,limit:1,offset:limit + offset}).then(({ result } ) => {
            // console.log("offset", limit + offset)
            // console.log("result", result)
        })
    }, [state,server]);


    return (
        <>
            {/*-ms-overflow-style*/}
            <div className="flex-grow w-full "
                 // onScroll={onScroll}
                 ref={searchResultListRef}
            >
                    <div className="h-full">
                        <table className="w-full mr-2">
                            <thead className="sticky top-0 bg-green-600 ">
                            <tr className="h-12 text-left font-bold text-white">
                                <td className="px-3 py-2">PatientID</td>
                                <td className="px-3 py-2">Name</td>
                                <td className="px-3 py-2">Birth Date</td>
                                <td className="px-3 py-2">Sex</td>
                                <td className="px-3 py-2">Accession Number</td>
                                <td className="px-3 py-2">Study Date</td>
                                <td className="px-3 py-2">Preview</td>
                                {/*<td className="p-2 font-bold bg-green-600 text-white">SM&emsp;</td>*/}
                                {/*<td className="p-2 font-bold bg-green-600 text-white">ANN&nbsp;</td>*/}
                            </tr>
                            </thead>
                            <tbody>
                            {!isLoading && results.length == 0 ? (<td colSpan={8} className="text-center">
                                <p className="p-5 text-xl font-serif">No Results Found</p></td>
                            ) : (
                            results.map((result) => {
                                return (
                                    <SearchResult
                                        key={result.id}
                                        qidorsSingleStudy={result}
                                    />
                                );
                            }))}
                            </tbody>
                        </table>
                    </div>

            </div>
            <L_Modal isOpen={isLoading}><p className="text-black">Loading...</p></L_Modal>

        </>
    );
};

export {SearchResultList};
