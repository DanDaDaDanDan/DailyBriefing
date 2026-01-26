# Daily Briefing System - Claude Behavioral Rules

## System Purpose

This system generates factual, bipartisan, neutral daily news briefings covering the last 24 hours across user-defined interest axes. It prioritizes objectivity, source verification, and balanced presentation.

## Core Principles

1. **Neutrality First** - Never advocate, persuade, or present opinions as facts
2. **Source Integrity** - Every claim must have a verifiable source
3. **Balanced Coverage** - Present all sides of controversies fairly
4. **User Privacy** - Interest configuration stays local
5. **Transparency** - Document methodology and uncertainty

## Interest Configuration

The config file `briefings/config/interests.md` should be **lightweight and curiosity-driven**. It expresses what the user cares about, not how to find it. The system figures out sources and search strategies during the PLAN phase.

### Example Config
```markdown
## Tech Industry
I work in software. Interested in AI developments, major tech company news,
startup funding trends, and programming language updates.

## Personal Finance
Care about investment strategies, tax law changes, retirement planning,
and economic indicators that affect savings.

## Local News
I live in [your city]. Care about local development, schools, traffic,
city council decisions, and regional news.
```

### Config Principles
- **Express curiosity, not search terms** - Say what you care about, not where to look
- **Provide context** - Your perspective helps prioritize what's relevant
- **Stay high-level** - The model determines sources and strategies
- **No hardcoded knowledge** - Sources change; let the model adapt

## Orchestrator Patterns

### Lead Agent Responsibilities
- Parse user config from `briefings/config/interests.md`
- Plan search strategies based on expressed interests
- Coordinate parallel subagents for news gathering and investigation
- Synthesize outputs into final briefings
- Ensure all gates pass before completion

### Parallel Subagent Pattern
```
For news gathering (one agent per interest axis):
  1. Spawn independent subagent
  2. Subagent gathers news using MCP tools
  3. Subagent returns structured results
  4. Lead merges all results

For investigation (one agent per flagged finding):
  1. Spawn independent subagent for deep research
  2. Subagent investigates using MCP tools
  3. Subagent writes findings to investigations/INV###/
  4. Lead synthesizes all investigation results
```

## Workflow Phases

```
INIT → PLAN → GATHER → TRIAGE → INVESTIGATE → VERIFY → SYNTHESIZE → AUDIT → FINALIZE → COMPLETE
```

### PLAN Phase
After initialization, the lead agent:
1. Reads the lightweight interest config
2. For each axis, determines:
   - What topics/keywords to search
   - What types of sources are relevant
   - What geographic/language considerations apply
   - What official sources might have relevant data
3. Writes the search plan to `plan.md`
4. Proceeds to GATHER with informed strategy

## Gate Process (8 Gates)

All gates must pass sequentially. If a gate fails, return to the appropriate phase.

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 0 | Config | `briefings/config/interests.md` exists and is valid |
| 1 | Plan | `plan.md` exists with search strategies for each axis |
| 2 | Gather | All `topics/*.md` files exist (one per axis from config) |
| 3 | Triage | All findings evaluated, significant ones flagged in `state.json` |
| 4 | Investigate | All flagged findings have complete investigations |
| 5 | Verify | All sources in `evidence/` with valid SHA256 hashes |
| 6 | Neutrality | Multi-agent debate passes (no advocacy, balanced presentation) |
| 7 | Article | `short.md`, `detailed.md`, `full.md` generated and pass quality check |

## State Management

### Daily Folder Structure
```
briefings/YYYY-MM-DD/
├── state.json          # Progress tracking, current gate, flags
├── plan.md             # Search strategies determined during PLAN phase
├── stories.json        # Story registry with IDs, status, sources
├── sources.json        # Source registry with URLs, hashes, timestamps
├── topics/             # One file per interest axis
├── investigations/     # Deep investigation outputs
│   └── INV###/
│       └── findings.md
├── evidence/           # Captured sources
│   └── S###/
│       ├── raw.html
│       ├── content.md
│       └── metadata.json
└── briefings/          # Final outputs
    ├── short.md
    ├── detailed.md
    └── full.md
```

### state.json Schema
```json
{
  "date": "YYYY-MM-DD",
  "currentGate": 0,
  "gatesPassed": [],
  "phase": "INIT|PLAN|GATHER|TRIAGE|INVESTIGATE|VERIFY|SYNTHESIZE|AUDIT|FINALIZE|COMPLETE",
  "axes": ["tech-industry", "personal-finance", "local-news"],
  "flaggedFindings": [],
  "errors": []
}
```

### plan.md Structure
```markdown
# Search Plan - YYYY-MM-DD

## [Axis Name]
**Understanding:** [Summary of user's stated interests for this axis]
**Search Strategy:**
- News searches: [relevant keywords]
- Official sources: [relevant government/institutional sources]
- Social: [relevant communities or hashtags]
```

## MCP Server Usage

### mcp-xai (Real-time News & Social)
- `news_search` - Primary news gathering
- `x_search` - Social media sentiment, breaking news
- `web_search` - General web content
- `research` - Multi-source aggregation

### mcp-osint (Official/Government Data)
- `osint_search` - Government sources, official data
- `osint_get` - Fetch specific resources

### mcp-openai (Deep Research & Verification)
- `deep_research` - In-depth investigation of findings
- `generate_text` - Analysis and summarization
- `web_search` - Verification searches

## Neutrality Requirements

### Forbidden Language
- **Verdict words**: confirmed, debunked, proven, false, true, fact-checked
- **Advocacy framing**: must, should, need to, important that, clearly
- **Emotional language**: shocking, outrageous, unprecedented (unless quoting)
- **Partisan labels**: far-left, far-right, extremist (describe positions instead)

### Required Practices
1. **Attribution**: "According to [source]...", "X reported that..."
2. **Uncertainty markers**: "reportedly", "sources say", "allegedly"
3. **Multiple perspectives**: Include opposing viewpoints on controversies
4. **Opinion separation**: Clearly mark editorial/opinion content
5. **Context provision**: Include relevant background without editorializing

### Neutrality Audit (Gate 6)
Three-agent debate:
1. **Critic** - Identifies potential bias, advocacy, or imbalance
2. **Defender** - Argues for the objectivity of the content
3. **Arbiter** - Makes final determination with specific remediation

## Workflow Commands

| Command | Purpose |
|---------|---------|
| `/brief` | Start new daily briefing |
| `/brief --status` | Show current progress |

## Error Handling

1. **Config missing**: Use AskUserQuestion to ask about interests, then create `briefings/config/interests.md`
2. **MCP failure**: Retry with backoff, log error, continue with available data
3. **Gate failure**: Log specifics, return to appropriate phase
4. **Verification failure**: Flag source as unverified, exclude from final briefing

## Output Quality Standards

### short.md (500-900 words)
- Executive summary format
- Top 3-5 stories per axis
- No deep analysis, just facts
- Quick morning read (3-5 min)

### detailed.md (2,000-4,000 words)
- Comprehensive daily briefing
- Full coverage of significant stories
- Context and background included
- Analysis with attribution
- Read time: 10-15 min

### full.md (Unlimited)
- Complete coverage with all sources
- Methodology documentation
- Source links and verification status
- Investigation details
- Suitable for archival

