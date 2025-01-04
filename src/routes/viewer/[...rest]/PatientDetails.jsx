import LoadingSpin from "./LoadingSpin.jsx";

const PatientDetails = ({label, detail, style}) => {
    const Info = {
        Patient_ID: detail.patientID,
        Name: detail.patientName,
        Gender: detail.patientSex,
        Birthdate: detail.patientBirthDate,
        AccessionNumber: detail.accessionNumber,
        Study_ID: detail.accessionNumber,
        Study_Date: detail.studyDate + ' _ ' + detail.studyTime,
    }

    const DetailLine = ({label, value}) => (
        <span className="block ml-2 text-md mb-1 font-medium">{label} : {value}</span>
    );

    const isObjectComplete = (obj) => {
        return Object.values(obj).every(value => value !== undefined && value !== null && value !== '' && value !== 'loading');
    };

    return (
        <div
            className={`${style === "ViewerHeader" ? 'absolute w-72 border-2 text-start bg-white p-4 border-gray-600 shadow-md rounded-lg top-4 left-0 z-50'
                : 'bg-white text-start text-black py-2 '}`}>
            {!isObjectComplete(Info) ? <LoadingSpin/> :
                <div className="m-1">
                    {Object.entries(Info).map(([key, value]) => (
                        <DetailLine key={key} label={key} value={value}/>
                    ))}
                </div>
            }
        </div>
    );
}

export default PatientDetails;