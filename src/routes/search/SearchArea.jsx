import SearchPageHeader from "../search/SearchPageHeader.jsx"
import React, {useContext, useEffect, useState} from 'react';
import {SearchResultList} from "../search/SearchResultList.jsx";
import {firstQuery} from "../../lib/search/index.js";
import {Icon} from "@iconify/react";
import {ServerContext} from "../../lib/ServerContext.jsx";
import Server from "./Server.jsx";


const Main = () => {
    const [state, setState] = useState({
        config: {},
        parameter: {
            StudyDate: undefined,
            StudyTime: undefined,
            AccessionNumber: undefined,
            ModalitiesInStudy: "SM",
            ReferringPhysicianName: undefined,
            PatientName: undefined,
            PatientID: undefined,
            StudyInstanceUID: undefined,
            StudyID: undefined,
            limit: 10,
            offset: 0
        },
        isNextQueryEmpty: false,
        status: null
    });
    const [pageLimit, setPageLimit] = useState(state.parameter.limit || 10);
    const [pageOffset, setPageOffset] = useState(state.parameter.offset || 0);
    const [server, setServer] = useContext(ServerContext)
    const [handlePrePageChange, setHandlePrePageChange] = useState(true);
    const [handleNextPageChange, setHandleNextPageChange] = useState(true);

    const handlePageLimit = (e) => {
        const {name, value} = e.target;
        if (name === "offset") {
            setPageOffset(value)
        } else if (name === "limit") {
            setPageLimit(value)
        }
    }

    const handlePrePageChangeMessage = () => {
        const newPageOffset = pageOffset - pageLimit
        if (newPageOffset < 0) {
            setPageOffset(0)
            return
        } else {
            setPageOffset(newPageOffset)
        }
    }
    const handleNextPageChangeMessage = () => {
        const newPageOffset = Number(pageOffset) + Number(pageLimit)
        if (newPageOffset < 0) {
            setPageOffset(0)
            return
        } else {
            setPageOffset(newPageOffset)
        }
    }

    useEffect(() => {
        setState({
            ...state,
            parameter: {
                ...state.parameter,
                limit: pageLimit || 10,
                offset: pageOffset || 0
            }
        })
    }, [pageOffset, pageLimit]);


    useEffect(() => {
        const {limit, offset} = state.parameter;
        setHandlePrePageChange(offset > 0)
        firstQuery({...state.parameter, limit: 1, offset: limit + offset}, server).then(({result}) => {
            setHandleNextPageChange(result.length > 0)
        })
    }, [state, server !== undefined]);


    return (
        <div className="flex flex-col h-full ">
            <div>
                <Server server={[server,setServer]} initialState={{state, setState}}/>
            </div>
            <div className="h-full m-4 overflow-auto bg-white border">
                <SearchResultList state={state}/>
            </div>
            <div className="flex items-center justify-center h-fit bg-gray-200 p-1">
                <button className="shadow-2xl w-9  flex justify-center items-center shadow-black m-2 rounded-md px-2 bg-green-600 text-white h-9 disabled:bg-gray-400"
                    onClick={handlePrePageChangeMessage} disabled={!handlePrePageChange}>
                    <Icon icon="el:chevron-left"/>
                </button>
                <p className="px-3">Limit:</p>
                <input
                    type="number"
                    min="1"
                    name="limit"
                    value={pageLimit}
                    className="w-28 h-9 border-2 text-center border-gray-200 rounded-lg mr-3"
                    placeholder="Page Limit"
                    onChange={handlePageLimit}
                />
                <p className="px-3">Offset:</p>
                <input
                    type="number"
                    min="1"
                    name="offset"
                    value={pageOffset}
                    className="w-28 h-9 border-2 text-center border-gray-200 rounded-lg mr-3"
                    placeholder="Page Offset"
                    onChange={handlePageLimit}
                />
                <button
                    className="shadow-2xl w-9  flex justify-center items-center shadow-black m-2 rounded-md px-2 bg-green-600 text-white h-9 disabled:bg-gray-400"
                    onClick={handleNextPageChangeMessage} disabled={!handleNextPageChange}>
                    <Icon icon="el:chevron-right"/>
                </button>
            </div>
        </div>
    )
};

export default Main;
