import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

const Report = ({ ReportOpen, title, seriesInstanceUID, diagnosticReportUrl }) => {
    const [changeToJson, setChangeToJson] = useState(false);
    const [jsonContent, setJsonContent] = useState(null);

    const handleReportChangeToJson = () => {
        setChangeToJson(!changeToJson);
    };

    useEffect(() => {
        const fetchJsonData = async () => {
            try {
                const response = await fetch("ImagingStudy.json");
                const data = await response.json();
                setJsonContent(data);
            } catch (error) {
                console.error("Error fetching JSON data:", error);
            }
        };

        fetchJsonData();
    }, []);

    const handleDownloadJson = (data) => {
        const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(jsonBlob);
        downloadLink.download = "reportData.json";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="w-1/2 border-2 border-gray-400 ">
            <div className="bg-green-300 p-2  flex justify-between items-center">
                <p className="font-bold text-md">Report</p>
                <div className="flex gap-2">
                    <button
                        className=" text-gray-700 underline font-semibold rounded-md px-2 py-1 text-xs"
                        onClick={handleReportChangeToJson}
                    >
                        {changeToJson ? "Report" : "Raw Data"}
                    </button>
                    {changeToJson && (
                        <button
                            className=" text-gray-700 underline font-semibold rounded-md px-2 py-1 text-xs flex items-center"
                            onClick={() => handleDownloadJson(jsonContent)}
                        >
                            <Icon icon="material-symbols:download-sharp" className="mr-1"/> Download JSON
                        </button>
                    )}
                    <button
                        className="bg-gray-400 hover:bg-gray-600 text-white font-semibold rounded-md px-2 py-1 text-xs"
                        onClick={ReportOpen}
                    >
                        {'<<'}
                    </button>
                </div>

            </div>
            <div className="h-full w-full  rounded-b-2xl flex flex-col">
                <div className="p-2 m-2 overflow-y-auto scrollbar-thin-report">
                    {!changeToJson ? (
                        <p className="mx-3 text-sm mt-2">
                            Age: 68 Sex: M<br/><br/>
                            PATHOLOGIC DIAGNOSIS:<br/>
                            Liver, needle biopsy: Fatty metamorphosis.<br/><br/>
                            GROSS FINDING:<br/>
                            The specimen is a liver tissue fragment measuring 1.1 x 0.1 x 0.1 cm. It is gray and
                            soft.<br/><br/>
                            All for section, one cassette.<br/><br/>
                            MICROSCOPIC FINDING:<br/>
                            Section shows localized macrovesicular fatty change of liver with an increase of vascularity
                            and a few inflammatory cell infiltration. The portal area and parenchyma show mild and
                            non-specific changes. There is no evidence of apparent malignancy. Both immunostaining for
                            glypican-3 and AFP are negative.<br/><br/>
                            *T56000, 1, M50080<br/><br/>
                            Pathologists: 周楠華醫師 病解專醫字第97號
                        </p>
                    ) : (
                        <pre
                            className="text-xs mt-2 whitespace-pre-wrap overflow-auto">{jsonContent ? JSON.stringify(jsonContent, null, 2) : "Loading..."}</pre>

                    )}
                </div>
            </div>
        </div>
    );
};

export {Report};
