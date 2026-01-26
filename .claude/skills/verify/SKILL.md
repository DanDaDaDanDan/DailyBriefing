# /verify - Source Verification

Captures and verifies sources with SHA256 hashes for integrity.

## Usage

```
/verify <briefing-dir>
```

## Process

1. Collect all URLs from `stories.json`
2. For each source:
   - Fetch content using `mcp-osint.osint_get`
   - Save to `evidence/S###/` (raw.html, content.md, metadata.json)
   - Generate SHA256 hash
3. Update `sources.json` with verification status

## Verification

```bash
node scripts/verify-source.js <source-dir>
```

## Gate 5 Criteria

- All cited sources have evidence captured
- SHA256 hashes recorded
- No critical fetch failures
