export function getAccessToken() {
    const xhr = new XMLHttpRequest();
    // 2024 MITW
    // xhr.open('POST', 'http://172.18.0.58:8080/realms/mitw/protocol/openid-connect/token', false); // false makes it synchronous
    // CYLAB
    xhr.open('POST', 'https://keycloak.dicom.tw/realms/raccoon/protocol/openid-connect/token', false); // false makes it synchronous
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    // 2024 MITW
    // const params = new URLSearchParams({
    //     'grant_type': 'client_credentials',
    //     'client_id': 'dcm4chee',
    //     'client_secret': 'v6uYKjl6UDXFhe7ebPBGwOILQ01GYRQg',
    //     'scope': 'openid'
    // }).toString();

    // CYLAB
    const params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': 'song-yi-raccoon',
        'client_secret': 'CKYMOZjlWkLvHe7vvQBHnHvcu6JGWYT4',
        'scope': 'openid'
    }).toString();

    xhr.send(params);

    if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        console.log(response.access_token);
        return response.access_token;
    } else {
        console.error('Failed to obtain access token');
        throw new Error('Failed to obtain access token');
    }
}
