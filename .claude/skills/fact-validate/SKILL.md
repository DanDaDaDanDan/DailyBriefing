# /fact-validate - Fact Validation

Validates all quantitative claims against captured sources before synthesis. **Uses GPT (mcp-openai) for all fact extraction and verification to prevent hallucination.**

## Usage

```
/fact-validate <briefing-dir>
```

## Core Principle

**Claude orchestrates; GPT validates.** All fact-checking comparisons are performed by GPT with structured output to ensure accuracy. Claude never compares values using its own judgment.

## Process

### 1. Extract Claims Using GPT

Read all topic files (`topics/*.md`) and use GPT to extract quantitative claims:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Extract all quantitative claims from this briefing content. Include dates, numbers, rates, percentages, schedules, and any specific factual assertions.

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
              claim_text: { type: "string", description: "The exact claim as written" },
              claim_type: { type: "string", enum: ["date", "number", "rate", "percentage", "schedule", "policy", "other"] },
              value: { type: "string", description: "The specific value claimed" },
              context: { type: "string", description: "What this claim is about" },
              source_cited: { type: "string", description: "Source mentioned for this claim, if any" }
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

### 2. Validate Each Claim with GPT

For each extracted claim, use GPT to check against the captured source:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Verify this claim against the source content.

CLAIM: "${claim.claim_text}"
CLAIMED VALUE: "${claim.value}"

SOURCE CONTENT:
${evidenceContent}

Instructions:
1. Search the source for information related to this claim
2. If found, extract the EXACT value from the source
3. Compare the claimed value to the source value
4. Determine if they match exactly`,
  json_schema: {
    name: "claim_validation",
    schema: {
      type: "object",
      properties: {
        found_in_source: { type: "boolean" },
        source_value: { type: "string", description: "Exact value found in source, or null if not found" },
        source_quote: { type: "string", description: "Verbatim quote from source containing the value" },
        matches: { type: "boolean", description: "True if claimed value matches source value exactly" },
        discrepancy: { type: "string", description: "If doesn't match, describe the difference" },
        confidence: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["found_in_source", "matches", "confidence"]
    }
  },
  reasoning_effort: "low"
})
```

### 3. Independent Verification via GPT Web Search

For critical claims (rates, official dates, policy positions), perform independent verification:

```javascript
mcp_openai.web_search({
  query: "[specific verification query, e.g., 'federal funds rate January 2026 Federal Reserve']",
  model: "gpt-5.2",
  include_sources: true
})
```

Compare web search results against the claim. Record any discrepancies.

### 4. Multi-Source Cross-Check

For high-impact claims, require confirmation from 2+ sources:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Compare these sources regarding the claim: "${claim}"

Source 1: ${source1Content}
Source 2: ${source2Content}

Do they agree? If not, what does each say?`,
  json_schema: {
    name: "multi_source_check",
    schema: {
      type: "object",
      properties: {
        sources_agree: { type: "boolean" },
        source1_value: { type: "string" },
        source2_value: { type: "string" },
        conflict_description: { type: "string" },
        recommended_value: { type: "string", description: "If they agree, the value. If not, null." }
      },
      required: ["sources_agree", "source1_value", "source2_value"]
    }
  },
  reasoning_effort: "low"
})
```

**If sources conflict:** Flag for human review rather than choosing one.

### 5. Generate Fact-Check Report

Write `<briefing-dir>/fact-check.md`:

```markdown
# Fact Validation Report - YYYY-MM-DD

## Summary
- Claims extracted: [count]
- Verified (GPT confirmed): [count]
- Corrections made: [count]
- Conflicts requiring review: [count]
- Unverifiable: [count]

## Validation Method
All validations performed by GPT-5.2 with structured output.
Claude orchestrated the process but did not perform value comparisons.

## Verified Claims

| Claim | Source | GPT Validation | Confidence |
|-------|--------|----------------|------------|
| FOMC meets Jan 27-28 | S002 | MATCH | High |
| Fed funds rate 3.50-3.75% | S004 | MATCH | High |

## Corrections Made

### [Correction 1]
- **Original claim:** [wrong value]
- **Source value (per GPT):** [correct value]
- **Source quote:** "[verbatim from GPT extraction]"
- **Corrected in:** [file:line]

## Source Conflicts (Require Review)

| Claim | Source 1 Says | Source 2 Says | Resolution |
|-------|---------------|---------------|------------|
| [claim] | [value] | [value] | FLAGGED FOR REVIEW |

## Unverifiable Claims

| Claim | Reason | Action Taken |
|-------|--------|--------------|
| [claim] | Not found in any source | REMOVED from briefing |
| [claim] | Source capture failed | Web search verification attempted |

## GPT Validation Log

```json
[
  {
    "claim": "FOMC meets January 27-28",
    "source_id": "S002",
    "gpt_found": true,
    "gpt_source_quote": "January 27-28",
    "gpt_match": true,
    "gpt_confidence": "high",
    "validated_at": "2026-01-26T19:00:00Z"
  }
]
```
```

### 6. Apply Corrections

For any claim where GPT found a discrepancy:
1. Use the GPT-extracted correct value
2. Edit the topic file with the corrected value
3. Add `[CORRECTED via GPT validation]` marker
4. Log the correction

### 7. Update State

```javascript
state.phase = 'FACT-VALIDATE';
state.currentGate = 6;
state.factCheckComplete = true;
state.gptValidationsPerformed = claimCount;
state.correctionsApplied = correctionCount;
state.updatedAt = new Date().toISOString();
```

## Gate 6 Criteria

Fact Validation passes when:
- All quantitative claims extracted by GPT
- All claims validated by GPT against captured sources
- Critical claims independently verified via GPT web search
- `fact-check.md` exists with complete GPT validation log
- All discrepancies corrected using GPT-extracted values
- No unresolved source conflicts
- Time-sensitive data verified current via GPT web search
