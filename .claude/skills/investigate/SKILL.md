# /investigate - Deep Investigation

Performs in-depth research on flagged findings. Runs as parallel subagent per finding.

## Usage

```
/investigate <finding-id> <briefing-dir>
```

## Process

1. Load finding details from `state.json`
2. Use deep research tools:
   - `mcp-openai.deep_research` - Comprehensive investigation
   - `mcp-xai.research` - Multi-source aggregation
   - `mcp-osint.osint_get` - Official documents
3. Analyze from multiple angles
4. Write findings to `investigations/INV###/findings.md`

## Output Format

```markdown
# Investigation: [Title]

## Background
[Context and history]

## Key Developments
[What happened, multiple perspectives]

## Analysis
[Implications, without editorializing]

## Sources
[Captured source references]
```

## Neutrality

- Present all perspectives fairly
- Use attribution ("according to...", "X stated...")
- Avoid verdict language
- Separate fact from opinion
