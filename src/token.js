import Cookies from 'js-cookie';
import config from './config/oauthConfig.js';

export async function getAccessToken() {
    // Check before reading cookies or contacting Keycloak.
    if (!config.enabled) return undefined;

    const { keycloak_url, client_id, client_secret, redirect_uri } = config;
    const endpoint = `${keycloak_url.replace(/\/$/, '')}/protocol/openid-connect`;
    const client = { client_id, ...(client_secret ? { client_secret } : {}) };
    const post = async (url, params) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
        });
        if (!response.ok) throw new Error('Keycloak request failed');
        return response.json();
    };

    const oauthToken = Cookies.get('access_token');
    if (oauthToken) {
        const data = await post(`${endpoint}/token/introspect`, { ...client, token: oauthToken });
        if (data.active) return oauthToken;
        Cookies.remove('access_token');
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const authorizationCode = hashParams.get('code') || queryParams.get('code');
    const error = hashParams.get('error') || queryParams.get('error');
    if (error) throw new Error(`Keycloak authorization failed: ${error}`);

    if (authorizationCode) {
        const data = await post(`${endpoint}/token`, {
            ...client,
            grant_type: 'authorization_code',
            code: authorizationCode,
            redirect_uri,
        });
        if (!data.access_token) throw new Error('Keycloak returned no access token');
        Cookies.set('access_token', data.access_token);
        for (const key of ['code', 'state', 'session_state', 'iss']) {
            queryParams.delete(key);
            hashParams.delete(key);
        }
        const query = queryParams.toString();
        const hash = hashParams.toString();
        window.history.replaceState({}, document.title,
            `${window.location.pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`);
        return data.access_token;
    }

    const params = new URLSearchParams({
        client_id, redirect_uri, response_mode: 'fragment', response_type: 'code', scope: 'openid',
    });
    window.location.href = `${endpoint}/auth?${params}`;
    return undefined;
}
