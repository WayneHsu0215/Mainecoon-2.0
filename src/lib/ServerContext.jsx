import React, { createContext, useState } from 'react';
import dicomWebServerConfig from "../config/DICOMWebServer.config.js";

export const ServerContext = createContext();

const publicServers = dicomWebServerConfig
const key = Object.keys(publicServers)

const getInitialServer = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('server') || key[0];
};

export const ServerProvider = ({ children }) => {
    const [server, setServer] = useState(getInitialServer);
    return (
        <ServerContext.Provider value={[server,setServer]}>
            {children}
        </ServerContext.Provider>
    );
};
