/**
 * ids.js
 * ID generation with collision prevention.
 * Scans a directory for existing IDs with a given prefix and returns the next one.
 * Uses file-based locking to prevent race conditions during parallel subagent operations.
 */

const fs = require('fs');
const path = require('path');
const { withLock } = require('./lock');

/**
 * Get the next available ID in a directory for a given prefix.
 *
 * Scans for entries matching {prefix}{digits}, finds the maximum,
 * and returns the next ID zero-padded to padWidth.
 *
 * Uses a lock directory to prevent race conditions when multiple
 * parallel subagents call this simultaneously.
 *
 * @param {string} directory - Directory to scan
 * @param {string} prefix - ID prefix (e.g. "S", "INV", "STY")
 * @param {number} [padWidth=3] - Zero-pad width for the numeric portion
 * @returns {string} Next ID, e.g. "S001", "INV002"
 */
function getNextId(directory, prefix, padWidth = 3) {
    const lockPath = path.join(directory, `.${prefix.toLowerCase()}-id.lock`);

    return withLock(lockPath, () => {
        if (!fs.existsSync(directory)) {
            return `${prefix}${String(1).padStart(padWidth, '0')}`;
        }

        const entries = fs.readdirSync(directory);
        const numbers = entries
            .filter(f => f.startsWith(prefix))
            .map(f => {
                const numStr = f.substring(prefix.length).replace(/\D.*$/, '');
                return parseInt(numStr, 10);
            })
            .filter(n => !isNaN(n));

        const maxId = numbers.length > 0 ? Math.max(...numbers) : 0;
        return `${prefix}${String(maxId + 1).padStart(padWidth, '0')}`;
    });
}

module.exports = { getNextId };
