#!/usr/bin/env node
'use strict';

/**
 * cleanup.js
 * Storage cleanup and incomplete briefing detection.
 *
 * Usage: node cleanup.js [options]
 *
 * Options:
 *   --older-than N   Remove briefings older than N days (default: 90)
 *   --cache-ttl N    Remove cache files older than N days (default: 30)
 *   --dry-run        Show what would be cleaned without deleting
 *   --help           Show usage information
 *
 * Exit codes:
 *   0 - Success
 *   1 - Invalid arguments
 *   2 - Filesystem error
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BRIEFINGS_DIR = path.join(ROOT_DIR, 'briefings');
const CACHE_DIR = path.join(ROOT_DIR, 'cache');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function printUsage() {
    console.log('Usage: node cleanup.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --older-than N   Remove briefings older than N days (default: 90)');
    console.log('  --cache-ttl N    Remove cache files older than N days (default: 30)');
    console.log('  --dry-run        Show what would be cleaned without deleting');
    console.log('  --help           Show this help message');
}

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        olderThan: 90,
        cacheTtl: 30,
        dryRun: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--older-than':
                if (!args[i + 1] || isNaN(parseInt(args[i + 1], 10))) {
                    console.error('Error: --older-than requires a numeric value');
                    process.exit(1);
                }
                opts.olderThan = parseInt(args[++i], 10);
                break;
            case '--cache-ttl':
                if (!args[i + 1] || isNaN(parseInt(args[i + 1], 10))) {
                    console.error('Error: --cache-ttl requires a numeric value');
                    process.exit(1);
                }
                opts.cacheTtl = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                opts.dryRun = true;
                break;
            case '--help':
                printUsage();
                process.exit(0);
                break;
            default:
                console.error(`Error: Unknown option "${args[i]}"`);
                printUsage();
                process.exit(1);
        }
    }

    return opts;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the number of days between a date string (YYYY-MM-DD) and today.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} Days elapsed (positive = in the past)
 */
function daysAgo(dateStr) {
    const then = new Date(dateStr + 'T00:00:00Z');
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const diffMs = todayUtc.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a byte count into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Recursively compute the total size of a directory in bytes.
 * @param {string} dirPath
 * @returns {number}
 */
function dirSize(dirPath) {
    let total = 0;
    if (!fs.existsSync(dirPath)) return total;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += dirSize(fullPath);
        } else {
            try {
                total += fs.statSync(fullPath).size;
            } catch {
                // Skip files we cannot stat (permissions, etc.)
            }
        }
    }
    return total;
}

/**
 * Recursively remove a directory and all its contents.
 * @param {string} dirPath
 */
function removeDir(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
}

/**
 * Recursively collect all files in a directory.
 * @param {string} dirPath
 * @returns {string[]} Array of absolute file paths
 */
function collectFiles(dirPath) {
    const files = [];
    if (!fs.existsSync(dirPath)) return files;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Recursively remove empty directories within a root directory.
 * Does not remove the root directory itself.
 * @param {string} dirPath
 * @returns {number} Count of directories removed
 */
function removeEmptyDirs(dirPath) {
    let removed = 0;
    if (!fs.existsSync(dirPath)) return removed;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const child = path.join(dirPath, entry.name);
            removed += removeEmptyDirs(child);
            // After cleaning children, check if this directory is now empty
            try {
                const remaining = fs.readdirSync(child);
                if (remaining.length === 0) {
                    fs.rmdirSync(child);
                    removed++;
                }
            } catch {
                // Directory may already be gone
            }
        }
    }
    return removed;
}

// ---------------------------------------------------------------------------
// Briefing scanning
// ---------------------------------------------------------------------------

/**
 * Scan the briefings directory for date-based subdirectories.
 * Returns information about each briefing including completion status.
 * @returns {{ date: string, dirPath: string, age: number, phase: string|null, gate: number|null }[]}
 */
function scanBriefings() {
    const results = [];

    if (!fs.existsSync(BRIEFINGS_DIR)) return results;

    const entries = fs.readdirSync(BRIEFINGS_DIR, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!DATE_PATTERN.test(entry.name)) continue;

        const dirPath = path.join(BRIEFINGS_DIR, entry.name);
        const statePath = path.join(dirPath, 'state.json');
        const age = daysAgo(entry.name);

        let phase = null;
        let gate = null;

        if (fs.existsSync(statePath)) {
            try {
                const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
                phase = state.phase || null;
                gate = typeof state.currentGate === 'number' ? state.currentGate : null;
            } catch {
                // Corrupted state.json - treat as unknown
            }
        }

        results.push({ date: entry.name, dirPath, age, phase, gate });
    }

    // Sort oldest first
    results.sort((a, b) => b.age - a.age);
    return results;
}

// ---------------------------------------------------------------------------
// Cleanup: briefings
// ---------------------------------------------------------------------------

/**
 * Identify and optionally remove old briefings.
 * @param {{ date: string, dirPath: string, age: number, phase: string|null, gate: number|null }[]} briefings
 * @param {number} maxAge - Maximum age in days
 * @param {boolean} dryRun
 * @returns {{ removed: number, bytesFreed: number }}
 */
