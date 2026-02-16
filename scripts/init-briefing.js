#!/usr/bin/env node

/**
 * init-briefing.js
 * Creates daily briefing structure and validates configuration
 *
 * Usage: node init-briefing.js [--date YYYY-MM-DD]
 *
 * Exit codes:
 *   0 - Success
 *   1 - Config missing
 *   2 - Config invalid
 *   3 - Directory creation failed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PHASES } = require('./utils/constants');
const paths = require('./utils/paths');
const { loadJSON, saveJSON, fileExists, ensureDir, logResult } = require('./utils/file');
const { acquireLock, releaseLock } = require('./utils/lock');

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--date' && args[i + 1]) {
            date = args[i + 1];
            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                console.error('Error: Date must be in YYYY-MM-DD format');
                process.exit(2);
            }
        }
    }

    return { date };
}

/**
 * Check if config file exists
 */
function checkConfig() {
    const configPath = paths.configFile();
    if (!fileExists(configPath)) {
        console.error('Error: Configuration file not found');
        console.error(`Expected: ${configPath}`);
        console.error('');
        console.error('Create briefings/config/interests.md with your interests.');
        console.error('');
        console.error('Example format:');
        console.error('```');
        console.error('# My Interests');
        console.error('');
        console.error('## Germany');
        console.error('German expat in the US. Care about politics, economy, expat issues.');
        console.error('');
        console.error('## US Finance');
        console.error('Interested in Fed policy, tax changes, SEC regulations.');
        console.error('```');
        console.error('');
        console.error('Keep it high-level - express curiosity, not search terms.');
        console.error('The system figures out where and how to look.');
        return false;
    }
    return true;
}

/**
 * Compute SHA256 checksum of a string
 */
