import React, {useContext} from 'react'
import {ServerContext} from "../../lib/ServerContext.jsx";
import {CombineSearchURL} from "../../lib/search/index.js";

const SearchForm = ({
                        name,
                        setSearchResults,
                        Parameter,
                        pageLimit,
                        pageOffset,
                        setIsMouseOn,
                        setIsLoading,
                        location,
                        setIsSearch
                    }) => {
    const [parameter, setParameter] = Parameter;
    const [server, setServer] = useContext(ServerContext)


    const handleQueryParameterChange = (e,name) => {
        const value = e.target.value
        setParameter({...parameter, [name]: value})
    }


    const searchBtnOnClick = async (e) => {
        e.preventDefault()
        setIsLoading(true);
        const searchUrl = CombineSearchURL(parameter, server, pageLimit, pageOffset);
        fetch(searchUrl)
            .then(response => {
                if (response.status === 204) {
                    return []
                } else if (response.status === 302) {
                    return []
                } else {
                    return response.json()
                }
            })
            .then(data => {
                setSearchResults(data);
                setIsLoading(false)
            })
        setIsMouseOn(false)
        setIsSearch(false)
    }

    return (
        name !== "Search" ? (
            <form onSubmit={(e) => searchBtnOnClick(e)} className="flex flex-fill flex-column">
                <div className="flex w-full">
                    <div
                        className={`flex items-center me-2  ${location === "SearchPageHeader" ? " font-bold" : "text-green-500 font-medium"}`}>{name}</div>
                    {name === "StudyDate" ? (
                        <>
                            <input
                                type="date"
                                className={`border-2  p-2 rounded-lg text-black w-full ${location === "SearchPageHeader" ? "m-2" : "m-1"}`}
                                name={name} value={parameter[name]}
                                onChange={(e) => {
                                    handleQueryParameterChange(e, 'StudyDateStart')
                                }}
                            />
                            <span className="mx-2">~</span>
                            <input
                                type="date"
                                className={`border-2  p-2 rounded-lg text-black w-full ${location === "SearchPageHeader" ? "m-2" : "m-1"}`}
                                name={name} value={parameter[name]}
                                onChange={(e) => {
                                    handleQueryParameterChange(e, 'StudyDateEnd')
                                }}
                            />
                        </>
                    ) : (
                        <input
                            type="text"
                            className={`border-2  p-2 rounded-lg text-black w-full ${location === "SearchPageHeader" ? "m-2" : "m-1"}`}
                            name={name} value={parameter[name]}
                            onChange={(e) => {
                                handleQueryParameterChange(e,name)
                            }}
                        />
                    )}
                </div>
                {location === "SearchPageHeader" && (
                    name === "PatientID" && (
                        <button type="submit" className="border-2 m-2 rounded-lg px-2"
                                onClick={searchBtnOnClick}>Search</button>
                    ))
                }
            </form>
        ) : (
            <button type="submit" className="border-2 m-2 rounded-lg p-3 bg-green-500 text-white"
                    onClick={searchBtnOnClick}>Search</button>
        )
    )
}

export default SearchForm