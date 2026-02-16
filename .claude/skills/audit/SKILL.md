# /audit - Neutrality & Completeness Check

Single-pass audit verifying briefing neutrality and coverage completeness.

## Usage

```
/audit <briefing-dir>
```

## Process

### 1. Load Briefings

Read all briefing files:
- `<briefing-dir>/briefings/short.md`
- `<briefing-dir>/briefings/detailed.md`
- `<briefing-dir>/briefings/full.md`

### 2. Neutrality Check

Scan for forbidden language patterns:

**Verdict Language (FAIL if found):**
- confirmed, debunked, proven, disproven
- false, true, fact, lie
- fact-checked, verified (as verdicts)

**Advocacy Framing (FAIL if found):**
- must, should, need to, ought to
- important that, crucial that, essential
- clearly, obviously, undoubtedly

**Emotional Language (FAIL if found):**
- shocking, outrageous, appalling
- unprecedented (unless factually accurate)
- disaster, catastrophe (unless quoting)

**Perspective Balance:**
For each controversial topic:
- Are multiple viewpoints presented?
- Is attribution equal across perspectives?
- Is any viewpoint given more favorable framing?

### Forbidden Language Exceptions

The following are explicit exceptions to the forbidden language rules. When these patterns are detected, they should NOT be flagged as violations:

1. **Legal/regulatory requirement language:** Phrases like "employers must inform employees", "companies are required to comply", or "the law requires disclosure" are acceptable when they describe objectively factual legal obligations. The word "must" in a regulatory context is a statement of legal fact, not advocacy.

2. **Direct quotes containing forbidden words:** If a source is directly quoted and the quote contains forbidden language (e.g., a politician saying "we must act"), the quote is acceptable as long as it is properly attributed with quotation marks and source citation. The audit should verify the attribution exists, not flag the word.

3. **How to document exceptions in audit.md:**
   ```markdown
   ### Language Exceptions Applied
   | Location | Text | Rule | Exception Reason |
   |----------|------|------|------------------|
   | detailed.md:55 | "employers must file" | Advocacy ("must") | Legal requirement language |
   | detailed.md:102 | "we must act now" - Sen. X | Advocacy ("must") | Direct quote, attributed |
   ```

If a flagged term does not fall into one of these exception categories, it remains a violation and must be corrected.

### 3. Completeness Check

**Axis Coverage:**
- Count stories gathered vs included per axis
- Verify each axis has proportional coverage (within 20%)
- Check that top-priority stories are included

**Word Count Verification:**

| Format | Target Range |
|--------|--------------|
| short.md | 500-900 words |
| detailed.md | 2,000-4,000 words |
| full.md | 5,000+ words |

**Investigation Integration:**
- All completed investigations should appear in detailed.md
- Investigation findings should be reflected in coverage

### 4. Generate Audit Report

Write `<briefing-dir>/audit.md`:

```markdown
# Audit Report - YYYY-MM-DD

## Summary
- Status: PASS / FAIL
- Neutrality issues: [count]
- Completeness issues: [count]

## Neutrality Check

### Language Violations
| Location | Text | Violation | Action |
|----------|------|-----------|--------|
| detailed.md:42 | "clearly shows" | Advocacy | Remove "clearly" |

### Perspective Balance
| Topic | Perspectives Found | Balanced |
|-------|-------------------|----------|
| [topic] | Gov, Industry, Critics | Yes |

## Completeness Check

### Coverage by Axis
| Axis | Stories | Included | Coverage |
|------|---------|----------|----------|
| tech | 12 | 8 | 67% |

### Word Counts
| Format | Target | Actual | Status |
|--------|--------|--------|--------|
| short.md | 500-900 | 750 | OK |
| detailed.md | 2,000-4,000 | 3,200 | OK |
| full.md | 5,000+ | 8,500 | OK |

## Required Fixes
1. [Specific fix needed]
2. [Specific fix needed]
```

### 5. Apply Fixes

If issues found:
1. Remove forbidden language
2. Add missing perspectives where needed
3. Rebalance coverage if axis is under-represented
4. Re-check after fixes

### 6. Update State

```javascript
state.phase = 'AUDIT';
state.currentGate = 6;
state.auditPassed = true;
state.updatedAt = new Date().toISOString();
```

## Gate 6 Criteria

Audit passes when:
- No forbidden language remains
- No advocacy framing remains
- All controversial topics have multiple perspectives
- All axes have proportional coverage (within 20%)
- All high-priority stories included
- Word counts within acceptable ranges
- `audit.md` exists with results
