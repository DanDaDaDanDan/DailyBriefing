# /verify - Source Verification

Captures and verifies sources with SHA256 hashes for integrity and archival.

## Usage

```
/verify <briefing-dir>
```

## Process

### 1. Collect Source URLs

Read from `stories.json` and investigation findings to get all unique source URLs that need verification.

### 2. Capture Each Source

For each unique URL:

**Fetch Content**
```javascript
mcp_osint.osint_get({
  target: url,
  output_path: `evidence/S###/`
})
```

This saves:
- `raw.html` - Original HTML content
- `content.md` - Extracted markdown text
- `metadata.json` - URL, fetch timestamp, headers

**Generate Hash**
```bash
node scripts/verify-source.js evidence/S###
```

The script:
1. Reads `raw.html`
2. Computes SHA256 hash
3. Adds hash to `metadata.json`
4. Returns verification status

### 3. Evidence Structure

Each captured source gets a folder in `<briefing-dir>/evidence/`:
```
<briefing-dir>/evidence/S001/
├── raw.html        # Original page HTML
├── content.md      # Extracted text content
└── metadata.json   # Verification metadata
```

**metadata.json format:**
```json
{
  "sourceId": "S001",
  "url": "https://example.com/article",
  "capturedAt": "2024-01-15T10:30:00Z",
  "contentHash": "sha256:abc123...",
  "contentLength": 45678,
  "httpStatus": 200,
  "contentType": "text/html",
  "storyReferences": ["STY001", "STY005"]
}
```

### 4. Update Sources Registry

Add verified sources to `sources.json`:
```javascript
{
  "sources": [
    {
      "id": "S001",
      "url": "https://...",
      "name": "Source Name",
      "capturedAt": "ISO timestamp",
      "hash": "sha256:...",
      "verified": true,
      "evidencePath": "evidence/S001/"
    }
  ],
  "lastUpdated": "ISO timestamp",
  "totalSources": 24,
  "verifiedCount": 24,
  "failedCount": 0
}
```

### 5. Handle Failures

If a source can't be captured:
1. Log the error with URL and reason
2. Mark as `verified: false` in registry
3. Add to `state.errors` array
4. Continue with remaining sources
5. Note in final briefing which sources couldn't be verified

```javascript
{
  "id": "S015",
  "url": "https://...",
  "verified": false,
  "error": "HTTP 403 - Access denied",
  "attemptedAt": "ISO timestamp"
}
```

## Verification Script

The `scripts/verify-source.js` script:

```bash
# Verify a single source
node scripts/verify-source.js evidence/S001

# Verify all sources
node scripts/verify-source.js evidence/
```

Output:
```json
{
  "sourceId": "S001",
  "verified": true,
  "hash": "sha256:abc123...",
  "size": 45678
}
```

### 6. GPT Web Search Verification

For critical quantitative claims, use GPT's grounded web search to independently verify:

```javascript
mcp_openai.web_search({
  query: "[specific claim to verify, e.g., 'FOMC meeting dates January 2026']",
  model: "gpt-5.2",
  include_sources: true
})
```

**When to use GPT verification:**
- Interest rates and monetary policy data
- Meeting dates and schedules for official bodies
- Legislative status and bill numbers
- Economic indicators (GDP, unemployment, inflation)
- Any claim where source capture failed

**Record verification results:**
```javascript
{
  "claim": "Fed funds rate is 3.50-3.75%",
  "gpt_verification": {
    "confirmed": true,
    "gpt_result": "The federal funds rate target range is 3.50% to 3.75%",
    "sources_cited": ["federalreserve.gov/..."],
    "verified_at": "ISO timestamp"
  }
}
```

### 7. Cross-Check Content with GPT

After capturing sources, use GPT to verify content accuracy:

```javascript
mcp_openai.generate_text({
  model: "gpt-5.2",
  prompt: `Compare these claims against the source content. For each claim, state whether it is SUPPORTED, CONTRADICTED, or NOT FOUND in the source.

Claims from briefing:
${claimsList}

Source content:
${capturedSourceContent}`,
  json_schema: {
    name: "claim_verification",
    schema: {
      type: "object",
      properties: {
        verifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              status: { type: "string", enum: ["SUPPORTED", "CONTRADICTED", "NOT_FOUND"] },
              source_quote: { type: "string", description: "Exact quote from source if found" },
              correct_value: { type: "string", description: "If contradicted, what the source actually says" }
            },
            required: ["claim", "status"]
          }
        }
      },
      required: ["verifications"]
    }
  },
  reasoning_effort: "low"
})
```

**Verification Checklist:**
- [ ] All dates verified via GPT cross-check
- [ ] All numerical values verified via GPT cross-check
- [ ] All schedules/timelines verified via GPT cross-check
- [ ] Contradicted claims flagged for correction
- [ ] NOT_FOUND claims flagged for additional sourcing

### 8. Temporal Currency Check

For time-sensitive domains, verify data currency:

| Domain | Max Age |
|--------|---------|
| Monetary policy | 7 days |
| Economic data | 30 days |
| Legislative status | 7 days |
| Breaking news | 24 hours |

If source is older than threshold:
1. Use GPT web_search to find current data
2. Capture the updated source
3. Update claims with current values

## Gate 5 Criteria

Verification passes when:
- All cited sources have capture attempted
- `evidence/S###/` folders exist for each source
- SHA256 hashes recorded in `sources.json`
- Failed captures logged with reasons
- At least 80% of sources successfully captured
- All quantitative claims cross-checked against captured sources
- No discrepancies between claims and source content
