import express from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import servers from '../src/config/DICOMWebServer.config.js';
import oauth from '../src/config/oauthConfig.js';
import settings from '../config/upload.js';

const fail = (message, status = 400) => Object.assign(new Error(message), {status});

export async function resolveUploadPath(root, input = '') {
    if (typeof input !== 'string') throw fail('Invalid path format');
    const base = await fsp.realpath(root);
    const target = await fsp.realpath(path.resolve(base, input));
    const relative = path.relative(base, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw fail('The path must remain inside the allowed upload folder', 403);
    }
    return target;
}

export async function storeDicom(filename, url, authorization, options = settings) {
    const handle = await fsp.open(filename, 'r');
    try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > options.maxFileBytes) throw fail('Invalid file or file exceeds the size limit', 413);
        const header = Buffer.alloc(132);
        await handle.read(header, 0, 132, 0);
        if (header.toString('ascii', 128, 132) !== 'DICM') throw fail('Only DICOM Part 10 files with a DICM marker are accepted');
        const boundary = `dicom-${randomUUID()}`;
        const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/dicom\r\n\r\n`);
        const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = async function* () {
            yield prefix;
            yield* handle.createReadStream({start: 0, autoClose: false});
            yield suffix;
        };
        const response = await fetch(url, {
            method: 'POST', redirect: 'error', duplex: 'half',
            signal: AbortSignal.timeout(options.timeoutMs),
            headers: {
                'Content-Type': `multipart/related; type="application/dicom"; boundary=${boundary}`,
                'Content-Length': String(prefix.length + stat.size + suffix.length),
                Accept: 'application/dicom+json',
                ...(authorization ? {Authorization: authorization} : {}),
            },
            body: Readable.from(body()),
        });
        const text = await response.text();
        if (!response.ok) return {status: 'failed', message: `PACS rejected the upload (HTTP ${response.status})`, httpStatus: response.status};
        let data;
        try { data = JSON.parse(text); } catch { /* Non-JSON replies need manual verification. */ }
        const items = Array.isArray(data) ? data : [data];
        if (items.some(item => item?.['00081198']?.Value?.length)) {
            return {status: 'failed', message: 'PACS returned a Failed SOP Sequence. The file was not stored successfully.', httpStatus: response.status};
        }
        const warning = response.status !== 200 || !items.some(item => item?.['00081199']?.Value?.length) || items.some(item =>
            item?.['00081199']?.Value?.some(instance => instance?.['00081196']));
        return {status: warning ? 'warning' : 'success', message: warning ? 'PACS returned a warning or unconfirmed result. Verify storage in PACS.' : 'PACS confirmed storage', httpStatus: response.status};
    } finally { await handle.close(); }
}

export function createUploadRouter({serverConfig = servers, authConfig = oauth, config = settings} = {}) {
    const router = express.Router();
    router.use(async (req, res, next) => {
        try {
            // Block cross-origin browser requests to local filesystem/upload endpoints.
            if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw fail('Cross-origin uploads are not allowed', 403);
            if (authConfig.enabled) {
                const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
                if (!token) throw fail('Please sign in first', 401);
                const response = await fetch(`${authConfig.keycloak_url.replace(/\/$/, '')}/protocol/openid-connect/token/introspect`, {
                    method: 'POST', signal: AbortSignal.timeout(10000),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams({token, client_id: authConfig.client_id, client_secret: authConfig.client_secret || ''}),
                });
                if (!response.ok || !(await response.json()).active) throw fail('Your session has expired', 401);
            }
            next();
        } catch (error) { next(error); }
    });
    router.get('/config', (req, res) => res.json({root: config.root, maxFileBytes: config.maxFileBytes, maxFiles: config.maxFiles}));
    router.post('/scan', express.json(), async (req, res, next) => {
        try {
            const root = await fsp.realpath(config.root);
            const target = await resolveUploadPath(root, req.body.path);
            const files = [];
            let visited = 0;
            const walk = async (location) => {
                if (++visited > config.maxFiles * 10) throw fail('Too many entries. Choose a smaller subfolder.');
                const stat = await fsp.lstat(location);
                if (stat.isSymbolicLink()) return;
                if (stat.isDirectory()) {
                    for (const entry of await fsp.readdir(location)) await walk(path.join(location, entry));
                } else if (stat.isFile() && (!path.extname(location) || /\.dcm$/i.test(location))) {
                    if (files.length >= config.maxFiles) throw fail(`Select no more than ${config.maxFiles} files at a time`);
                    files.push({name: path.basename(location), path: path.relative(root, location), size: stat.size});
                }
            };
            await walk(target);
            res.json({files});
        } catch (error) { next(error); }
    });
    router.post('/file', async (req, res, next) => {
        let temporary;
        try {
            const server = Object.hasOwn(serverConfig, req.query.server) && serverConfig[req.query.server];
            if (!server) throw fail('Select a valid PACS');
            const c = server.STOW || server.QIDO;
            const url = `${c.enableHTTPS ? 'https' : 'http'}://${c.hostname}${c.port ? ':' + c.port : ''}${c.pathname.replace(/\/$/, '')}/studies`;
            let filename;
            if (req.is('application/json')) {
                filename = await resolveUploadPath(config.root, req.body.path);
            } else if (req.is('application/dicom')) {
                if (Number(req.headers['content-length']) > config.maxFileBytes) throw fail('File exceeds the size limit', 413);
                temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'mainecoon-upload-'));
                filename = path.join(temporary, 'instance.dcm');
                let bytes = 0;
                const limit = new Transform({transform(chunk, encoding, callback) {
                    bytes += chunk.length;
                    callback(bytes > config.maxFileBytes ? fail('File exceeds the size limit', 413) : null, chunk);
                }});
                await pipeline(req, limit, fs.createWriteStream(filename));
            } else throw fail('Unsupported upload format', 415);
            const authorization = authConfig.enabled ? req.headers.authorization : c.Token;
            res.json(await storeDicom(filename, url, authorization, config));
        } catch (error) { next(error); }
        finally { if (temporary) await fsp.rm(temporary, {recursive: true, force: true}); }
    });
    router.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const message = error.status ? error.message : error.code === 'ENOENT' ? 'Path not found. Check the folder and Docker mount.' : 'Unable to complete the upload. Check PACS for stored data before retrying after a connection error.';
        res.status(error.status || 502).json({status: 'failed', message});
    });
    return router;
}
export default createUploadRouter();
