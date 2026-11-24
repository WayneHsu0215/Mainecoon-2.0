import test from 'node:test';
import assert from 'node:assert/strict';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import {groupFocalPlanes, defaultFocalPlaneIndex, getFocalPlaneMetadata} from '../src/lib/microscopy-viewers/focal-planes.js';

test('seven-plane stack creates seven valid pyramids and selects central plane', () => {
    const images = [];
    for (const width of [122880, 30720, 7680]) {
        for (const z of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) {
            images.push({imageType: ['VOLUME'], totalPixelMatrixColumns: width, focalPlaneZ: z});
        }
    }
    images.push({imageType: ['THUMBNAIL'], totalPixelMatrixColumns: 960, focalPlaneZ: 0});
    const planes = groupFocalPlanes(images);
    assert.equal(planes.length, 7);
    assert.equal(planes[defaultFocalPlaneIndex(planes)].z, 0);
    for (const plane of planes) {
        const resolutions = plane.images.map(image => 122880 / image.totalPixelMatrixColumns);
        assert.deepEqual(resolutions, [16, 4, 1]);
        assert.doesNotThrow(() => new TileGrid({resolutions, origin: [0, 0]}));
    }
});

test('ordinary single-plane images work without Z metadata; ambiguous layouts are rejected', () => {
    const image = {imageType: ['VOLUME'], totalPixelMatrixColumns: 1024};
    assert.equal(groupFocalPlanes([image]).length, 1);
    assert.equal(defaultFocalPlaneIndex(groupFocalPlanes([image])), 0);
    assert.equal(getFocalPlaneMetadata({}).focalPlaneZ, null);
    assert.equal(getFocalPlaneMetadata({'00480008': {Value: [{'0040074A': {Value: ['-0.25']}}]}}).focalPlaneZ, -0.25);
    assert.throws(() => groupFocalPlanes([image, {...image}]), /not supported/);
});
