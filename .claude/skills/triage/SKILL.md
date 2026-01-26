# /triage - Finding Evaluation

Evaluates gathered stories and flags significant findings for deep investigation.

## Usage

```
/triage <briefing-dir>
```

## Process

1. Read all `topics/*.md` files and `stories.json`
2. Evaluate each story for:
   - Significance (breaking news, policy changes, major events)
   - Complexity (multiple angles, conflicting reports)
   - Reader relevance (matches stated interests)
3. Flag high-priority findings in `state.json`
4. Update story status in `stories.json`

## Flagging Criteria

Flag for investigation when:
- Story has significant policy/economic implications
- Multiple conflicting narratives exist
- Breaking news with incomplete information
- High relevance to stated interests

## Output

Updates `state.json.flaggedFindings` with finding ID, axis, title, priority, and status.
