# /brief - Daily Briefing Entry Point

Orchestrates the daily briefing workflow from start to finish.

## Usage

```
/brief           # Start new daily briefing
/brief --status  # Show current progress
```

## Workflow

1. **Config Check** - If `briefings/config/interests.md` missing, use AskUserQuestion to gather interests and create it
2. **Initialize** - Run `node scripts/init-briefing.js` to create daily folder structure
3. **Plan** - Run `/plan` to create search strategies from interests
4. **Gather** - Spawn parallel subagents with `/gather` for each interest axis
5. **Triage** - Run `/triage` to evaluate findings and flag significant stories
6. **Investigate** - Run `/investigate` for each flagged finding
7. **Verify** - Run `/verify` to capture sources with hashes
8. **Synthesize** - Run `/synthesize` to generate briefings
9. **Audit** - Run `/audit-neutrality` and `/audit-completeness`
10. **Finalize** - Generate PDFs, mark complete

## Gate Checking

After each phase, run:
```bash
node scripts/check-continue.js briefings/YYYY-MM-DD
```

## State Management

Update `state.json` after each phase transition with current phase, gate, and timestamp.

## Parallel Gathering

Spawn one subagent per interest axis:
```
Task(subagent_type="general-purpose", prompt="Run /gather for {axis}...")
```

Wait for all to complete before TRIAGE.
