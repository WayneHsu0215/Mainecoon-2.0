// Shared allowlist for browser requests and the read-only server proxy.
export function resolveDicomTarget(input, servers) {
    let target;
    try { target = new URL(input); } catch { return null; }
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.hash) return null;
    for (const server of Object.values(servers)) {
        for (const config of [server.QIDO, server.WADO]) {
            if (!config) continue;
            const base = new URL(`${config.enableHTTPS ? 'https' : 'http'}://${config.hostname}${config.port ? ':' + config.port : ''}`);
            const paths = [config.pathname, config.RS_pathname, config.URI_pathname].filter(Boolean);
            const upgrade = base.protocol === 'https:' && target.protocol === 'http:' && target.hostname === base.hostname && target.port === base.port;
            if (target.origin !== base.origin && !upgrade) continue;
            let pathname;
            try { pathname = decodeURIComponent(target.pathname); } catch { return null; }
            if (pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part === '.')) return null;
            if (!paths.some(path => {
                const root = path.replace(/\/$/, '');
                return target.pathname === root || target.pathname.startsWith(root + '/');
            })) continue;
            target.protocol = base.protocol;
            return {url: target.href, token: config.Token};
        }
    }
    return null;
}

export function dicomProxyUrl(input, servers) {
    const target = resolveDicomTarget(input, servers);
    return target ? `/api/dicomweb?url=${encodeURIComponent(target.url)}` : input;
}
