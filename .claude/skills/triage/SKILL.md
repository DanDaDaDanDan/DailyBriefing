# /triage - Finding Evaluation

Evaluates gathered stories and flags significant findings for deep investigation.

## Usage

```
/triage <briefing-dir>
```

## Process

### 1. Load Gathered Content

Read all topic files and the stories registry:
- `topics/*.md` - Gathered news by axis
- `stories.json` - Structured story data

### 2. Evaluate Each Story

For each story, assess against these criteria:

**Significance (High/Medium/Low)**
- Breaking news with major implications
- Policy changes affecting many people
- Economic events with broad impact
- Major announcements from key institutions

**Complexity (Simple/Complex)**
- Multiple conflicting narratives
- Requires background context to understand
- Technical subject needing explanation
- Evolving situation with incomplete info

**Investigation Potential**
- Would deeper research add value?
- Are there angles not covered in initial reports?
- Do conflicting claims need verification?
- Is official documentation available?

### 3. Flag Findings for Investigation

Flag stories that meet these criteria:
- High significance + complex = definitely flag
- High significance + simple = flag if multiple perspectives needed
- Breaking news with incomplete information
- Stories where sources disagree on facts
- Topics requiring official source verification

Create flagged finding entries:
```javascript
{
  id: "US-001",           // Axis prefix + number
  axis: "axis-id",
  storyId: "STY005",      // Reference to original story
  title: "Descriptive title for investigation",
  priority: "high|medium",
  reason: "Why this needs investigation",
  angles: [               // Suggested investigation angles
    "Official policy details",
    "Industry reaction",
    "Historical context"
  ],
  investigated: false
}
```

### 4. Update State

Add flagged findings to `state.json`:
```javascript
state.phase = 'TRIAGE';
state.currentGate = 3;
state.flaggedFindings = [...flaggedFindings];
state.updatedAt = new Date().toISOString();
```

Update story status in `stories.json`:
```javascript
story.flaggedForInvestigation = true;
story.findingId = "US-001";
```

## Triage Output

Write `triage-summary.md` (optional but helpful):
```markdown
# Triage Summary - YYYY-MM-DD

## Flagged for Investigation

| ID | Axis | Title | Priority |
|----|------|-------|----------|
| US-001 | economy | Fed rate decision implications | High |
| TC-002 | technology | AI regulation debate | Medium |

## Stories by Priority

### High Priority
- [STY005] Story headline - flagged as US-001
- [STY012] Story headline - flagged as TC-002

### Medium Priority
- [STY003] Story headline
- [STY008] Story headline

### Lower Priority
- [remaining stories...]
```

## Flagging Guidelines

**DO flag:**
- Major policy announcements
- Economic data releases with significant implications
- Breaking news where facts are still emerging
- Controversial topics with strong opposing views
- Stories with potential inaccuracies to verify

**DON'T flag:**
- Routine announcements
- Stories with clear, uncontested facts
- Minor updates to ongoing stories
- Opinion pieces (unless analyzing their impact)

## Gate 3 Criteria

Triage passes when:
- All gathered stories have been evaluated
- Significant findings are flagged in `state.json`
- Each flagged finding has: id, axis, title, priority, reason
- `stories.json` updated with flagged status
