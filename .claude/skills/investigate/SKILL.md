# /investigate - Deep Investigation

Performs in-depth research on flagged findings. Runs as parallel subagent per finding.

## Usage

```
/investigate <finding-id> <briefing-dir>
```

## Complexity Scoring

Before beginning the investigation, assess the finding's complexity level. This determines which tools and how much depth to apply.

**HIGH Complexity:**
- Economic/monetary policy relationships (e.g., rate decisions and their market effects)
- Polling methodology analysis (e.g., conflicting polls, sampling questions)
- Market causation claims (e.g., "X caused Y to drop")
- Policy implications requiring cross-domain understanding (e.g., trade policy effects on supply chains)
- Multi-party geopolitical situations with competing narratives

**MEDIUM Complexity:**
- Standard news events with multiple angles (e.g., major legislation passing)
- Industry developments with clear stakeholders (e.g., merger announcements)
- Events with some contested facts but clear primary sources

**LOW Complexity:**
- Straightforward factual stories with authoritative sources (e.g., official appointments)
- Events with a single clear narrative and no significant disputes
- Updates to ongoing stories where the baseline context is well-established

### Tool Selection by Complexity

| Complexity | Primary Tool | Rationale |
|------------|-------------|-----------|
| HIGH | `mcp_openai.deep_research` (timeout_minutes: 10) | Requires multi-source synthesis and reasoning across domains |
| MEDIUM | `mcp_xai.research` + `mcp_openai.web_search` | Sufficient depth from aggregated search plus fact verification |
| LOW | `mcp_openai.web_search` | Simple verification against authoritative sources |

**HIGH complexity findings MUST use `mcp_openai.deep_research`** rather than `mcp_xai.research` as the primary investigation tool. XAI research is faster but lacks the depth needed for nuanced economic, policy, or methodological analysis. Use XAI as a supplementary source for social signals and additional perspectives, not as the primary investigative engine for complex topics.

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

Create `<briefing-dir>/investigations/INV###/findings.md`:

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