function computeChecksum(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Parse interest axes from config file
 */
function parseInterests() {
    const content = fs.readFileSync(paths.configFile(), 'utf8');
    const axes = [];
    const seenIds = new Map(); // id -> axis name, for duplicate detection

    // Split content by ## headings to get sections
    const sections = content.split(/^## /m);

    // First element is everything before the first ## heading; skip it
    for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const lines = section.split('\n');

        // First line is the heading text (everything after the ## we split on)
        const axisName = lines[0].trim();
        if (!axisName) {
            continue;
        }

        // Remaining lines are the description
        const description = lines.slice(1).join('\n').trim();

        // Require at least 20 characters of description to qualify as an axis
        if (description.length < 20) {
            console.info(`Skipping section "${axisName}": insufficient description (${description.length} chars, need 20+)`);
            continue;
        }

        // Generate ID: lowercase, spaces to hyphens, strip non-word/non-hyphen chars
        const id = axisName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

        // Check for duplicate IDs
        if (seenIds.has(id)) {
            throw new Error(
                `Duplicate axis ID "${id}" generated from both "${seenIds.get(id)}" and "${axisName}"`
            );
        }
        seenIds.set(id, axisName);

        axes.push({
            name: axisName,
            id: id,
            description: description
        });
    }

    if (axes.length === 0) {
        console.error('Error: No interest axes found in config');
        console.error('Config must have ## headings for each interest axis');
        return null;
    }

    // Compute config checksum
    const configChecksum = computeChecksum(content);

    return { axes, configChecksum };
}

/**
 * Create daily briefing directory structure
 */
function createStructure(date, axes, configChecksum) {
    const dayDir = paths.briefingRoot(date);

    // Check if already exists
    if (fileExists(dayDir)) {
        console.log(`Directory already exists: ${dayDir}`);
        // Load existing state
        const statePath = paths.stateFile(date);
        if (fileExists(statePath)) {
            const state = loadJSON(statePath, 'state');
            console.log(`Current phase: ${state.phase}`);
            console.log(`Current gate: ${state.currentGate}`);

            // Config change detection
            if (state.configChecksum && state.configChecksum !== configChecksum) {
                console.warn('WARNING: interests.md has changed since this briefing was started.');
                console.warn(`Previous checksum: ${state.configChecksum}`);
                console.warn(`Current checksum: ${configChecksum}`);
                console.warn('This may cause inconsistent results.');
            }

            return { dayDir, state, existing: true };
        }
    }

    // Create directories
    const dirs = [
        dayDir,
        paths.topics(date),
        paths.investigations(date),
        paths.evidence(date),
        paths.briefings(date)
    ];

    for (const dir of dirs) {
        ensureDir(dir);
    }

    // Build per-axis status tracking
    const axisStatus = {};
    for (const axis of axes) {
        axisStatus[axis.id] = { status: 'pending', storiesFound: 0 };
    }

    // Create initial state
    const state = {
        date: date,
        currentGate: 0,
        gatesPassed: [],
        phase: PHASES.INIT,
        axes: axes.map(a => a.id),
        axesConfig: axes,
        axisStatus: axisStatus,
        configChecksum: configChecksum,
        configVersion: '1.0',
        flaggedFindings: [],
        errors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    saveJSON(paths.stateFile(date), state, 'state');

    // Create empty registries
    saveJSON(paths.storiesFile(date), {
        stories: [],
        lastUpdated: new Date().toISOString()
    }, 'stories');

    saveJSON(paths.sourcesFile(date), {
        sources: [],
        lastUpdated: new Date().toISOString()
    }, 'sources');

    console.log(`Created briefing structure: ${dayDir}`);
    console.log(`Interest axes: ${axes.map(a => a.name).join(', ')}`);

    return { dayDir, state, existing: false };
}

/**
 * Scan for incomplete briefings and log warnings.
 * Does not block execution; purely informational.
 * @param {string} currentDate - The date being initialized (YYYY-MM-DD), excluded from warnings
 */
function checkIncompleteBriefings(currentDate) {
    if (!fileExists(paths.BRIEFINGS_BASE)) return;

    let entries;
    try {
        entries = fs.readdirSync(paths.BRIEFINGS_BASE, { withFileTypes: true });
    } catch {
        return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const incomplete = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!datePattern.test(entry.name)) continue;
        if (entry.name === currentDate) continue;

        const statePath = paths.stateFile(entry.name);
        if (!fileExists(statePath)) continue;

        try {
            const state = loadJSON(statePath, 'state');
            if (state.phase && state.phase !== PHASES.COMPLETE) {
                incomplete.push({
                    date: entry.name,
                    phase: state.phase,
                    gate: typeof state.currentGate === 'number' ? state.currentGate : null
                });
            }
        } catch {
            // Skip directories with unreadable state
        }
    }

    if (incomplete.length > 0) {
        // Sort by date descending (most recent first)
        incomplete.sort((a, b) => b.date.localeCompare(a.date));

        console.log('');
        for (const b of incomplete) {
            const gateStr = b.gate !== null ? b.gate : '?';
            console.log(`Note: Found incomplete briefing from ${b.date} (phase: ${b.phase}, gate: ${gateStr})`);
            console.log(`  Use --date ${b.date} to resume, or continue with today's date.`);
        }
        console.log('');
    }
}

/**
 * Main entry point
 */
function main() {
    console.log('Daily Briefing System - Initialization');
    console.log('======================================');

    const { date } = parseArgs();
    console.log(`Date: ${date}`);

    // Check for incomplete briefings from other dates (informational only)
    checkIncompleteBriefings(date);

    // Check for concurrent briefing process (informational only, does not block)
    const dayDir = paths.briefingRoot(date);
    const briefingLockPath = path.join(dayDir, 'briefing.lock');
    if (fileExists(briefingLockPath)) {
        let staleWarning = '';
        try {
            const infoPath = path.join(briefingLockPath, 'lock.info');
            if (fileExists(infoPath)) {
                const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                const age = Date.now() - new Date(info.acquiredAt).getTime();
                if (age > 5 * 60 * 1000) {
                    staleWarning = ` (stale - ${Math.round(age / 1000)}s old, PID ${info.pid})`;
                    console.warn(`WARNING: Stale briefing lock detected${staleWarning}`);
                    console.warn('  Removing stale lock and continuing.');
                    releaseLock(briefingLockPath);
                } else {
                    console.warn(`WARNING: Another process may be running a briefing for ${date}`);
                    console.warn(`  Lock held by PID ${info.pid} since ${info.acquiredAt}`);
                    console.warn('  Continuing anyway - concurrent access may cause issues.');
                }
            } else {
                console.warn(`WARNING: Briefing lock directory exists but has no info: ${briefingLockPath}`);
                console.warn('  This may indicate a crashed process. Continuing anyway.');
            }
        } catch (e) {
            console.warn(`WARNING: Could not read briefing lock info: ${e.message}`);
            console.warn('  Continuing anyway.');
        }
    }

    // Gate 0: Check config exists
    if (!checkConfig()) {
        process.exit(1);
    }
    console.log('Config file found');

    // Parse interest axes
    const parsed = parseInterests();
    if (!parsed) {
        process.exit(2);
    }
    const { axes, configChecksum } = parsed;
    console.log(`Found ${axes.length} interest axes`);
    console.log(`Config checksum: ${configChecksum.substring(0, 16)}...`);

    // Create structure
    try {
        const result = createStructure(date, axes, configChecksum);

        // Output result as JSON for Claude to parse
        console.log('');
        logResult('INIT_RESULT', {
            success: true,
            date: date,
            directory: result.dayDir,
            axes: axes,
            existing: result.existing,
            state: result.state
        });

        process.exit(0);
    } catch (error) {
        console.error(`Error creating structure: ${error.message}`);
        process.exit(3);
    }
}

main();
