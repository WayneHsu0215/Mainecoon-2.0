// Read-only diagnostic for the reported Z-stack study.
import TileGrid from 'ol/tilegrid/TileGrid.js';
import assert from 'node:assert/strict';
import {groupFocalPlanes, getFocalPlaneMetadata, defaultFocalPlaneIndex} from '../src/lib/microscopy-viewers/focal-planes.js';
const base = 'https://raccoon.dicom.org.tw/dicom-web';
const study = '1.2.246.606.1.2.8323328.796.1785744076.35243';
const response = await fetch(`${base}/studies/${study}/metadata`);
if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
const metadata = await response.json();
const value = (item, tag) => item[tag]?.Value?.[0];
const images = metadata.filter(item => value(item, '00080060') === 'SM' &&
    !item['00080008'].Value.some(type => ['LABEL', 'OVERVIEW'].includes(type)))
    .sort((a, b) => value(a, '00480006') * value(a, '00480007') - value(b, '00480006') * value(b, '00480007'));
const width = value(images.at(-1), '00480006');
const resolutions = images.map(item => Math.round(width / value(item, '00480006')));
console.log('Current viewer resolutions:', JSON.stringify(resolutions));
try {
    new TileGrid({resolutions, origin: [0, -1], tileSize: 512});
    console.log('TileGrid accepted');
} catch (error) { console.log('CONFIRMED TileGrid failure:', error.message); }
for (const item of images.filter(item => item['00080008'].Value.includes('VOLUME')).slice(0, 7)) {
    const origin = value(item, '00480008');
    console.log(JSON.stringify({width: value(item, '00480006'), z: origin?.['0040074A']?.Value,
        frames: value(item, '00280008'), concatenation: value(item, '00209161'), offset: value(item, '00209228')}));
}
const item = images.find(item => item['00080008'].Value.includes('VOLUME'));
const nColumns = Math.ceil(value(item, '00480006') / value(item, '00280011'));
const nRows = Math.ceil(value(item, '00480007') / value(item, '00280010'));
const frame = Math.floor(nColumns / 2) + Math.floor(nRows / 2) * nColumns + 1;
const tile = await fetch(`${base}/studies/${study}/series/${value(item, '0020000E')}/instances/${value(item, '00080018')}/frames/${frame}/rendered`);
const bytes = new Uint8Array(await tile.arrayBuffer());
console.log(JSON.stringify({tileStatus: tile.status, type: tile.headers.get('content-type'), bytes: bytes.length, jpeg: bytes[0] === 255 && bytes[1] === 216}));
const planes = groupFocalPlanes(images.map(item => ({
    ...getFocalPlaneMetadata(item), imageType: item['00080008'].Value,
    totalPixelMatrixColumns: value(item, '00480006'), metadata: item,
})));
assert.equal(planes.length, 7);
assert.equal(planes[defaultFocalPlaneIndex(planes)].z, 0);
for (const plane of planes) {
    new TileGrid({resolutions: plane.images.map(image => width / image.totalPixelMatrixColumns), origin: [0, 0]});
    for (const image of plane.images) {
        const item = image.metadata;
        const columns = Math.ceil(value(item, '00480006') / value(item, '00280011'));
        const rows = Math.ceil(value(item, '00480007') / value(item, '00280010'));
        const frame = Math.floor(columns / 2) + Math.floor(rows / 2) * columns + 1;
        const response = await fetch(`${base}/studies/${study}/series/${value(item, '0020000E')}/instances/${value(item, '00080018')}/frames/${frame}/rendered`);
        assert.equal(response.status, 200);
        const data = new Uint8Array(await response.arrayBuffer());
        assert.ok(data[0] === 255 && data[1] === 216);
    }
    console.log(`PASS Z=${plane.z}: valid pyramid and JPEG tiles at all 3 resolutions`);
}
