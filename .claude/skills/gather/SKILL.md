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
    { name: "Source Name", url: "https://...", timestamp: "ISO date", fetched: true }
  ],
  relevance: "high|medium|low",
  category: "politics|economy|technology|policy|other",
  requiresInvestigation: false,
  perspectives: ["government", "industry", "critics"],
  capturedAt: "ISO timestamp"
}
```

### 3a. Fetch Sources for Quantitative Stories

For any story containing quantitative claims (dates, rates, numbers, percentages):

**Step 1: Fetch the actual source**
```javascript
mcp_osint.osint_get({
  target: sourceUrl,
  output_path: `evidence/S###/`
})
```

**Step 2: Use GPT to extract facts with structured output**

This is CRITICAL - do NOT summarize quantitative data yourself. Use GPT with JSON schema to extract facts directly from the source:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Extract all quantitative facts from this source content. Only include facts explicitly stated in the text - do not infer or calculate.

Source URL: ${sourceUrl}
Source Content:
${sourceContent}`,
  json_schema: {
    name: "fact_extraction",
    schema: {
      type: "object",
      properties: {
        dates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              event: { type: "string", description: "What the date refers to" },
              date: { type: "string", description: "The date value" },
              verbatim: { type: "string", description: "Exact quote from source" }
            },
            required: ["event", "date", "verbatim"]
          }
        },
        numbers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string", description: "What is being measured" },
              value: { type: "string", description: "The numeric value with units" },
              verbatim: { type: "string", description: "Exact quote from source" }
            },
            required: ["metric", "value", "verbatim"]
          }
        },
        rates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rate_type: { type: "string", description: "Type of rate" },
              value: { type: "string", description: "The rate value" },
              effective_date: { type: "string", description: "When this rate is/was effective" },
              verbatim: { type: "string", description: "Exact quote from source" }
            },
            required: ["rate_type", "value", "verbatim"]
          }
        },
        schedules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              event: { type: "string" },
              schedule: { type: "string" },
              verbatim: { type: "string" }
            },
            required: ["event", "schedule", "verbatim"]
          }
        }
      },
      required: ["dates", "numbers", "rates", "schedules"]
    }
  },
  reasoning_effort: "low"
})
```

**Step 3: Use only GPT-extracted facts in your summary**

When writing the story summary, ONLY use facts that appear in the GPT extraction output. Do not add any quantitative data from your own knowledge.

### Quantitative Claims Requirement

**CRITICAL RULE:** Claude must NEVER generate quantitative claims (dates, numbers, rates, percentages) from its own knowledge. All quantitative data must come from:
1. GPT structured extraction (preferred for accuracy)
2. Direct verbatim quotes from fetched sources

**Required format for stories with quantitative claims:**
```markdown
### [Story Title]
- **Source:** [publication name]
- **URL:** [actual URL fetched]
- **Fetched:** [ISO timestamp]
- **Extracted Facts (via GPT):**
  - [fact 1 with verbatim]
  - [fact 2 with verbatim]
- **Summary:** [summary using ONLY the extracted facts above]
```

**FORBIDDEN:** Using Claude's training data for any specific numbers, dates, rates, or schedules. If GPT extraction fails or returns empty, note "No quantitative data extracted" rather than filling in from memory.

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
