import express from 'express';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import servers from '../src/config/DICOMWebServer.config.js';
import {resolveDicomTarget} from '../src/lib/dicom-webs/proxy.js';

export function createDicomWebRouter({serverConfig = servers, fetcher = fetch} = {}) {
    const router = express.Router();
    router.get('/', async (req, res) => {
        try {
            if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
                return res.status(403).json({error: 'Cross-origin proxy requests are not allowed'});
            }
            const target = typeof req.query.url === 'string' && resolveDicomTarget(req.query.url, serverConfig);
            if (!target) return res.status(400).json({error: 'URL is not a configured DICOMweb endpoint'});
            const headers = {};
            for (const name of ['accept', 'range', 'authorization']) {
                if (req.headers[name]) headers[name] = req.headers[name];
            }
            if (target.token) headers.authorization = target.token;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 60000);
            const disconnect = () => { if (!res.writableEnded) controller.abort(); };
            res.on('close', disconnect);
            try {
                const upstream = await fetcher(target.url, {
                    method: 'GET', headers, redirect: 'error', signal: controller.signal,
                });
                res.status(upstream.status);
                res.setHeader('Cache-Control', 'no-store');
                for (const name of ['content-type', 'content-range', 'accept-ranges']) {
                    const value = upstream.headers.get(name);
                    if (value) res.setHeader(name, value);
                }
                if (upstream.body) await pipeline(Readable.fromWeb(upstream.body), res);
                else res.end();
            } finally {
                clearTimeout(timer);
                res.off('close', disconnect);
            }
        } catch {
            if (!res.headersSent) res.status(502).json({error: 'Unable to read from the configured PACS'});
            else res.destroy();
        }
    });
    return router;
}

export default createDicomWebRouter();
