// Server-only settings. Paths entered in the UI must stay inside this directory.
export default {
    root: process.env.UPLOAD_ROOT || './uploads',
    maxFileBytes: 4 * 1024 ** 3,
    maxFiles: 1000,
    timeoutMs: 10 * 60 * 1000,
};
