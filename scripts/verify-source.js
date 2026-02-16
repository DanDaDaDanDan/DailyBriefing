#!/usr/bin/env node

/**
 * verify-source.js
 * Verify source integrity using SHA256 hashes
 *
 * Usage:
 *   node verify-source.js --capture <url> <output-dir>  # Capture and hash
 *   node verify-source.js --verify <evidence-dir>        # Verify existing
 *   node verify-source.js --check-all <briefing-dir>     # Verify all sources
 *
 * Exit codes:
 *   0 - Success / Verified
 *   1 - Verification failed
 *   2 - Invalid arguments
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DIRECTORIES, FILES, ID_PREFIXES } = require('./utils/constants');
const { loadJSON, saveJSON, fileExists, ensureDir, logResult } = require('./utils/file');
const { getNextId } = require('./utils/ids');

/**
 * Generate SHA256 hash of content
 */
function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Create source metadata
 */
function createMetadata(url, hash, additionalData = {}) {
    return {
        url: url,
        capturedAt: new Date().toISOString(),
        sha256: hash,
        ...additionalData
    };
}

/**
 * Capture a source (placeholder - actual fetching done by Claude)
 * This creates the metadata structure
 */
function captureSource(url, outputDir, content, additionalData = {}) {
    ensureDir(outputDir);

    const hash = hashContent(content);

    // Save content
    const contentPath = path.join(outputDir, 'content.md');
    fs.writeFileSync(contentPath, content);

    // Save metadata
    const metadata = createMetadata(url, hash, additionalData);
    const metadataPath = path.join(outputDir, 'metadata.json');
    saveJSON(metadataPath, metadata, 'source metadata');

    return {
        success: true,
        hash: hash,
        outputDir: outputDir,
        metadata: metadata
    };
}

/**
 * Verify a single source directory
 */
function verifySource(evidenceDir) {
    const metadataPath = path.join(evidenceDir, 'metadata.json');
    const contentPath = path.join(evidenceDir, 'content.md');

    if (!fileExists(metadataPath)) {
        return { verified: false, error: 'metadata.json not found' };
    }

    if (!fileExists(contentPath)) {
        return { verified: false, error: 'content.md not found' };
    }

    const metadata = loadJSON(metadataPath, 'source metadata');
    const content = fs.readFileSync(contentPath, 'utf8');
    const currentHash = hashContent(content);

    if (currentHash !== metadata.sha256) {
        return {
            verified: false,
            error: 'Hash mismatch',
            expected: metadata.sha256,
            actual: currentHash
        };
    }

    return {
        verified: true,
        url: metadata.url,
        capturedAt: metadata.capturedAt,
        hash: metadata.sha256
    };
}

/**
 * Verify all sources in a briefing
 */
function verifyAllSources(briefingDir) {
    const evidDir = path.join(briefingDir, DIRECTORIES.evidence);

    if (!fileExists(evidDir)) {
        return { verified: true, sources: [], message: 'No evidence directory' };
    }

    const sourceDirs = fs.readdirSync(evidDir)
        .filter(f => f.startsWith(ID_PREFIXES.source))
        .map(f => path.join(evidDir, f));

    const results = [];
    let allVerified = true;

    for (const sourceDir of sourceDirs) {
        const result = verifySource(sourceDir);
        result.sourceId = path.basename(sourceDir);
        results.push(result);

        if (!result.verified) {
            allVerified = false;
        }
    }

    return {
        verified: allVerified,
        total: results.length,
        passed: results.filter(r => r.verified).length,
        failed: results.filter(r => !r.verified).length,
        sources: results
    };
}

/**
 * Register a source in sources.json
 */
function registerSource(briefingDir, sourceId, url, hash, title = '') {
    const sourcesPath = path.join(briefingDir, FILES.sources);

    let sources = { sources: [], lastUpdated: new Date().toISOString() };
    if (fileExists(sourcesPath)) {
        sources = loadJSON(sourcesPath, 'sources registry');
    }

    // Check if source already exists
    const existing = sources.sources.find(s => s.id === sourceId);
    if (existing) {
        return { registered: false, reason: 'already exists', source: existing };
    }

    const newSource = {
        id: sourceId,
        url: url,
        title: title,
        hash: hash,
        capturedAt: new Date().toISOString(),
        verified: true
    };

    sources.sources.push(newSource);
    sources.lastUpdated = new Date().toISOString();

    saveJSON(sourcesPath, sources, 'sources registry');

    return { registered: true, source: newSource };
}

/**
 * Get next source ID
 */
function getNextSourceId(briefingDir) {
    const evidDir = path.join(briefingDir, DIRECTORIES.evidence);
    return getNextId(evidDir, ID_PREFIXES.source);
}

/**
 * Main entry point
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage:');
        console.error('  node verify-source.js --capture <url> <output-dir> [--content <file>]');
        console.error('  node verify-source.js --verify <evidence-dir>');
        console.error('  node verify-source.js --check-all <briefing-dir>');
        console.error('  node verify-source.js --register <briefing-dir> <source-id> <url> <hash> [title]');
        console.error('  node verify-source.js --next-id <briefing-dir>');
        process.exit(2);
    }

    const command = args[0];

    if (command === '--capture') {
        if (args.length < 3) {
            console.error('Usage: node verify-source.js --capture <url> <output-dir> [--content <file>]');
            process.exit(2);
        }

        const url = args[1];
        const outputDir = args[2];

        // Read content from file if provided, otherwise from stdin
        let content = '';
        const contentIdx = args.indexOf('--content');
        if (contentIdx !== -1 && args[contentIdx + 1]) {
            content = fs.readFileSync(args[contentIdx + 1], 'utf8');
        } else {
            // For manual testing, provide placeholder
            content = `Captured from: ${url}\nTimestamp: ${new Date().toISOString()}`;
        }

        const result = captureSource(url, outputDir, content);
        logResult('CAPTURE_RESULT', result);
        process.exit(0);

    } else if (command === '--verify') {
        if (args.length < 2) {
            console.error('Usage: node verify-source.js --verify <evidence-dir>');
            process.exit(2);
        }

        const result = verifySource(args[1]);
        logResult('VERIFY_RESULT', result);
        process.exit(result.verified ? 0 : 1);

    } else if (command === '--check-all') {
        if (args.length < 2) {
            console.error('Usage: node verify-source.js --check-all <briefing-dir>');
            process.exit(2);
        }

        const result = verifyAllSources(args[1]);
        logResult('CHECK_ALL_RESULT', result);
        process.exit(result.verified ? 0 : 1);

    } else if (command === '--register') {
        if (args.length < 5) {
            console.error('Usage: node verify-source.js --register <briefing-dir> <source-id> <url> <hash> [title]');
            process.exit(2);
        }

        const result = registerSource(args[1], args[2], args[3], args[4], args[5] || '');
        logResult('REGISTER_RESULT', result);
        process.exit(result.registered ? 0 : 1);

    } else if (command === '--next-id') {
        if (args.length < 2) {
            console.error('Usage: node verify-source.js --next-id <briefing-dir>');
            process.exit(2);
        }

        const nextId = getNextSourceId(args[1]);
        console.log(nextId);
        process.exit(0);

    } else {
        console.error(`Unknown command: ${command}`);
        process.exit(2);
    }
}

main();
