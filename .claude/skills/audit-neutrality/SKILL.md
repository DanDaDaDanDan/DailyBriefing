# /audit-neutrality - Neutrality Verification

Three-agent debate to verify briefing neutrality and objectivity.

## Usage

```
/audit-neutrality <briefing-dir>
```

## The Debate Process

Three agents review the briefing content in sequence:

### Agent 1: Critic

**Role:** Find potential bias, advocacy, or imbalance

**Process:**
1. Read all briefing files from `<briefing-dir>/briefings/` (short.md, detailed.md, full.md)
2. Scan for forbidden language patterns
3. Identify potential perspective imbalance
4. Flag specific issues with location and severity

**Output format:**
```markdown
## Critic Findings

### Critical Issues
1. **[Location]**: [Issue description]
   - Quote: "[problematic text]"
   - Violation: [which rule broken]

### Minor Issues
1. **[Location]**: [Issue description]
   ...

### Balance Assessment
- [Axis]: [assessment of perspective balance]
```

### Agent 2: Defender

**Role:** Argue for the objectivity of flagged content

**Process:**
1. Review each issue flagged by Critic
2. Provide counter-arguments where applicable
3. Acknowledge valid criticisms
4. Suggest specific fixes for valid issues

**Output format:**
```markdown
## Defender Response

### Issue 1: [Critic's issue]
**Defense:** [Why this might be acceptable]
**Concession:** [If valid, acknowledge and propose fix]

### Issue 2: ...
```

### Agent 3: Arbiter

**Role:** Make final determination

**Process:**
1. Review Critic findings and Defender responses
2. Make ruling on each issue
3. Specify required remediation
4. Determine overall pass/fail

**Output format:**
```markdown
## Arbiter Ruling

### Resolved Issues
| Issue | Location | Ruling | Action Required |
|-------|----------|--------|-----------------|
| N001 | detailed.md/para 3 | Valid | Remove "clearly" |
| N002 | short.md/headline | Dismissed | None |

### Required Remediation
1. [Specific change needed]
2. [Specific change needed]

### Overall Determination
**Status:** PASS / FAIL
**Reason:** [Explanation]
```

## Checks Performed

### Language Violations

**Verdict Language:**
- confirmed, debunked, proven, disproven
- false, true, fact, lie
- fact-checked, verified (as verdicts)

**Advocacy Framing:**
- must, should, need to, ought to
- important that, crucial that, essential
- clearly, obviously, undoubtedly

**Emotional Language:**
- shocking, outrageous, appalling
- unprecedented (unless factually accurate)
- disaster, catastrophe (unless quoting)

### Perspective Balance

For each controversial topic:
- Are multiple viewpoints presented?
- Is attribution equal across perspectives?
- Is any viewpoint given more favorable framing?

### Attribution Quality

- Are claims attributed to specific sources?
- Are uncertainty markers used appropriately?
- Is opinion clearly separated from fact?

## Remediation

If issues found:
1. Apply specific fixes from Arbiter ruling
2. Re-run affected sections through neutrality check
3. Update briefing files
4. Document changes made

## Write Audit Report

Save to `<briefing-dir>/audit-neutrality.md`:
```markdown
# Neutrality Audit - YYYY-MM-DD

## Summary
- Issues found: X
- Critical: Y
- Resolved: Z
- Status: PASS/FAIL

## Debate Record

### Critic Findings
[Full critic output]

### Defender Response
[Full defender output]

### Arbiter Ruling
[Full arbiter output]

## Changes Made
1. [Change 1]
2. [Change 2]
```

## Gate 6 Criteria

Neutrality audit passes when:
- All critical issues resolved
- No verdict language remains
- No advocacy framing remains
- Perspectives balanced on controversies
- Proper attribution throughout
