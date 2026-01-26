# /plan - Search Strategy Planning

Transforms lightweight interest config into actionable search strategies.

## Usage

```
/plan <briefing-dir>
```

## Purpose

The user's `interests.md` expresses curiosity in plain language. This skill:
1. Interprets what the user cares about
2. Determines relevant topics and keywords
3. Identifies appropriate source types
4. Considers geographic/language factors
5. Produces an actionable search plan

## Process

### 1. Read Interest Config

Load `briefings/config/interests.md` and parse each section:
- Extract axis name from `##` headings
- Understand the user's context and perspective
- Identify explicit and implicit interests

### 2. Analyze Each Axis

For each interest axis, determine:

**Topics & Keywords**
- Core topics explicitly mentioned
- Related subtopics the user would want
- Current events intersecting their interests
- Generate 4-8 specific search queries

**Source Strategy**
- News outlets (general, specialized, trade publications)
- Official sources (government, regulatory, institutional)
- Social/community sources (if relevant)
- Consider source credibility and perspective diversity

**Geographic/Language Focus**
- Primary geographic focus
- Regional vs national vs international scope
- Language of sources (if non-English relevant)

### 3. Write plan.md

Create `plan.md` in the briefing directory:

```markdown
# Search Plan - YYYY-MM-DD

## [Axis Name]

**Context:**
[1-2 sentence summary of what user cares about and why]

**Topics to Search:**
- [Specific topic 1]
- [Specific topic 2]
- [Related subtopic]
- [Current events angle]

**Source Strategy:**
- News: [types of outlets to query]
- Official: [government/institutional sources]
- Social: [community sources if relevant]

**Geographic Focus:**
- [Primary region/scope]
- [Language considerations]

**Search Queries:**
- "[specific query 1]"
- "[specific query 2]"
- "[specific query 3]"
- "[specific query 4]"

---

## [Next Axis]
...
```

### 4. Update State

```javascript
state.phase = 'PLAN';
state.currentGate = 1;
state.axes = ['axis-1', 'axis-2', ...];  // Extracted from config
state.axesConfig = [
  { name: 'Display Name', id: 'axis-id' },
  ...
];
state.updatedAt = new Date().toISOString();
```

## Intelligence Applied

The plan phase adds value by:
- Filling in relevant subtopics not explicitly mentioned
- Identifying authoritative sources for the domain
- Generating effective search queries
- Adapting to current events context
- Considering what's actually newsworthy right now

## Gate 1 Criteria

Plan passes when:
- `plan.md` exists in the briefing directory
- Each axis from config has a corresponding section
- Each section includes: context, topics, source strategy, queries
- Queries are specific and actionable (not just single words)
