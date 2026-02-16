/**
 * paths.js
 * Centralized path construction for the Daily Briefing system.
 * All path logic in one place to avoid scattered path.join calls.
 */

const path = require('path');
const { DIRECTORIES, FILES } = require('./constants');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BRIEFINGS_BASE = path.join(PROJECT_ROOT, 'briefings');

/**
 * Root directory for a given date's briefing.
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function briefingRoot(date) {
    return path.join(BRIEFINGS_BASE, date);
}

/**
 * Topics directory for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function topics(date) {
    return path.join(briefingRoot(date), DIRECTORIES.topics);
}

/**
 * Investigations directory for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function investigations(date) {
    return path.join(briefingRoot(date), DIRECTORIES.investigations);
}

/**
 * Evidence directory for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function evidence(date) {
    return path.join(briefingRoot(date), DIRECTORIES.evidence);
}

/**
 * Briefings output directory for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {string}
 */
function briefings(date) {
    return path.join(briefingRoot(date), DIRECTORIES.briefings);
}

// --- Specific file paths ---

function stateFile(date) {
    return path.join(briefingRoot(date), FILES.state);
}

function planFile(date) {
    return path.join(briefingRoot(date), FILES.plan);
}

function storiesFile(date) {
    return path.join(briefingRoot(date), FILES.stories);
}

function sourcesFile(date) {
    return path.join(briefingRoot(date), FILES.sources);
}

function factCheckFile(date) {
    return path.join(briefingRoot(date), FILES.factCheck);
}

function auditFile(date) {
    return path.join(briefingRoot(date), FILES.audit);
}

function triageSummaryFile(date) {
    return path.join(briefingRoot(date), FILES.triageSummary);
}

// --- Config ---

function configFile() {
    return path.join(BRIEFINGS_BASE, 'config', FILES.interests);
}

// --- Parameterized paths ---

/**
 * Path to a specific topic file.
 * @param {string} date - YYYY-MM-DD
 * @param {string} axisId - e.g. "us-finance"
 * @returns {string}
 */
function topicFile(date, axisId) {
    return path.join(topics(date), `${axisId}.md`);
}

/**
 * Directory for a specific investigation.
 * @param {string} date - YYYY-MM-DD
 * @param {string} invId - e.g. "INV001"
 * @returns {string}
 */
function investigationDir(date, invId) {
    return path.join(investigations(date), invId);
}

/**
 * Directory for a specific source's evidence.
 * @param {string} date - YYYY-MM-DD
 * @param {string} sourceId - e.g. "S001"
 * @returns {string}
 */
function evidenceDir(date, sourceId) {
    return path.join(evidence(date), sourceId);
}

module.exports = {
    PROJECT_ROOT,
    BRIEFINGS_BASE,
    briefingRoot,
    topics,
    investigations,
    evidence,
    briefings,
    stateFile,
    planFile,
    storiesFile,
    sourcesFile,
    factCheckFile,
    auditFile,
    triageSummaryFile,
    configFile,
    topicFile,
    investigationDir,
    evidenceDir
};
