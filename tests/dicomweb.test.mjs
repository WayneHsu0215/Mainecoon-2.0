import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createDicomWebRouter} from '../controllers/dicomweb.js';
import {resolveDicomTarget, dicomProxyUrl} from '../src/lib/dicom-webs/proxy.js';

const serverConfig = {test: {QIDO: {enableHTTPS: true, hostname: 'pacs.test', pathname: '/dicom-web'}}};

test('upgrade configured HTTP BulkDataURI and reject unrelated destinations', () => {
    assert.equal(resolveDicomTarget('http://pacs.test/dicom-web/studies/1/bulkdata/2', serverConfig).url,
        'https://pacs.test/dicom-web/studies/1/bulkdata/2');
    for (const url of ['https://evil.test/dicom-web', 'https://pacs.test/admin', 'https://pacs.test/dicom-web-evil',
        'https://pacs.test:8080/dicom-web', 'https://user:pass@pacs.test/dicom-web', 'https://pacs.test/dicom-web/%2e%2e%2fadmin']) {
        assert.equal(resolveDicomTarget(url, serverConfig), null, url);
    }
    assert.equal(dicomProxyUrl('/api/uploads/config', serverConfig), '/api/uploads/config');
    assert.match(dicomProxyUrl('http://pacs.test/dicom-web/studies', serverConfig), /^\/api\/dicomweb\?url=https/);
});

test('proxy preserves multipart bytes, statuses and auth, and restricts requests', async t => {
    const bytes = Buffer.concat([Buffer.from('--test\r\nContent-Type: application/octet-stream\r\n\r\n'),
        Buffer.from([0, 255, 128, 1]), Buffer.from('\r\n--test--\r\n')]);
    const calls = [];
    const app = express();
    app.use('/api/dicomweb', createDicomWebRouter({serverConfig, fetcher: async (url, options) => {
        calls.push({url, options});
        if (url.endsWith('/missing')) return new Response('missing', {status: 404});
        if (url.endsWith('/failure')) throw new Error('connection failed');
        return new Response(bytes, {headers: {'Content-Type': 'multipart/related; boundary=test'}});
    }}));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const base = `http://127.0.0.1:${server.address().port}/api/dicomweb?url=`;
    const request = (url, options) => fetch(base + encodeURIComponent(url), options);
    const response = await request('http://pacs.test/dicom-web/bulkdata', {headers: {Authorization: 'Bearer test'}});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'multipart/related; boundary=test');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal(calls[0].url, 'https://pacs.test/dicom-web/bulkdata');
    assert.equal(calls[0].options.headers.authorization, 'Bearer test');
    assert.equal(calls[0].options.redirect, 'error');
    assert.equal((await request('https://pacs.test/dicom-web/missing')).status, 404);
    assert.equal((await request('https://pacs.test/dicom-web/failure')).status, 502);
    const count = calls.length;
    assert.equal((await request('http://127.0.0.1/private')).status, 400);
    assert.equal((await request('https://pacs.test/dicom-web', {headers: {Origin: 'https://evil.test'}})).status, 403);
    assert.equal((await request('https://pacs.test/dicom-web', {method: 'POST'})).status, 404);
    assert.equal(calls.length, count);
});
