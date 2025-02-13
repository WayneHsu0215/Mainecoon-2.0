import {useContext, useEffect, useRef, useState} from 'react';
import {Icon} from "@iconify/react";
import {combineUrl, fetchPatientDetails} from "../../lib/search/index.js";
import {ServerContext} from "../../lib/ServerContext.jsx";
import {Link} from "react-router-dom";
import {getAccessToken} from "../../token.js";

function Thumbnail({seriesUid, studyUid, server}) {
    const [thumbnailUrl, setThumbnailUrl] = useState('');

    useEffect(() => {
        async function fetchThumbnail() {
            try {
                const oauthToken = await getAccessToken();
                const res = await fetch(`${combineUrl(server)}/studies/${studyUid}/series/${seriesUid}/thumbnail`, {
                    method: 'GET', headers: {
                        Accept: 'image/jpeg', Authorization: `Bearer ${oauthToken}`,
                    },
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch thumbnail');
                }

                const data = window.URL.createObjectURL(await res.blob());
                setThumbnailUrl(data);
            } catch (error) {
                console.error('Error fetching thumbnail:', error);
            }
        }

        if (seriesUid && studyUid && server) {
            const delayThumbnailLoad = setTimeout(() => {
                fetchThumbnail();
            }, 500); // 延迟2秒加载

            return () => clearTimeout(delayThumbnailLoad);
        }
    }, [seriesUid, studyUid, server]);

    return (<img
        src={thumbnailUrl}
        alt="Thumbnail"
        className="break-all border bg-white w-full text-xs h-[100px] object-cover"
    />);
}


const SearchResult = ({Result, locate, moreInfo}) => {
    const [previewImage, setPreviewImage] = useState([]);
    const patientDetails = fetchPatientDetails(Result);
    const studyInstanceUID = patientDetails.studyInstanceUID;
    const [seriesUID, setSeriesUID] = useState('');
    const [server, setServer] = useContext(ServerContext);
    const [currentStudyUid, setCurrentStudyUid] = useState('');
    const [currentSeriesUid, setCurrentSeriesUid] = useState('');
    const [oauthToken, setOauthToken] = useState('');
    const genderData = {
        F: {bgColor: "bg-pink-500", icon: "ph:gender-female-bold", label: "Female",},
        M: {bgColor: "bg-blue-600", icon: "tdesign:gender-male", label: "Male",},
        default: {bgColor: "bg-green-600/80", icon: "ion:male-female", label: "Other"},
    }
    const gender = genderData[patientDetails.patientSex] || genderData.default;
    const [showExtra, setShowExtra] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const studyUid = queryParams.get('studyUid');
        const seriesUid = queryParams.get('seriesUid');
        if (studyUid) localStorage.setItem('studyUid', studyUid);
        if(!seriesUid) localStorage.removeItem('seriesUid')
        else localStorage.setItem('seriesUid', seriesUid);
        setCurrentStudyUid(studyUid);
        setCurrentSeriesUid(seriesUid);
    }, []);

    function OnClick() {
        location.href = `../viewer?server=${server}&studyUid=${studyInstanceUID}`
    }

    // Get keycloak access token
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const token = await getAccessToken();
                setOauthToken(token);
            } catch (error) {
                console.error('Failed to get access token:', error);
            }
        };
        fetchToken();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let seriesUid = [];

                // 判斷是否有 oauthToken
                const headers = {
                    'Content-Type': 'application/json',
                };

                // 如果有 oauthToken，則加入 Authorization 頭
                if (oauthToken) {
                    headers['Authorization'] = `Bearer ${oauthToken}`;
                }

                // 執行請求
                const result = await fetch(`${combineUrl(server)}/studies/${studyInstanceUID}/series`, {
                    method: 'GET', headers,
                });

                // 檢查請求是否成功
                if (!result.ok) {
                    throw new Error('Failed to fetch series data');
                }

                const metadatas = await result.json();

                setPreviewImage(metadatas?.map((metadata) => {
                    const Attribute = metadata?.["00080060"]?.Value;
                    if (Attribute && Attribute.length > 0) {
                        if (Attribute[0] === "SM") {
                            seriesUid.push(metadata['0020000E'].Value?.[0]);
                            return metadata['0020000E'].Value?.[0];
                        }
                        return false;
                    }
                }).filter(Boolean));
                setSeriesUID(seriesUid[0]);
            } catch (error) {
                console.error('fetchMetadataFail:', error);
            }
        };
        fetchData();
    }, [server, studyInstanceUID]);

    const toggleExtra = () => {
        setShowExtra(!showExtra);
    };

    const showExtraImageOnClick = (image) => {
        location.href = `../viewer?server=${server}&studyUid=${studyInstanceUID}&seriesUid=${image}`;
    }

    const PreviewCard = ({onClick, patientDetails, seriesUID, studyInstanceUID, server}) => (<div
        onClick={onClick}
        className={`border border-gray-300 rounded-md m-1 p-2 shadow-sm bg-white transition-all duration-300
            hover:border-2 hover:border-green-500 hover:shadow-sm hover:shadow-green-500 hover:bg-green-100 
            ${currentStudyUid === studyInstanceUID ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500" : ""}`}

    >
        <div className="w-full items-center text-gray-600">
            <div className="w-full text-base justify-center">
                <span className="flex justify-center break-all font-medium text-gray-800">
                    {patientDetails.patientID}_{patientDetails.patientSex}
                </span>
                <div className="p-2 mx-4">
                    <Thumbnail seriesUid={seriesUID} studyUid={studyInstanceUID} server={server}/>
                </div>
                <span className="flex justify-center break-all font-medium text-gray-800">
                    {patientDetails.accessionNumber}_{patientDetails.studyDate}
                </span>
            </div>
        </div>
    </div>);

    const CompactCard = ({onClick, patientDetails}) => (<div
        onClick={onClick}
        className={`w-full flex flex-row py-3 border border-gray-300 rounded-md m-1 shadow-sm bg-white transition-all duration-300
            hover:border-2 hover:border-green-500 hover:shadow-sm hover:shadow-green-500 hover:bg-green-100 
            ${currentStudyUid === studyInstanceUID ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500" : ""}`}
    >
        <div className="w-full flex items-center text-gray-600">
            <div className="w-full text-base justify-center">
                <span className="flex justify-center break-all font-medium text-gray-800">
                    {patientDetails.patientID}
                </span>
            </div>
        </div>
    </div>);


    const parentRef = useRef(null);
    const [position, setPosition] = useState({top: 0, left: 0});

    // 即時更新位置的 effect
    useEffect(() => {
        const updatePosition = () => {
            if (parentRef.current) {
                // 立即取得母組件的位置
                const rect = parentRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.top, left: rect.left + rect.width, // 設置為母組件的右邊，並考慮滾動
                    height: rect.height,
                });
            }
        };

        const interval = setInterval(updatePosition, 16); // 約 60fps 更新位置
        return () => clearInterval(interval); // 清除定時器
    }, []); // 只需要在組件掛載時啟動一次


    return (<>
        {locate === 'search' ? (
            <tr className="m-2 hover:bg-gray-100 cursor-pointer group max-h-2" key={patientDetails.patientID}
                onClick={OnClick}>
                <td className="border-2 border-l-0 group-first:border-t-0 p-2.5 group-last:border-b-0">{patientDetails.patientID}</td>
                <td className="border-2 group-first:border-t-0 p-2.5 group-last:border-b-0">{patientDetails.patientName}</td>
                <td className="border-2 w-1/12 p-2.5 text-center group-first:border-t-0 group-last:border-b-0">{patientDetails.patientBirthDate}</td>
                <td className="border-2 w-10 p-2.5 text-center group-first:border-t-0 group-last:border-b-0">
                    <div className="flex items-center justify-center">
                        <div
                            className={`rounded-md ${gender.bgColor} w-16 py-1 px-2  mx-auto flex items-center justify-center font-bold `}>
                            {/*<Icon icon={gender.icon} width="24" height="24" className="text-white"/>*/}
                            <span className="mx-2 text-white">{gender.label}</span>
                        </div>
                    </div>
                </td>
                <td className="border-2 p-2.5 group-first:border-t-0 group-last:border-b-0">{patientDetails.accessionNumber}</td>
                <td className="border-2 w-1/12 p-2.5 text-center group-first:border-t-0 group-last:border-b-0">{patientDetails.studyDate}</td>
                <td className="border-2 w-1/12 p-2.5 text-center border-r-0 group-first:border-t-0 group-last:border-b-0">
                    <div className="flex flex-wrap w-72">
                        {previewImage?.map((seriesUid) => (
                            <Link key={seriesUid}
                                  className="mr-2"
                                  onClick={(e) => {
                                      e.stopPropagation()
                                      location.href = `../viewer?server=${server}&studyUid=${studyInstanceUID}&seriesUid=${seriesUid}`
                                  }}
                            >
                                <Thumbnail seriesUid={seriesUid} studyUid={studyInstanceUID} server={server}/>
                            </Link>
                        ))}
                    </div>
                </td>
            </tr>
        ) : (
            locate === 'viewer' && (
                <>
                    <div className="w-full relative">
                        {previewImage?.length > 1 ? (
                            moreInfo ? (<>
                                <div className="w-full" ref={parentRef}>
                                    <div className="flex flex-row">
                                        <div className="w-full">
                                            <PreviewCard
                                                patientDetails={patientDetails}
                                                seriesUID={seriesUID}
                                                studyInstanceUID={studyInstanceUID}
                                                server={server}
                                            />
                                        </div>
                                        <button
                                            onClick={toggleExtra}
                                            className={`p-1.5 my-1 text-white ${showExtra ? "bg-red-300" : "bg-green-300"}`}
                                        >
                                      <span
                                          style={{
                                              display: "inline-block",
                                              transform: showExtra ? "rotate(90deg)" : "rotate(0deg)",
                                              transition: "transform 0.3s ease", // 平滑过渡效果
                                          }}
                                      >
                                        {showExtra ? "x" : ">"}
                                      </span>
                                        </button>

                                    </div>
                                </div>

                            </>) : (
                                <>
                                    <div className="flex" ref={parentRef}>
                                        <CompactCard onClick={OnClick} patientDetails={patientDetails}/>
                                        <button onClick={toggleExtra}
                                                className={`p-1.5 my-1 text-white rounded ${showExtra ? "bg-red-300" : "bg-green-300"}`}
                                        ><span
                                            style={{
                                                display: "inline-block",
                                                transform: showExtra ? "rotate(90deg)" : "rotate(0deg)",
                                                transition: "transform 0.3s ease", // 平滑过渡效果
                                            }}
                                        >
                                        {showExtra ? "x" : ">"}
                                      </span></button>
                                    </div>
                                </>

                            )) : (
                            previewImage.map((seriesUid) => (
                                moreInfo ? (
                                    <div key={seriesUid} className="w-full">
                                        <PreviewCard
                                            onClick={OnClick}
                                            patientDetails={patientDetails}
                                            seriesUID={seriesUid}
                                            studyInstanceUID={studyInstanceUID}
                                            server={server}
                                        />
                                    </div>) : (
                                    <CompactCard key={seriesUid} onClick={OnClick} patientDetails={patientDetails}/>
                                ))))}
                    </div>
                    {showExtra &&
                        (
                            moreInfo ? (
                                <div className="w-auto absolute bg-white shadow-lg z-50 rounded-md ml-1.5  "
                                     style={{top: position.top - 60, left: position.left}}>
                                    <div className="flex border border-gray-200 rounded-md shadow-md py-1 px-1">
                                        {previewImage.map((image, index) => (
                                            <div
                                                key={index}
                                                className="mx-1 my-1"
                                                onClick={() => showExtraImageOnClick(image)}
                                            >
                                                <div
                                                    className={`border border-gray-300 rounded-md m-1 p-2 shadow-sm bg-white transition-all duration-300
                                                hover:border-2 hover:border-green-500 hover:shadow-sm hover:shadow-green-500 hover:bg-green-100
                                                ${currentSeriesUid === null ? currentStudyUid === studyInstanceUID ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500"
                                                        : "bg-blue-600" : currentSeriesUid === image ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500" : ""}`}
                                                >
                                                    <div className="w-full items-center text-gray-600">
                                                        <div className="w-full text-base justify-center">
                                                        <span
                                                            className="flex justify-center break-all font-medium text-gray-800">

                                                            {patientDetails.patientID}_{patientDetails.patientSex}_{index + 1}
                                                        </span>
                                                            <div className="p-2 mx-4">
                                                                <Thumbnail seriesUid={image} studyUid={studyInstanceUID}
                                                                           server={server}/>
                                                            </div>
                                                            <span
                                                                className="flex justify-center break-all font-medium text-gray-800">
                                                            {patientDetails.accessionNumber}_{patientDetails.studyDate}
                                                        </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>))}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-auto absolute bg-white z-50 rounded-md ml-3 "
                                     style={{top: position.top - 58, left: position.left}}>
                                    <div className="flex flex-col border rounded-md shadow-lg border-gray-300 py-1">
                                        {previewImage.map((image, index) => (
                                            <div
                                                key={index}
                                                className="mx-2 my-1"
                                                onClick={() => showExtraImageOnClick(image)}
                                            >
                                                <div
                                                    className={`w-full flex flex-row border border-gray-300 rounded-md shadow-sm bg-white transition-all duration-300
                                                hover:border-2 hover:border-green-500 hover:shadow-sm hover:shadow-green-500 hover:bg-green-100
                                                ${currentSeriesUid === null ? currentStudyUid === studyInstanceUID ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500"
                                                        : "bg-blue-600" : currentSeriesUid === image ? "bg-green-100 shadow-green-500 shadow-sm border-2 border-green-500" : ""}`}
                                                >
                                                    <div className="w-32 flex items-center text-gray-600 p-3 ">
                                                        <div className="w-full text-base justify-center">
                                                    <span className="flex justify-center font-medium text-gray-800">
                                                        {patientDetails.patientID}_Slide{index + 1}
                                                    </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                </>)
        )}</>)
}

export default SearchResult;
