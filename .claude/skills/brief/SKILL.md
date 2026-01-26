# /brief - Daily Briefing Entry Point

Orchestrates the daily briefing workflow from start to finish.

## Usage

```
/brief           # Start new daily briefing
/brief --status  # Show current progress
```

## Workflow

### 1. Config Check (Gate 0)

Check if `briefings/config/interests.md` exists.

**If missing:** Use AskUserQuestion to gather interests:
- Ask what topics/areas the user wants to track
- Ask for any geographic focus
- Ask what perspective matters (professional, personal, etc.)

Then create `briefings/config/interests.md` with their responses, formatted as:
```markdown
## [Topic Name]
[Description of interest and context]
```

### 2. Initialize Structure

Run the init script:
```bash
node scripts/init-briefing.js
```

This creates:
```
briefings/YYYY-MM-DD/
├── state.json
├── stories.json
├── sources.json
├── topics/
├── investigations/
├── evidence/
└── briefings/
```

### 3. Plan Phase (Gate 1)

Invoke the plan skill:
```
/plan briefings/YYYY-MM-DD
```

This reads interests and creates `plan.md` with search strategies.

### 4. Gather Phase (Gate 2)

Spawn parallel subagents - one per interest axis:

```javascript
// For each axis in state.axes, spawn a Task:
Task({
  subagent_type: "general-purpose",
  prompt: `Run /gather ${axisId} briefings/${date}
           Use the search strategy from plan.md.
           Write results to topics/${axisId}.md
           Update stories.json with gathered stories.`
})
```

**Important:** Launch all gather agents in parallel (single message with multiple Task calls). Wait for all to complete before proceeding.

### 5. Triage Phase (Gate 3)

```
/triage briefings/YYYY-MM-DD
```

Evaluates stories and flags significant findings in `state.json.flaggedFindings`.

### 6. Investigate Phase (Gate 4)

For each flagged finding, spawn investigation agent:

```javascript
Task({
  subagent_type: "general-purpose",
  prompt: `Run /investigate ${findingId} briefings/${date}`
})
```

Run investigations in parallel. Each writes to `investigations/INV###/findings.md`.

### 7. Verify Phase (Gate 5)

```
/verify briefings/YYYY-MM-DD
```

Captures sources to `evidence/` with SHA256 hashes.

### 8. Fact Validation Phase (Gate 6)

Before synthesis, validate factual accuracy:
```
/fact-validate briefings/YYYY-MM-DD
```

This cross-checks all quantitative claims against captured sources and produces `fact-check.md`.

### 9. Synthesize Phase

```
/synthesize briefings/YYYY-MM-DD
```

Generates output files in `<briefing-dir>/briefings/`:
- `short.md`, `detailed.md`, `full.md`

### 10. Audit Phase (Gates 7 & 8)

Run both audits on the generated content:
```
/audit-neutrality briefings/YYYY-MM-DD
/audit-completeness briefings/YYYY-MM-DD
```

- Gate 7 (Neutrality): Passes when no bias/advocacy issues remain
- Gate 8 (Article): Passes when coverage is complete and quality standards met

If issues found, remediate and re-run audits.

### 11. Finalize

Generate PDFs (optional):
```bash
node scripts/generate-pdf.js briefings/YYYY-MM-DD
```

Update state to COMPLETE.

## Gate Checking

After each phase, check gate status:
```bash
node scripts/check-continue.js briefings/YYYY-MM-DD
```

Returns JSON with:
- `canContinue`: boolean
- `currentGate`: number
- `nextPhase`: string
- `issues`: array of blocking issues

## State Management

After each phase transition, update `state.json`:

```javascript
state.phase = 'GATHER';  // Current phase
state.currentGate = 2;   // Gate being worked on
state.gatesPassed.push(1);  // Add completed gates
state.updatedAt = new Date().toISOString();
```

## --status Output

Display current progress:
```
Daily Briefing Status
=====================
Date: YYYY-MM-DD
Phase: [current phase]
Current Gate: [number] ([name])
Gates Passed: [list]

Interest Axes:
- [axis]: [status]
...

Flagged Findings: [count]
Errors: [count]
```

## Completion Output

When complete, display summary:
```
Daily Briefing Complete
=======================
Date: YYYY-MM-DD

Generated Files:
| File | Words | Description |
|------|-------|-------------|
| short.md | XXX | Quick read (3-5 min) |
| detailed.md | XXX | Comprehensive (10-15 min) |
| full.md | XXX | Complete with sources |

Coverage Summary:
[Brief summary of top stories per axis]

Workflow Statistics:
- Gates passed: 9/9
- Stories investigated: X
- Sources verified: X
```
