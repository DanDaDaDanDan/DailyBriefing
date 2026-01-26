# /plan - Search Strategy Planning

Transforms lightweight interest config into actionable search strategies.

## Usage

```
/plan <briefing-dir>
```

## Process

1. Read `briefings/config/interests.md`
2. For each interest axis, determine:
   - Topics and keywords to search
   - Relevant source types (news, official, social)
   - Geographic/language considerations
   - Effective search queries
3. Write `plan.md` with strategies

## Output Format

```markdown
# Search Plan - YYYY-MM-DD

## [Axis Name]

**Context:** [What this axis covers]

**Topics:** [Keywords and subjects to search]

**Sources:** [Types of sources to query]

**Queries:** [Specific search strings]
```

## Gate 1 Criteria

- `plan.md` exists
- Each config axis has a corresponding plan section
- Each section has topics, sources, and queries
