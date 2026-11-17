import {useContext, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {ServerContext} from '../../lib/ServerContext.jsx';
import servers from '../../config/DICOMWebServer.config.js';
import {getAccessToken} from '../../token.js';
import './upload.css';

const labels = {pending: 'Pending', uploading: 'Uploading', success: 'Success', warning: 'Needs review', failed: 'Failed'};
const sizeText = bytes => `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export default function UploadPage() {
    const [server, setServer] = useContext(ServerContext);
    const [mode, setMode] = useState('local');
    const [folder, setFolder] = useState('');
    const [config, setConfig] = useState(null);
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const stop = useRef(false);
    const mounted = useRef(true);
    const update = (id, patch) => { if (mounted.current) setRows(current => current.map(row => row.id === id ? {...row, ...patch} : row)); };

    async function request(url, options = {}) {
        const token = await getAccessToken();
        const response = await fetch(url, {...options, headers: {...options.headers, ...(token ? {Authorization: `Bearer ${token}`} : {})}});
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Request failed');
        return result;
    }
    useEffect(() => {
        mounted.current = true;
        request('/api/uploads/config').then(result => { if (mounted.current) setConfig(result); })
            .catch(e => { if (mounted.current) setError(e.message); });
        return () => { mounted.current = false; stop.current = true; };
    }, []);

    function selectFiles(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        setError('');
        if (files.length > config.maxFiles) { setError(`Select no more than ${config.maxFiles} files at a time`); return; }
        setRows(files.map((file, id) => ({id, file, name: file.webkitRelativePath || file.name, size: file.size,
            status: file.size > config.maxFileBytes ? 'failed' : 'pending',
            message: file.size > config.maxFileBytes ? 'File exceeds the size limit' : ''})));
    }
    async function scan() {
        setBusy(true); setError(''); setRows([]);
        try {
            const result = await request('/api/uploads/scan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: folder})});
            setRows(result.files.map((file, id) => ({...file, id, status: file.size > config.maxFileBytes ? 'failed' : 'pending', message: file.size > config.maxFileBytes ? 'File exceeds the size limit' : ''})));
            if (!result.files.length) setError('No .dcm files or files without an extension were found');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function upload() {
        setBusy(true); setError(''); stop.current = false;
        for (const row of rows.filter(item => item.status === 'pending')) {
            if (stop.current) break;
            update(row.id, {status: 'uploading', message: 'Sending to PACS and waiting for storage confirmation…'});
            try {
                const result = await request(`/api/uploads/file?server=${encodeURIComponent(server)}`, {
                    method: 'POST', headers: {'Content-Type': row.file ? 'application/dicom' : 'application/json'},
                    body: row.file || JSON.stringify({path: row.path}),
                });
                update(row.id, result);
            } catch (e) { update(row.id, {status: 'failed', message: e.message}); }
        }
        if (mounted.current) setBusy(false);
    }
    const done = rows.filter(row => ['success', 'failed', 'warning'].includes(row.status)).length;
    return <main className="upload-page" lang="en">
        <header className="upload-header"><Link to="/search">MAINECOON</Link><span>PACS Upload</span><Link to="/search">Back to search</Link></header>
        <div className="upload-content">
            <h1>Upload DICOM images</h1><p>Choose a source, review your files, and send them to your PACS.</p>
            <section className="upload-card">
                <label htmlFor="upload-pacs">Destination PACS</label>
                <select id="upload-pacs" value={server} disabled={busy} onChange={e => setServer(e.target.value)}>{Object.keys(servers).map(name => <option key={name}>{name}</option>)}</select>
                <div className="upload-tabs" role="group" aria-label="File source">
                    <button disabled={busy} aria-pressed={mode === 'local'} onClick={() => {setMode('local'); setRows([]); setError('');}}>Local files / folder</button>
                    <button disabled={busy} aria-pressed={mode === 'path'} onClick={() => {setMode('path'); setRows([]); setError('');}}>Server path</button>
                </div>
                {mode === 'local' ? <div className="upload-picker">
                    <p>Choose DICOM Part 10 files from this computer. Selecting a folder includes its subfolders.</p>
                    <label className="upload-file-control">Choose files<input className="sr-only" type="file" multiple disabled={busy || !config} onChange={selectFiles}/></label>
                    <label className="upload-file-control">Choose folder<input className="sr-only" type="file" multiple webkitdirectory="" disabled={busy || !config} onChange={selectFiles}/></label>
                </div> : <div className="upload-path">
                    <p>Allowed root: <code>{config?.root || 'Loading settings…'}</code></p>
                    <label htmlFor="upload-path">Folder or file path</label>
                    <input id="upload-path" value={folder} disabled={busy} onChange={e => setFolder(e.target.value)} placeholder="Leave blank for the root folder, or enter a subfolder path"/>
                    <p>This path is on the server. For Docker, use the mounted container path. Listing files does not upload them.</p>
                    <button disabled={busy || !config} onClick={scan}>List files</button>
                </div>}
                <p className="upload-hint">Maximum file size: {config ? sizeText(config.maxFileBytes) : '…'} · Up to {config?.maxFiles || '…'} files. Non-DICOM files are rejected.</p>
            </section>
            {error && <p className="upload-error" role="alert">{error}</p>}
            <section className="upload-card" aria-label="Upload queue">
                <div className="upload-summary"><h2>Files · {rows.length}</h2><span aria-live="polite">Processed {done} / {rows.length} · Success {rows.filter(r => r.status === 'success').length}</span></div>
                <progress value={done} max={rows.length || 1} aria-label="Files processed"/>
                <div className="upload-table"><table><thead><tr><th>File</th><th>Size</th><th>Status</th><th>Result</th></tr></thead><tbody>
                    {rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{sizeText(row.size)}</td><td><span className={`upload-state ${row.status}`}>{labels[row.status]}</span></td><td>{row.message || '—'}</td></tr>)}
                    {!rows.length && <tr><td colSpan="4">No files selected</td></tr>}
                </tbody></table></div>
                <div className="upload-actions"><button className="upload-primary" disabled={busy || !rows.some(r => r.status === 'pending')} onClick={upload}>Upload to {server}</button>
                    {busy && <button onClick={() => {stop.current = true; setError('Stopping after the current file finishes. Files already sent will not be deleted.');}}>Stop after current file</button>}
                    <button disabled={busy || !rows.length} onClick={() => setRows([])}>Clear queue</button></div>
                <p className="upload-hint">If a warning or connection error occurs, check the storage result in PACS before uploading the file again.</p>
            </section>
        </div>
    </main>;
}
