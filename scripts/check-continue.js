#!/usr/bin/env node

/**
 * check-continue.js
 * Check if orchestration should continue or stop
 *
 * Usage: node check-continue.js <briefing-dir>
 *
 * Exit codes:
 *   0 - Continue / gate passed (proceed to next phase)
 *   1 - Gate failed (need to complete current phase work)
 *   2 - Invalid arguments
 *   3 - System error (corrupt state, missing files)
 */

const fs = require('fs');
const path = require('path');
const { DIRECTORIES, FILES, PHASES, REPORT_FORMATS, ID_PREFIXES } = require('./utils/constants');
const { loadJSON, fileExists, logResult } = require('./utils/file');

/**
 * Valid phase values for validation
 */
const VALID_PHASES = Object.values(PHASES);

/**
 * Maximum gate number in the system
 */
const MAX_GATE = 7;

/**
 * Validate state.json schema.
 * Logs warnings for invalid fields but does not throw.
 * @param {object} state - Parsed state object
 * @returns {string[]} Array of warning messages (empty if valid)
 */
function validateState(state) {
    const warnings = [];

    // currentGate is a number between 0 and MAX_GATE
    if (typeof state.currentGate !== 'number' || state.currentGate < 0 || state.currentGate > MAX_GATE) {
        warnings.push(`currentGate should be a number between 0 and ${MAX_GATE}, got: ${JSON.stringify(state.currentGate)}`);
    }

    // phase is a valid PHASES value
    if (!VALID_PHASES.includes(state.phase)) {
        warnings.push(`phase should be one of [${VALID_PHASES.join(', ')}], got: ${JSON.stringify(state.phase)}`);
    }

    // gatesPassed is an array with no duplicates and all values 0-MAX_GATE
    if (!Array.isArray(state.gatesPassed)) {
        warnings.push(`gatesPassed should be an array, got: ${typeof state.gatesPassed}`);
    } else {
        const uniqueGates = new Set(state.gatesPassed);
        if (uniqueGates.size !== state.gatesPassed.length) {
            warnings.push(`gatesPassed contains duplicates: ${JSON.stringify(state.gatesPassed)}`);
        }
        const invalidGates = state.gatesPassed.filter(g => typeof g !== 'number' || g < 0 || g > MAX_GATE);
        if (invalidGates.length > 0) {
            warnings.push(`gatesPassed contains invalid gate numbers: ${JSON.stringify(invalidGates)}`);
        }
    }

    // axes is a non-empty array of strings
    if (!Array.isArray(state.axes) || state.axes.length === 0) {
        warnings.push(`axes should be a non-empty array of strings, got: ${JSON.stringify(state.axes)}`);
    } else {
        const nonStrings = state.axes.filter(a => typeof a !== 'string');
        if (nonStrings.length > 0) {
            warnings.push(`axes contains non-string values: ${JSON.stringify(nonStrings)}`);
        }
    }

    // flaggedFindings is an array
    if (!Array.isArray(state.flaggedFindings)) {
        warnings.push(`flaggedFindings should be an array, got: ${typeof state.flaggedFindings}`);
    }

    // errors is an array
    if (!Array.isArray(state.errors)) {
        warnings.push(`errors should be an array, got: ${typeof state.errors}`);
    }

    return warnings;
}

/**
 * Gate definitions with pass criteria
 */
const GATES = [
    {
        id: 0,
        name: 'Config',
        check: (state, dir) => state.phase !== PHASES.INIT
    },
    {
        id: 1,
        name: 'Plan',
        check: (state, dir) => {
            const planPath = path.join(dir, FILES.plan);
            return fileExists(planPath);
        }
    },
    {
        id: 2,
        name: 'Gather',
        check: (state, dir) => {
            const topicsDir = path.join(dir, DIRECTORIES.topics);
            if (!fileExists(topicsDir)) return false;
            const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.md'));
            // Verify ALL axes have topic files
            if (!Array.isArray(state.axes) || state.axes.length === 0) return false;
            return files.length >= state.axes.length;
        }
    },
    {
        id: 3,
        name: 'Triage',
        check: (state, dir) => {
            // Verify flaggedFindings exists and is non-empty
            if (!Array.isArray(state.flaggedFindings) || state.flaggedFindings.length === 0) return false;
            // Verify triage-summary.md exists
            const triagePath = path.join(dir, FILES.triageSummary);
            return fileExists(triagePath);
        }
    },
    {
        id: 4,
        name: 'Investigate',
        check: (state, dir) => {
            if (state.flaggedFindings.length === 0) return true;
            const invDir = path.join(dir, DIRECTORIES.investigations);
            if (!fileExists(invDir)) return false;
            const invs = fs.readdirSync(invDir).filter(f => f.startsWith(ID_PREFIXES.investigation));
            return invs.length >= state.flaggedFindings.length;
        }
    },
    {
        id: 5,
        name: 'Verify',
        check: (state, dir) => {
            // File-based check: fact-check.md must exist
            const factCheckPath = path.join(dir, FILES.factCheck);
            return fileExists(factCheckPath);
        }
    },
    {
        id: 6,
        name: 'Synthesize',
        check: (state, dir) => {
            const briefingsDir = path.join(dir, DIRECTORIES.briefings);
            if (!fileExists(briefingsDir)) return false;
            return REPORT_FORMATS.every(f => fileExists(path.join(briefingsDir, f)));
        }
    },
    {
        id: 7,
        name: 'Audit',
        check: (state, dir) => {
            // File-based check: audit.md must exist
            const auditPath = path.join(dir, FILES.audit);
            return fileExists(auditPath);
        }
    }
];

