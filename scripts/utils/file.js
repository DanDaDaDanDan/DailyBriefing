/**
 * file.js
 * Shared file and JSON operations with proper error handling.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and parse a JSON file.
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} [description] - Human-readable description for error messages
 * @returns {object} Parsed JSON data
 * @throws {Error} With descriptive message on failure
 */
function loadJSON(filePath, description) {
    const label = description || path.basename(filePath);
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`${label} not found: ${filePath}`);
        }
        if (err instanceof SyntaxError) {
            throw new Error(`${label} contains invalid JSON (${filePath}): ${err.message}`);
        }
        throw new Error(`Failed to load ${label} (${filePath}): ${err.message}`);
    }
}

/**
 * Write data as JSON to a file atomically (write to .tmp then rename).
 * @param {string} filePath - Absolute path to the target file
 * @param {object} data - Data to serialize
 * @param {string} [description] - Human-readable description for error messages
 */
function saveJSON(filePath, data, description) {
    const label = description || path.basename(filePath);
    const tmpPath = filePath + '.tmp';
    try {
        const json = JSON.stringify(data, null, 2);
        fs.writeFileSync(tmpPath, json);
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        // Clean up tmp file on failure
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        throw new Error(`Failed to save ${label} (${filePath}): ${err.message}`);
    }
}

/**
 * Check whether a file or directory exists.
 * @param {string} filePath
 * @returns {boolean}
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * Ensure a directory exists, creating it (and parents) if necessary.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Log a structured result block that Claude can parse.
 * @param {string} tag - Result tag name (e.g. "INIT_RESULT", "CHECK_RESULT")
 * @param {object} data - Data to serialize as JSON
 */
function logResult(tag, data) {
    console.log(`=== ${tag} ===`);
    console.log(JSON.stringify(data, null, 2));
}

module.exports = {
    loadJSON,
    saveJSON,
    fileExists,
    ensureDir,
    logResult
};
