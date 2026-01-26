# /gather - News Gathering

Gathers news for a single interest axis using MCP tools. Runs as parallel subagent.

## Usage

```
/gather <axis-id> <briefing-dir>
```

## Process

### 1. Load Search Plan

Read `plan.md` and extract the strategy for this axis:
- Topics to search
- Source strategy
- Geographic/language considerations
- Pre-generated search queries

### 2. Execute Searches

Use the MCP tools based on the plan's source strategy:

**General News (mcp-xai.news_search)**
```javascript
mcp_xai.news_search({
  query: "[query from plan]",
  max_results: 20,
  from_date: "YYYY-MM-DD",  // Yesterday
  to_date: "YYYY-MM-DD"     // Today
})
```

**Multi-Source Research (mcp-xai.research)**
```javascript
mcp_xai.research({
  prompt: "[topic from plan]",
  sources: ["web", "news", "x"],
  max_results_per_source: 10
})
```

**Social/Breaking News (mcp-xai.x_search)**
```javascript
mcp_xai.x_search({
  query: "[query from plan]",
  mode: "Top",
  max_results: 15,
  from_date: "YYYY-MM-DD"
})
```

**Official Sources (mcp-osint.osint_search)**
```javascript
mcp_osint.osint_search({
  query: "[official topic from plan]",
  limit: 10
})
```

### 3. Deduplicate and Structure

Merge results:
1. Compare headlines for similarity (same event = same story)
2. Group related coverage
3. Keep all unique perspectives
4. Assign story IDs (STY001, STY002, ...)

Structure each story:
```javascript
{
  id: "STY001",
  axis: "axis-id",
  headline: "Story headline",
  summary: "2-3 sentence neutral summary",
  sources: [
    { name: "Source Name", url: "https://...", timestamp: "ISO date" }
  ],
  relevance: "high|medium|low",
  category: "politics|economy|technology|policy|other",
  requiresInvestigation: false,
  perspectives: ["government", "industry", "critics"],
  capturedAt: "ISO timestamp"
}
```

### 4. Write Output

Write to `<briefing-dir>/topics/[axis-id].md`:
```markdown
# [Axis Name] - News Summary
Date: YYYY-MM-DD
Gathering completed: [timestamp]
Stories found: [count]

## Top Stories

### [STY001] Headline Here
**Relevance:** High | **Category:** Politics
**Sources:** Source1, Source2, Source3

[2-3 paragraph neutral summary with key facts]

**Key Points:**
- Point 1
- Point 2
- Point 3

**Source Links:**
- [Source1](url) - timestamp
- [Source2](url) - timestamp

---

### [STY002] Next Headline
...
```

### 5. Update Registries

Add stories to `stories.json`:
```javascript
const stories = JSON.parse(fs.readFileSync('stories.json'));
stories.stories.push(...newStories);
stories.lastUpdated = new Date().toISOString();
fs.writeFileSync('stories.json', JSON.stringify(stories, null, 2));
```

## Neutrality During Gathering

Even while gathering:
- Include multiple perspectives on controversies
- Note when content is opinion vs news
- Don't pre-filter based on viewpoint
- Capture the full range of coverage

## Error Handling

If a search fails:
1. Log the error
2. Continue with other searches
3. Note incomplete coverage in output
4. Don't fail the entire axis

## Gate 2 Criteria

Gather passes when:
- `topics/[axis-id].md` exists and is non-empty
- At least 3-5 stories gathered (warn if fewer)
- `stories.json` updated with new stories
- No critical errors
