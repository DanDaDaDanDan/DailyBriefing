/**
 * constants.js
 * Shared constants for the Daily Briefing system.
 * All magic strings extracted into a single frozen object.
 */

const CONSTANTS = Object.freeze({
    DIRECTORIES: Object.freeze({
        topics: 'topics',
        investigations: 'investigations',
        evidence: 'evidence',
        briefings: 'briefings'
    }),

    FILES: Object.freeze({
        state: 'state.json',
        plan: 'plan.md',
        stories: 'stories.json',
        sources: 'sources.json',
        factCheck: 'fact-check.md',
        audit: 'audit.md',
        triageSummary: 'triage-summary.md',
        short: 'short.md',
        detailed: 'detailed.md',
        full: 'full.md',
        interests: 'interests.md'
    }),

    ID_PREFIXES: Object.freeze({
        source: 'S',
        investigation: 'INV',
        story: 'STY'
    }),

    PHASES: Object.freeze({
        INIT: 'INIT',
        PLAN: 'PLAN',
        GATHER: 'GATHER',
        TRIAGE: 'TRIAGE',
        INVESTIGATE: 'INVESTIGATE',
        VERIFY: 'VERIFY',
        SYNTHESIZE: 'SYNTHESIZE',
        AUDIT: 'AUDIT',
        FINALIZE: 'FINALIZE',
        COMPLETE: 'COMPLETE'
    }),

    REPORT_FORMATS: Object.freeze(['short.md', 'detailed.md', 'full.md']),

    WORD_COUNT_TARGETS: Object.freeze({
        short: Object.freeze({ min: 500, max: 900 }),
        detailed: Object.freeze({ min: 2000, max: 4000 }),
        full: Object.freeze({ min: 5000, max: null })
    })
});

module.exports = CONSTANTS;