/**
 * Phase to gate mapping.
 * Maps each phase to the gate that must pass to advance beyond it.
 * FINALIZE and COMPLETE have no gates (post-audit / terminal).
 */
const PHASE_GATES = {
    [PHASES.INIT]: 0,
    [PHASES.PLAN]: 1,
    [PHASES.GATHER]: 2,
    [PHASES.TRIAGE]: 3,
    [PHASES.INVESTIGATE]: 4,
    [PHASES.VERIFY]: 5,
    [PHASES.SYNTHESIZE]: 6,
    [PHASES.AUDIT]: 7
};

/**
 * Determine next action based on state
 */
function determineNextAction(state, dir) {
    const currentGate = state.currentGate || 0;

    // Check if current gate passes
    if (currentGate < GATES.length) {
        const gate = GATES[currentGate];
        if (gate.check(state, dir)) {
            // Gate passes, move to next
            return {
                action: 'advance',
                fromGate: currentGate,
                toGate: currentGate + 1,
                message: `Gate ${currentGate} (${gate.name}) passed`
            };
        } else {
            // Gate not passed, continue current phase
            return {
                action: 'continue',
                gate: currentGate,
                gateName: gate.name,
                message: `Gate ${currentGate} (${gate.name}) not yet passed`
            };
        }
    }

    // All gates passed
    return {
        action: 'complete',
        message: 'All gates passed'
    };
}

/**
 * Main entry point
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: node check-continue.js <briefing-dir>');
        process.exit(2);
    }

    const briefingDir = args[0];
    const statePath = path.join(briefingDir, FILES.state);

    if (!fileExists(statePath)) {
        console.error(`State file not found: ${statePath}`);
        process.exit(3);
    }

    let state;
    try {
        state = loadJSON(statePath, 'state');
    } catch (err) {
        console.error(`System error loading state: ${err.message}`);
        process.exit(3);
    }

    // Validate state schema
    const warnings = validateState(state);
    if (warnings.length > 0) {
        console.warn('State validation warnings:');
        warnings.forEach(w => console.warn(`  - ${w}`));
    }

    // Check for errors
    if (state.errors && state.errors.length > 0) {
        logResult('CHECK_RESULT', {
            continue: false,
            reason: 'errors',
            errors: state.errors
        });
        process.exit(1);
    }

    // Check if complete (terminal state - success, not failure)
    if (state.phase === PHASES.COMPLETE) {
        logResult('CHECK_RESULT', {
            continue: false,
            reason: 'complete',
            message: 'Briefing is complete'
        });
        process.exit(0);
    }

    // FINALIZE has no gate - it is a post-audit pass-through phase
    if (state.phase === PHASES.FINALIZE) {
        logResult('CHECK_RESULT', {
            continue: true,
            action: {
                action: 'continue',
                message: 'FINALIZE phase has no gate, proceed to COMPLETE'
            },
            currentPhase: state.phase,
            currentGate: state.currentGate,
            gatesPassed: state.gatesPassed
        });
        process.exit(0);
    }

    // Determine next action
    const action = determineNextAction(state, briefingDir);

    logResult('CHECK_RESULT', {
        continue: action.action !== 'complete',
        action: action,
        currentPhase: state.phase,
        currentGate: state.currentGate,
        gatesPassed: state.gatesPassed
    });

    // Exit codes: 0 = continue/advance/complete, 1 = gate failed
    if (action.action === 'complete') {
        process.exit(0);
    } else if (action.action === 'advance') {
        process.exit(0);
    } else {
        // action === 'continue' means gate not yet passed
        process.exit(1);
    }
}

main();