function cleanBriefings(briefings, maxAge, dryRun) {
    const toRemove = briefings.filter(b => b.age > maxAge);

    if (toRemove.length === 0) {
        console.log(`  No briefings older than ${maxAge} days found.`);
        return { removed: 0, bytesFreed: 0 };
    }

    console.log(`\nBriefings to remove (older than ${maxAge} days): ${toRemove.length}`);

    let totalBytes = 0;
    for (const b of toRemove) {
        const size = dirSize(b.dirPath);
        totalBytes += size;
        const status = b.phase ? ` [${b.phase}]` : '';
        console.log(`  - briefings/${b.date}/ (${b.age} days old, ${formatBytes(size)})${status}`);
    }

    if (dryRun) {
        console.log(`  [DRY RUN] Would remove ${toRemove.length} briefing directories (${formatBytes(totalBytes)})`);
        return { removed: toRemove.length, bytesFreed: totalBytes };
    }

    for (const b of toRemove) {
        try {
            removeDir(b.dirPath);
        } catch (err) {
            console.error(`  Error removing ${b.dirPath}: ${err.message}`);
        }
    }

    return { removed: toRemove.length, bytesFreed: totalBytes };
}

// ---------------------------------------------------------------------------
// Cleanup: cache
// ---------------------------------------------------------------------------

/**
 * Identify and optionally remove stale cache files.
 * @param {number} maxAgeDays
 * @param {boolean} dryRun
 * @returns {{ removed: number, bytesFreed: number }}
 */
function cleanCache(maxAgeDays, dryRun) {
    if (!fs.existsSync(CACHE_DIR)) {
        console.log('  Cache directory does not exist. Nothing to clean.');
        return { removed: 0, bytesFreed: 0 };
    }

    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const allFiles = collectFiles(CACHE_DIR);

    const staleFiles = [];
    for (const filePath of allFiles) {
        try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < cutoff) {
                staleFiles.push({ filePath, size: stat.size, mtime: stat.mtime });
            }
        } catch {
            // Skip files we cannot stat
        }
    }

    if (staleFiles.length === 0) {
        console.log(`  No cache files older than ${maxAgeDays} days found.`);
        return { removed: 0, bytesFreed: 0 };
    }

    let totalBytes = 0;
    for (const f of staleFiles) {
        totalBytes += f.size;
    }

    console.log(`\nCache files to remove (older than ${maxAgeDays} days): ${staleFiles.length}`);
    console.log(`  Total size: ${formatBytes(totalBytes)}`);

    if (dryRun) {
        console.log(`  [DRY RUN] Would remove ${staleFiles.length} cache files (${formatBytes(totalBytes)})`);
        return { removed: staleFiles.length, bytesFreed: totalBytes };
    }

    let removedCount = 0;
    for (const f of staleFiles) {
        try {
            fs.unlinkSync(f.filePath);
            removedCount++;
        } catch (err) {
            console.error(`  Error removing ${f.filePath}: ${err.message}`);
        }
    }

    // Clean up empty directories left behind
    const emptyDirsRemoved = removeEmptyDirs(CACHE_DIR);
    if (emptyDirsRemoved > 0) {
        console.log(`  Removed ${emptyDirsRemoved} empty cache directories`);
    }

    return { removed: removedCount, bytesFreed: totalBytes };
}

// ---------------------------------------------------------------------------
// Incomplete briefing reporting
// ---------------------------------------------------------------------------

/**
 * Report incomplete briefings (phase != COMPLETE).
 * @param {{ date: string, dirPath: string, age: number, phase: string|null, gate: number|null }[]} briefings
 * @returns {{ date: string, phase: string|null, gate: number|null }[]}
 */
function findIncompleteBriefings(briefings) {
    return briefings.filter(b => b.phase !== null && b.phase !== 'COMPLETE');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    const opts = parseArgs();

    console.log('=== Daily Briefing Cleanup ===');
    console.log('');
    if (opts.dryRun) {
        console.log('[DRY RUN MODE - no files will be deleted]');
        console.log('');
    }

    // --- Scan briefings ---
    console.log('Scanning briefings directory...');
    const briefings = scanBriefings();
    console.log(`  Found ${briefings.length} briefing directories`);

    const incomplete = findIncompleteBriefings(briefings);
    if (incomplete.length > 0) {
        console.log(`  Found ${incomplete.length} incomplete briefings:`);
        for (const b of incomplete) {
            const phaseStr = b.phase || 'UNKNOWN';
            const gateStr = b.gate !== null ? b.gate : '?';
            console.log(`    - ${b.date} (phase: ${phaseStr}, gate: ${gateStr})`);
        }
    } else {
        console.log('  No incomplete briefings found.');
    }

    // --- Clean old briefings ---
    const briefingResult = cleanBriefings(briefings, opts.olderThan, opts.dryRun);

    // --- Clean cache ---
    console.log('');
    console.log('Scanning cache directory...');
    const cacheResult = cleanCache(opts.cacheTtl, opts.dryRun);

    // --- Recount incomplete after cleanup (only those not removed) ---
    const remainingIncomplete = incomplete.filter(b => b.age <= opts.olderThan);

    // --- Summary ---
    const totalFreed = briefingResult.bytesFreed + cacheResult.bytesFreed;
    console.log('');
    console.log('Summary:');
    console.log(`  Briefings removed: ${briefingResult.removed}`);
    console.log(`  Cache files removed: ${cacheResult.removed}`);
    console.log(`  Space freed: ${formatBytes(totalFreed)}`);
    console.log(`  Remaining incomplete briefings: ${remainingIncomplete.length}`);

    if (opts.dryRun) {
        console.log('');
        console.log('Run without --dry-run to perform actual cleanup.');
    }
}

try {
    main();
} catch (err) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
}
