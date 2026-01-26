# /investigate - Deep Investigation

Performs in-depth research on flagged findings. Runs as parallel subagent per finding.

## Usage

```
/investigate <finding-id> <briefing-dir>
```

## Process

### 1. Load Finding Details

Read from `state.json.flaggedFindings` to get:
- Finding title and context
- Original story reference
- Suggested investigation angles
- Related axis

### 2. Deep Research

Use research tools to investigate thoroughly:

**Comprehensive Research (mcp-openai.deep_research)**
```javascript
mcp_openai.deep_research({
  query: "[finding title + context]",
  timeout_minutes: 10
})
```

**Multi-Source Aggregation (mcp-xai.research)**
```javascript
mcp_xai.research({
  prompt: "[specific angle to investigate]",
  sources: ["web", "news", "x"],
  max_results_per_source: 15
})
```

**Official Documents (mcp-osint.osint_get)**
```javascript
mcp_osint.osint_search({
  query: "[official source query]",
  source: "specific_source",  // e.g., "sec_edgar", "fred"
  limit: 10
})
```

### 3. Multi-Angle Analysis

Investigate from multiple perspectives:
- **Official position**: Government/institutional statements
- **Industry reaction**: Business and sector response
- **Critical perspective**: Opposition or skeptical views
- **Historical context**: How this compares to past events
- **Implications**: What this means going forward

### 4. Write Findings

Create `investigations/INV###/findings.md`:

```markdown
# Investigation: [Finding Title]

**Investigation ID:** INV001
**Date:** YYYY-MM-DD
**Original Finding:** [finding-id]
**Axis:** [axis-name]

---

## Background

[2-3 paragraphs providing context and history relevant to understanding this story. What happened before? Why does this matter?]

## Key Developments

### [Development 1]
[Detailed coverage with attribution]

According to [source], ...
[Other source] reported that ...

### [Development 2]
[Continue with additional developments]

## Multiple Perspectives

### [Perspective 1 - e.g., Government Position]
[What officials/institutions say, with direct attribution]

### [Perspective 2 - e.g., Industry Response]
[What affected parties say, with direct attribution]

### [Perspective 3 - e.g., Critical View]
[What critics or opposition says, with direct attribution]

## Analysis

[Synthesis of findings - what the implications are, without editorializing. Use phrases like "analysts suggest" or "this could mean" rather than definitive statements]

## Timeline

| Date | Event |
|------|-------|
| YYYY-MM-DD | Event 1 |
| YYYY-MM-DD | Event 2 |

## Sources

- [S001] [Source Name](url) - [brief description]
- [S002] [Source Name](url) - [brief description]
- ...
```

### 5. Update State

Mark finding as investigated:
```javascript
const finding = state.flaggedFindings.find(f => f.id === findingId);
finding.investigated = true;
finding.investigationId = "INV001";
state.updatedAt = new Date().toISOString();
```

## Neutrality Requirements

**DO:**
- Use attribution: "According to [source]...", "[Organization] stated..."
- Include uncertainty markers: "reportedly", "sources say", "allegedly"
- Present opposing viewpoints with equal treatment
- Provide context without editorializing

**DON'T:**
- Use verdict language: confirmed, debunked, proven, false
- Use advocacy framing: must, should, need to, clearly
- Draw definitive conclusions
- Omit perspectives that complicate the narrative

## Gate 4 Criteria

Investigation passes when:
- `investigations/INV###/findings.md` exists
- Finding includes: background, developments, multiple perspectives
- All claims have source attribution
- Neutrality standards maintained
- `state.json` updated with investigated=true
