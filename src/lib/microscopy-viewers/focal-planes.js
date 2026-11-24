export function getFocalPlaneMetadata(metadata) {
    const z = metadata['00480008']?.Value?.[0]?.['0040074A']?.Value?.[0];
    return {focalPlaneZ: z == null || z === '' ? null : Number(z)};
}

// This layout stores one complete focal plane per instance at each resolution.
export function groupFocalPlanes(images) {
    const volume = images.filter(image => image.imageType?.includes('VOLUME'));
    const candidates = volume.length ? volume : images;
    const groups = new Map();
    for (const image of candidates) {
        const z = Number.isFinite(image.focalPlaneZ) ? image.focalPlaneZ : null;
        const key = z === null ? 'default' : String(z);
        if (!groups.has(key)) groups.set(key, {key, z, images: []});
        groups.get(key).images.push(image);
    }
    const planes = [...groups.values()].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    for (const plane of planes) {
        plane.images.sort((a, b) => a.totalPixelMatrixColumns - b.totalPixelMatrixColumns);
        const widths = plane.images.map(image => image.totalPixelMatrixColumns);
        if (new Set(widths).size !== widths.length) {
            throw new Error('This slide has multiple instances at the same resolution and focal plane. This layout is not supported yet.');
        }
    }
    return planes;
}

export function defaultFocalPlaneIndex(planes) {
    return Math.floor(planes.length / 2);
}
