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

## Gate 5 Criteria

Verification passes when:
- All cited sources have capture attempted
- `evidence/S###/` folders exist for each source
- SHA256 hashes recorded in `sources.json`
- Failed captures logged with reasons
- At least 80% of sources successfully captured
