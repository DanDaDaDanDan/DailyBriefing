# /audit-completeness - Coverage Verification

Verifies complete and proportional coverage across all interest axes.

## Usage

```
/audit-completeness <briefing-dir>
```

## Checks Performed

### 1. Axis Coverage

For each interest axis:
- Count stories gathered vs stories included in briefings
- Verify top-priority stories are covered
- Check word count allocation is proportional

**Target:** Each axis should receive roughly equal coverage unless news volume differs significantly.

### 2. Story Inclusion

Compare gathered content against briefings:
- All high-priority stories should appear in `<briefing-dir>/briefings/detailed.md`
- Top 2-3 stories per axis should appear in `<briefing-dir>/briefings/short.md`
- No significant story should be omitted without reason

### 3. Investigation Integration

For each completed investigation:
- Verify findings are incorporated into briefings
- Check that investigation depth is reflected
- Ensure multiple perspectives from investigation appear

### 4. Source Diversity

For major stories:
- Multiple sources should be cited
- Different perspective sources included
- No over-reliance on single source

### 5. Word Count Verification

| Format | Target | Acceptable Range |
|--------|--------|------------------|
| short.md | 700 words | 500-900 |
| detailed.md | 3,000 words | 2,000-4,000 |
| full.md | No limit | 5,000+ |

## Process

### 1. Load Metrics

```javascript
const metrics = {
  axes: {},
  stories: {
    gathered: 0,
    included: 0,
    highPriority: 0,
    highPriorityIncluded: 0
  },
  investigations: {
    completed: 0,
    integrated: 0
  },
  wordCounts: {
    short: 0,
    detailed: 0,
    full: 0
  }
};
```

### 2. Calculate Coverage

For each axis:
```javascript
axisMetrics = {
  storiesGathered: count,
  storiesIncluded: count,
  wordCount: {
    short: count,
    detailed: count,
    full: count
  },
  percentageOfTotal: percent,
  topStoriesCovered: boolean
}
```

### 3. Identify Gaps

Flag issues:
- Axis with < 20% of expected coverage
- High-priority story not included
- Investigation not integrated
- Word count outside acceptable range

## Output

Write `<briefing-dir>/audit-completeness.md`:

```markdown
# Completeness Audit - YYYY-MM-DD

## Coverage Summary

| Axis | Gathered | Included | Coverage % | Word Count |
|------|----------|----------|------------|------------|
| axis-1 | 12 | 8 | 67% | 1,200 |
| axis-2 | 10 | 7 | 70% | 1,100 |
| axis-3 | 8 | 6 | 75% | 900 |

## Word Count Verification

| Format | Target | Actual | Status |
|--------|--------|--------|--------|
| short.md | 500-900 | 750 | ✓ |
| detailed.md | 2,000-4,000 | 3,200 | ✓ |
| full.md | 5,000+ | 8,500 | ✓ |

## Story Coverage

### High Priority Stories
| Story | Axis | Included | Notes |
|-------|------|----------|-------|
| STY001 | axis-1 | ✓ | Lead story |
| STY005 | axis-2 | ✓ | Investigated |
| STY008 | axis-3 | ✗ | Minor omission |

### Investigations Integrated
| ID | Finding | Integrated | Location |
|----|---------|------------|----------|
| INV001 | Topic | ✓ | detailed.md |
| INV002 | Topic | ✓ | detailed.md |

## Issues Found

### Critical
- [None / List of critical gaps]

### Warnings
- [List of minor issues]

## Determination

**Status:** PASS / FAIL
**Notes:** [Explanation]
```

## Remediation

If gaps found:
1. Add missing high-priority stories
2. Rebalance axis coverage if needed
3. Integrate missing investigation findings
4. Adjust word counts if outside range

## Gate 7 Criteria (Combined with Article gate)

Completeness passes when:
- All axes have proportional coverage (within 20% of each other)
- All high-priority stories included
- All completed investigations integrated
- Word counts within acceptable ranges
- No critical omissions
