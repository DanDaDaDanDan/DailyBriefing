'use strict';

/**
 * lock.js
 * File-based locking for concurrency protection during parallel subagent operations.
 * Uses directory creation (mkdir) which is atomic on most filesystems.
 */

const fs = require('fs');
const path = require('path');

/**
 * Acquire an exclusive lock using a lock directory.
 * mkdir is atomic on most filesystems, making it safe for concurrency.
 * @param {string} lockPath - Path to the lock directory
 * @param {number} [timeoutMs=10000] - Max time to wait for lock
 * @param {number} [retryIntervalMs=100] - Time between retries
 * @returns {boolean} true if lock acquired, false on timeout
 */
function acquireLock(lockPath, timeoutMs = 10000, retryIntervalMs = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            fs.mkdirSync(lockPath);
            // Write a lockfile with PID and timestamp for debugging
            fs.writeFileSync(path.join(lockPath, 'lock.info'), JSON.stringify({
                pid: process.pid,
                acquiredAt: new Date().toISOString()
            }));
            return true;
        } catch (err) {
            if (err.code === 'EEXIST') {
                // Lock exists, check if stale (older than 5 minutes)
                try {
                    const infoPath = path.join(lockPath, 'lock.info');
                    if (fs.existsSync(infoPath)) {
                        const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                        const age = Date.now() - new Date(info.acquiredAt).getTime();
                        if (age > 5 * 60 * 1000) {
                            // Stale lock, force release
                            console.warn(`Removing stale lock (${Math.round(age / 1000)}s old): ${lockPath}`);
                            releaseLock(lockPath);
                            continue;
                        }
                    }
                } catch (e) { /* ignore errors reading lock info */ }

                // Wait and retry
                const waitUntil = Date.now() + retryIntervalMs;
                while (Date.now() < waitUntil) { /* busy wait - short interval */ }
                continue;
            }
            throw err;
        }
    }
    return false; // Timeout
}

/**
 * Release a lock by removing the lock directory.
 * @param {string} lockPath - Path to the lock directory
 */
function releaseLock(lockPath) {
    try {
        const infoPath = path.join(lockPath, 'lock.info');
        if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);
        fs.rmdirSync(lockPath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn(`Warning: Could not release lock ${lockPath}: ${err.message}`);
        }
    }
}

/**
 * Execute a function while holding a lock.
 * Lock is always released, even if fn throws.
 * @param {string} lockPath - Path to the lock directory
 * @param {Function} fn - Function to execute while holding the lock
 * @returns {*} Return value of fn
 * @throws {Error} If lock cannot be acquired (timeout) or fn throws
 */
function withLock(lockPath, fn) {
    if (!acquireLock(lockPath)) {
        throw new Error(`Could not acquire lock: ${lockPath} (timeout)`);
    }
    try {
        return fn();
    } finally {
        releaseLock(lockPath);
    }
}

module.exports = { acquireLock, releaseLock, withLock };
