// Explicit opt-in smoke check; reads metadata and one coordinate payload per PACS.
import assert from 'node:assert/strict';
import express from 'express';
import router from '../controllers/dicomweb.js';
import {multipartDecode} from '../src/lib/utils/multipart.js';

const app = express();
app.use('/api/dicomweb', router);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const local = `http://127.0.0.1:${server.address().port}/api/dicomweb?url=`;
const study = '1.2.276.0.7230010.3.1.4.805175452.9616.1725333041.357';
try {
    for (const [host, series] of [
        ['raccoon.dicom.org.tw', '2.16.886.111.100513.6826.20241013124251'],
        ['ditto-tmp.dicom.tw', '2.16.886.111.100513.6826.20250529101732'],
    ]) {
        const response = await fetch(local + encodeURIComponent(`https://${host}/dicom-web/studies/${study}/series/${series}/metadata`));
        assert.equal(response.status, 200, `${host}: metadata`);
        const metadata = await response.json();
        const group = metadata[0]['006A0002'].Value[0];
        const points = group['00660016'] || group['00660022'];
        assert.ok(points.BulkDataURI);
        const bulk = await fetch(local + encodeURIComponent(points.BulkDataURI));
        assert.equal(bulk.status, 200, `${host}: coordinates`);
        const parts = multipartDecode(await bulk.arrayBuffer());
        assert.ok(parts[0]?.byteLength > 0);
        console.log(`PASS ${host}: metadata + ${new URL(points.BulkDataURI).protocol} BulkDataURI via proxy; ${parts[0].byteLength} coordinate bytes`);
    }
} finally {
    server.closeAllConnections();
    server.close();
}
