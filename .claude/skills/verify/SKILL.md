# /verify - Source Verification & Fact Validation

Captures sources, verifies with SHA256 hashes, and validates all quantitative claims using GPT.

## Usage

```
/verify <briefing-dir>
```

## Core Principle

**Claude orchestrates; GPT validates.** All fact-checking comparisons are performed by GPT with structured output. Claude never compares values using its own judgment.

## Process

### 1. Collect Source URLs

Read from `stories.json` and investigation findings to get all unique source URLs.

### 2. Capture Each Source

For each unique URL:

```javascript
mcp_osint.osint_get({
  target: url,
  output_path: `evidence/S###/`
})
```

This saves:
- `raw.html` - Original HTML content
- `content.md` - Extracted markdown text
- `metadata.json` - URL, fetch timestamp, headers, SHA256 hash

**REQUIREMENT:** After each `osint_get` call, confirm that `evidence/S###/metadata.json` contains a valid `sha256` field. If `osint_get` does not populate the SHA256 hash (e.g., due to a fetch error or binary content), compute it manually from `raw.html` and write it into `metadata.json`. Every captured source MUST have a SHA256 hash for the evidence chain to be valid.

### 3. Extract Claims Using GPT

Read all topic files (`topics/*.md`) and use GPT to extract quantitative claims:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Extract all quantitative claims from this content. Include dates, numbers, rates, percentages, schedules, and specific factual assertions.

Content:
${topicFileContent}`,
  json_schema: {
    name: "claim_extraction",
    schema: {
      type: "object",
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim_text: { type: "string" },
              claim_type: { type: "string", enum: ["date", "number", "rate", "percentage", "schedule", "policy", "other"] },
              value: { type: "string" },
              context: { type: "string" },
              source_cited: { type: "string" }
            },
            required: ["claim_text", "claim_type", "value", "context"]
          }
        }
      },
      required: ["claims"]
    }
  },
  reasoning_effort: "low"
})
```

### 4. Validate Claims Against Sources

For each extracted claim, use GPT to verify against captured source:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Verify this claim against the source content.

CLAIM: "${claim.claim_text}"
CLAIMED VALUE: "${claim.value}"

SOURCE CONTENT:
${evidenceContent}`,
  json_schema: {
    name: "claim_validation",
    schema: {
      type: "object",
      properties: {
        found_in_source: { type: "boolean" },
        source_value: { type: "string" },
        source_quote: { type: "string" },
        matches: { type: "boolean" },
        discrepancy: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["found_in_source", "matches", "confidence"]
    }
  },
  reasoning_effort: "low"
})
```

### 5. Independent Verification for Critical Claims

For critical claims (rates, official dates, policy positions), use GPT web search:

```javascript
mcp_openai.web_search({
  query: "[specific claim, e.g., 'federal funds rate January 2026']",
  model: "gpt-5.2",
  include_sources: true
})
```

**When to use:**
- Interest rates and monetary policy
- Meeting dates and schedules
- Legislative status
- Economic indicators

### 6. Temporal Currency Check

For time-sensitive domains, verify data is current:

| Domain | Max Age |
|--------|---------|
| Monetary policy | 7 days |
| Economic data | 30 days |
| Legislative status | 7 days |
| Breaking news | 24 hours |

If source is older than threshold, use GPT web_search to find current data.

### 7. Apply Corrections

For any claim where GPT found a discrepancy:
1. Use the GPT-extracted correct value
2. Edit the topic file with the corrected value
3. Add `[CORRECTED]` marker
4. Log the correction

### 8. Generate Fact-Check Report

Write `<briefing-dir>/fact-check.md`:

```markdown
# Fact Validation Report - YYYY-MM-DD

## Summary
- Sources captured: [count]
- Claims extracted: [count]
- Verified: [count]
- Corrections made: [count]
- Unverifiable: [count]

## Verified Claims

| Claim | Source | Status | Confidence |
|-------|--------|--------|------------|
| FOMC meets Jan 27-28 | S002 | MATCH | High |

## Source Integrity

| ID | Source | URL | SHA256 | Captured | Status |
|----|--------|-----|--------|----------|--------|
| S001 | [Name] | [url] | [hash] | [timestamp] | Verified |
| S002 | [Name] | [url] | [hash] | [timestamp] | Verified |

## Corrections Made

| Original | Corrected To | Source |
|----------|--------------|--------|
| [wrong] | [right] | S### |

## Unverifiable Claims

| Claim | Reason | Action |
|-------|--------|--------|
| [claim] | Not in source | Removed |

## Partially Verified Claims

| Claim | Status | Fallback Source | Confidence |
|-------|--------|-----------------|------------|
| [claim] | Partial | [fallback source used] | medium |
| [claim] | Unverifiable | N/A | N/A |
```

### 9. Update State

```javascript
state.phase = 'VERIFY';
state.currentGate = 5;
state.factCheckComplete = true;
state.updatedAt = new Date().toISOString();
```

## Evidence Structure

```
<briefing-dir>/evidence/S001/
├── raw.html        # Original HTML
├── content.md      # Extracted text
└── metadata.json   # URL, hash, timestamp
```

## Verification Fallback Strategy

When the primary source is unavailable, paywalled, or returns incomplete data, follow this escalation chain:

**Primary: OpenAI web_search with specific authoritative query**
```javascript
mcp_openai.web_search({
  query: "federal funds rate January 2026 site:federalreserve.gov",
  include_sources: true
})
```
Target the most authoritative domain directly. Confidence: **high** (if the authoritative source responds).

**Fallback 1: General news search with broader query**
```javascript
mcp_openai.web_search({
  query: "federal funds rate January 2026",
  include_sources: true
})
```
Broaden the query to include reputable news coverage. Mark confidence as **medium** in the fact-check report. Require at least two independent sources agreeing.

**Fallback 2: Use topic file source if trusted**
If the claim was originally sourced from a recognized authoritative outlet (e.g., Reuters, AP, Bloomberg, official government site) during the GATHER phase, the topic file's stated value may be used. Mark confidence as **low** and note that independent verification was not achieved.

**Fallback 3: Mark as unverifiable**
If none of the above produce a reliable verification, mark the claim as unverifiable in `fact-check.md` under the "Partially Verified Claims" table. Note the claim in the briefing with appropriate hedging language (e.g., "according to unverified reports") or omit it entirely if the claim is central to the story's accuracy.

## Gate 5 Criteria

Verification passes when:
- All cited sources captured with SHA256 hashes
- At least 80% of sources successfully captured
- All quantitative claims extracted and validated by GPT
- `fact-check.md` exists with validation results
- All discrepancies corrected
- No unresolved source conflicts
