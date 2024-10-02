export default {
    DITTO: {
        QIDO: {
            enableHTTPS: true,
            hostname: "ditto.dicom.tw",
            port: "",
            pathname: "/dicom-web",
            Token: null
        },
        WADO: {
            enableHTTPS: true,
            hostname: "ditto.dicom.tw",
            port: "",
            URI_pathname: "/dicom-web/wado",
            RS_pathname: "/dicom-web",
            Mode: "rs",
            Token: null
        }
    },
    PACS_MITW: {
        QIDO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10000",
            pathname: "/dcm4chee-arc/aets/DCM4CHEE/rs",
            Token: null
        },
        WADO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10000",
            URI_pathname: "/dcm4chee-arc/aets/DCM4CHEE/wado",
            RS_pathname: "/dcm4chee-arc/aets/DCM4CHEE/rs",
            Mode: "rs",
            Token: null
        }
    },
    RACCOON_MITW: {
        QIDO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10109",
            pathname: "/dicom-web",
            Token: null
        },
        WADO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10109",
            URI_pathname: "/dicom-web/wado",
            RS_pathname: "/dicom-web",
            Mode: "rs",
            Token: null
        }
    },
    EBM_MITW: {
        QIDO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10107",
            pathname: "/DICOMwebRS/DICOMwebRS.dll",
            Token: null
        },
        WADO: {
            enableHTTPS: false,
            hostname: "172.18.0.53",
            port: "10107",
            URI_pathname: "/DICOMwebRS/DICOMwebRS.dll",
            RS_pathname: "/DICOMwebRS/DICOMwebRS.dll",
            Mode: "rs",
            Token: null
        }
    },
    LOCAL_RACCOON_MITW: {
        QIDO: {
            enableHTTPS: false,
            hostname: "127.0.0.1",
            port: "8081",
            pathname: "/dicom-web",
            Token: null
        },
        WADO: {
            enableHTTPS: false,
            hostname: "127.0.0.1",
            port: "8081",
            URI_pathname: "/dicom-web/wado",
            RS_pathname: "/dicom-web",
            Mode: "rs",
            Token: null
        }
    },
}


