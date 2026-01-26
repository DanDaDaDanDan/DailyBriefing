# /gather - News Gathering

Gathers news for a single interest axis. Runs as parallel subagent.

## Usage

```
/gather <axis-id> <briefing-dir>
```

## Process

1. Load search strategy from `plan.md` for this axis
2. Execute searches using MCP tools:
   - `mcp-xai.news_search` - General news
   - `mcp-xai.research` - Multi-source aggregation
   - `mcp-xai.x_search` - Social/breaking news
   - `mcp-osint.osint_search` - Official sources
3. Deduplicate and structure stories
4. Write to `topics/<axis-id>.md`
5. Update `stories.json`

## Output

Each story includes: headline, summary, sources with URLs, relevance rating, category.

## Neutrality

- Include multiple perspectives on controversies
- Don't pre-filter by viewpoint
- Note opinion vs news content
