# /action - Workflow Router

Internal skill for routing between workflow phases.

## Usage

```
/action <phase> <briefing-dir>
```

## Phases

| Phase | Next Phase |
|-------|------------|
| INIT | PLAN |
| PLAN | GATHER |
| GATHER | TRIAGE |
| TRIAGE | INVESTIGATE |
| INVESTIGATE | VERIFY |
| VERIFY | SYNTHESIZE |
| SYNTHESIZE | AUDIT |
| AUDIT | FINALIZE |
| FINALIZE | COMPLETE |

## Process

1. Verify current phase prerequisites met
2. Execute phase-specific skill
3. Update state.json
4. Determine next phase
