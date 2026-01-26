#!/usr/bin/env node

/**
 * check-continue.js
 * Check if orchestration should continue or stop
 *
 * Usage: node check-continue.js <briefing-dir>
 *
 * Exit codes:
 *   0 - Continue (more work to do)
 *   1 - Stop (complete or error)
 *   2 - Invalid arguments
 */

const fs = require('fs');
const path = require('path');

/**
 * Gate definitions with pass criteria
 */
const GATES = [
    {
        id: 0,
        name: 'Config',
        check: (state, dir) => state.phase !== 'INIT'
    },
    {
        id: 1,
        name: 'Plan',
        check: (state, dir) => {
            const planPath = path.join(dir, 'plan.md');
            return fs.existsSync(planPath);
        }
    },
    {
        id: 2,
        name: 'Gather',
        check: (state, dir) => {
            const topicsDir = path.join(dir, 'topics');
            if (!fs.existsSync(topicsDir)) return false;
            const files = fs.readdirSync(topicsDir).filter(f => f.endsWith('.md'));
            return files.length >= state.axes.length;
        }
    },
    {
        id: 3,
        name: 'Triage',
        check: (state, dir) => {
            return state.triageComplete === true;
        }
    },
    {
        id: 4,
        name: 'Investigate',
        check: (state, dir) => {
            if (state.flaggedFindings.length === 0) return true;
            const invDir = path.join(dir, 'investigations');
            if (!fs.existsSync(invDir)) return false;
            const invs = fs.readdirSync(invDir).filter(f => f.startsWith('INV'));
            return invs.length >= state.flaggedFindings.length;
        }
    },
    {
        id: 5,
        name: 'Verify',
        check: (state, dir) => {
            return state.verificationComplete === true;
        }
    },
    {
        id: 6,
        name: 'Neutrality',
        check: (state, dir) => {
            return state.neutralityPassed === true;
        }
    },
    {
        id: 7,
        name: 'Article',
        check: (state, dir) => {
            const briefingsDir = path.join(dir, 'briefings');
            if (!fs.existsSync(briefingsDir)) return false;
            const required = ['short.md', 'detailed.md', 'full.md'];
            return required.every(f => fs.existsSync(path.join(briefingsDir, f)));
        }
    }
];

/**
 * Phase to gate mapping
 */
const PHASE_GATES = {
    'INIT': 0,
    'PLAN': 1,
    'GATHER': 2,
    'TRIAGE': 3,
    'INVESTIGATE': 4,
    'VERIFY': 5,
    'SYNTHESIZE': 6,
    'AUDIT': 6,
    'FINALIZE': 7,
    'COMPLETE': 8
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
    const statePath = path.join(briefingDir, 'state.json');

    if (!fs.existsSync(statePath)) {
        console.error(`State file not found: ${statePath}`);
        process.exit(2);
    }

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // Check for errors
    if (state.errors && state.errors.length > 0) {
        console.log('=== CHECK_RESULT ===');
        console.log(JSON.stringify({
            continue: false,
            reason: 'errors',
            errors: state.errors
        }, null, 2));
        process.exit(1);
    }

    // Check if complete
    if (state.phase === 'COMPLETE') {
        console.log('=== CHECK_RESULT ===');
        console.log(JSON.stringify({
            continue: false,
            reason: 'complete',
            message: 'Briefing is complete'
        }, null, 2));
        process.exit(1);
    }

    // Determine next action
    const action = determineNextAction(state, briefingDir);

    console.log('=== CHECK_RESULT ===');
    console.log(JSON.stringify({
        continue: action.action !== 'complete',
        action: action,
        currentPhase: state.phase,
        currentGate: state.currentGate,
        gatesPassed: state.gatesPassed
    }, null, 2));

    process.exit(action.action === 'complete' ? 1 : 0);
}

main();
