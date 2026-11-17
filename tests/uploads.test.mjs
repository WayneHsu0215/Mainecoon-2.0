import assert from 'node:assert/strict';
import {test} from 'node:test';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createUploadRouter, resolveUploadPath} from '../controllers/uploads.js';

test('Upload endpoints stream STOW to mock PACS and constrain filesystem access', async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mainecoon-test-'));
    const root = path.join(temporary, 'allowed');
    await fs.mkdir(root);
    const dicom = Buffer.concat([Buffer.alloc(128), Buffer.from('DICM'), Buffer.from('mock-payload')]);
    await fs.writeFile(path.join(root, 'sample.dcm'), dicom);
    await fs.writeFile(path.join(temporary, 'outside.dcm'), dicom);
    await fs.writeFile(path.join(root, 'invalid.dcm'), 'not dicom');
    const received = [];
    let status = 200;
    let reply = {'00081199': {vr: 'SQ', Value: [{'00081155': {vr: 'UI', Value: ['1.2.3']}}]}};
    const pacs = express();
    pacs.post('/dicom-web/studies', express.raw({type: () => true}), (req, res) => {
        received.push({headers: req.headers, body: req.body});
        res.status(status).json(reply);
    });
    const pacsServer = pacs.listen(0, '127.0.0.1');
    await new Promise(resolve => pacsServer.once('listening', resolve));
    const config = {root, maxFileBytes: 1024, maxFiles: 10, timeoutMs: 2000};
    const serverConfig = {TEST: {QIDO: {enableHTTPS: false, hostname: '127.0.0.1', port: pacsServer.address().port, pathname: '/dicom-web', Token: 'Bearer static-test'}}};
    const app = express();
    app.use(express.json());
    app.use('/api/uploads', createUploadRouter({serverConfig, authConfig: {enabled: false}, config}));
    app.use('/protected', createUploadRouter({serverConfig, authConfig: {enabled: true}, config}));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (route, data, type = 'application/json') => fetch(`${base}/api/uploads/${route}`, {method: 'POST', headers: {'Content-Type': type}, body: type === 'application/json' ? JSON.stringify(data) : data});
    try {
        assert.equal((await fetch(`${base}/protected/config`)).status, 401);
        assert.equal((await fetch(`${base}/api/uploads/config`, {headers: {Origin: 'https://untrusted.example'}})).status, 403);
        assert.equal((await post('scan', {path: '../outside.dcm'})).status, 403);
        assert.equal((await post('scan', {path: ''})).status, 200);
        assert.equal((await post('file?server=UNKNOWN', {path: 'sample.dcm'})).status, 400);
        assert.equal((await post('file?server=TEST', {path: '../outside.dcm'})).status, 403);
        assert.equal((await post('file?server=TEST', {path: 'invalid.dcm'})).status, 400);
        assert.equal(received.length, 0);
        const first = await post('file?server=TEST', {path: 'sample.dcm'});
        assert.equal((await first.json()).status, 'success');
        assert.match(received[0].headers['content-type'], /^multipart\/related; type="application\/dicom"/);
        assert.equal(received[0].headers.authorization, 'Bearer static-test');
        assert.ok(received[0].body.includes(dicom));
        assert.match(received[0].body.toString(), /Content-Type: application\/dicom\r\n\r\n/);
        assert.equal((await (await post('file?server=TEST', dicom, 'application/dicom')).json()).status, 'success');
        assert.equal((await post('file?server=TEST', Buffer.alloc(1025), 'application/dicom')).status, 413);
        status = 202;
        assert.equal((await (await post('file?server=TEST', {path: 'sample.dcm'})).json()).status, 'warning');
        reply = {'00081198': {Value: [{}]}};
        assert.equal((await (await post('file?server=TEST', {path: 'sample.dcm'})).json()).status, 'failed');
        status = 200; reply = {};
        assert.equal((await (await post('file?server=TEST', {path: 'sample.dcm'})).json()).status, 'warning');
        status = 409;
        assert.equal((await (await post('file?server=TEST', {path: 'sample.dcm'})).json()).status, 'failed');
        await assert.rejects(resolveUploadPath(root, '../outside.dcm'), {status: 403});
    } finally {
        server.closeAllConnections(); pacsServer.closeAllConnections();
        await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => pacsServer.close(resolve))]);
        await fs.rm(temporary, {recursive: true, force: true});
    }
});
