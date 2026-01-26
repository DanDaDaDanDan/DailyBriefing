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

const ROOT_DIR = path.resolve(__dirname, '..');
const BRIEFINGS_DIR = path.join(ROOT_DIR, 'briefings');
const CONFIG_FILE = path.join(BRIEFINGS_DIR, 'config', 'interests.md');

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
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error('Error: Configuration file not found');
        console.error(`Expected: ${CONFIG_FILE}`);
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
 * Parse interest axes from config file
 */
function parseInterests() {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const axes = [];

    // Match ## headings (interest axis names)
    const headingRegex = /^## ([A-Za-z0-9_\- ]+)$/gm;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
        const axisName = match[1].trim();
        // Skip "Configuration Notes" and similar meta sections
        if (!['Configuration Notes', 'Adding Custom Axes'].includes(axisName)) {
            axes.push({
                name: axisName,
                id: axisName.toLowerCase().replace(/\s+/g, '-')
            });
        }
    }

    if (axes.length === 0) {
        console.error('Error: No interest axes found in config');
        console.error('Config must have ## headings for each interest axis');
        return null;
    }

    return axes;
}

/**
 * Create daily briefing directory structure
 */
function createStructure(date, axes) {
    const dayDir = path.join(BRIEFINGS_DIR, date);

    // Check if already exists
    if (fs.existsSync(dayDir)) {
        console.log(`Directory already exists: ${dayDir}`);
        // Load existing state
        const statePath = path.join(dayDir, 'state.json');
        if (fs.existsSync(statePath)) {
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            console.log(`Current phase: ${state.phase}`);
            console.log(`Current gate: ${state.currentGate}`);
            return { dayDir, state, existing: true };
        }
    }

    // Create directories
    const dirs = [
        dayDir,
        path.join(dayDir, 'topics'),
        path.join(dayDir, 'investigations'),
        path.join(dayDir, 'evidence'),
        path.join(dayDir, 'briefings')
    ];

    for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create initial state
    const state = {
        date: date,
        currentGate: 0,
        gatesPassed: [],
        phase: 'INIT',
        axes: axes.map(a => a.id),
        axesConfig: axes,
        flaggedFindings: [],
        errors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(dayDir, 'state.json'),
        JSON.stringify(state, null, 2)
    );

    // Create empty registries
    fs.writeFileSync(
        path.join(dayDir, 'stories.json'),
        JSON.stringify({ stories: [], lastUpdated: new Date().toISOString() }, null, 2)
    );

    fs.writeFileSync(
        path.join(dayDir, 'sources.json'),
        JSON.stringify({ sources: [], lastUpdated: new Date().toISOString() }, null, 2)
    );

    console.log(`Created briefing structure: ${dayDir}`);
    console.log(`Interest axes: ${axes.map(a => a.name).join(', ')}`);

    return { dayDir, state, existing: false };
}

/**
 * Main entry point
 */
function main() {
    console.log('Daily Briefing System - Initialization');
    console.log('======================================');

    const { date } = parseArgs();
    console.log(`Date: ${date}`);

    // Gate 0: Check config exists
    if (!checkConfig()) {
        process.exit(1);
    }
    console.log('Config file found');

    // Parse interest axes
    const axes = parseInterests();
    if (!axes) {
        process.exit(2);
    }
    console.log(`Found ${axes.length} interest axes`);

    // Create structure
    try {
        const result = createStructure(date, axes);

        // Output result as JSON for Claude to parse
        console.log('');
        console.log('=== INIT_RESULT ===');
        console.log(JSON.stringify({
            success: true,
            date: date,
            directory: result.dayDir,
            axes: axes,
            existing: result.existing,
            state: result.state
        }, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(`Error creating structure: ${error.message}`);
        process.exit(3);
    }
}

main();
