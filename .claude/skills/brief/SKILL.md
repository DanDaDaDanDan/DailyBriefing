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

Then create `briefings/config/interests.md` with their responses.

### 2. Initialize Structure

Run the init script:
```bash
node scripts/init-briefing.js
```

This creates the daily briefing folder structure.

### 3. Plan Phase (Gate 1)

```
/plan briefings/YYYY-MM-DD
```

Creates `plan.md` with search strategies per axis.

### 4. Gather Phase (Gate 2)

Spawn parallel subagents - one per interest axis:

```javascript
Task({
  subagent_type: "general-purpose",
  prompt: `Run /gather ${axisId} briefings/${date}`
})
```

**Important:** Launch all gather agents in parallel.

### 5. Triage Phase (Gate 3)

```
/triage briefings/YYYY-MM-DD
```

Evaluates stories and flags significant findings.

### 6. Investigate Phase (Gate 4)

For each flagged finding, spawn investigation agent:

```javascript
Task({
  subagent_type: "general-purpose",
  prompt: `Run /investigate ${findingId} briefings/${date}`
})
```

Run investigations in parallel.

### 7. Verify Phase (Gate 5)

```
/verify briefings/YYYY-MM-DD
```

- Captures sources to `evidence/` with SHA256 hashes
- Extracts and validates all quantitative claims using GPT
- Produces `fact-check.md` with validation results

### 8. Synthesize Phase

```
/synthesize briefings/YYYY-MM-DD
```

Generates `short.md`, `detailed.md`, `full.md` in briefings folder.

### 9. Audit Phase (Gate 6)

```
/audit briefings/YYYY-MM-DD
```

Single-pass check for neutrality and completeness. Produces `audit.md`.

If issues found, remediate and re-run.

### 10. Article Check (Gate 7)

Verify final outputs:
- All three briefing files exist
- Word counts within acceptable ranges
- No remaining issues from audit

### 11. Finalize

Update state to COMPLETE. Optionally generate PDFs.

## State Management

After each phase, update `state.json`:

```javascript
state.phase = 'GATHER';
state.currentGate = 2;
state.gatesPassed.push(1);
state.updatedAt = new Date().toISOString();
```

## --status Output

```
Daily Briefing Status
=====================
Date: YYYY-MM-DD
Phase: [current phase]
Current Gate: [number] ([name])
Gates Passed: [list]

Interest Axes:
- [axis]: [status]

Flagged Findings: [count]
Errors: [count]
```

## Completion Output

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

Workflow Statistics:
- Gates passed: 8/8
- Stories investigated: X
- Sources verified: X
```
