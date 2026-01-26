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
INIT → PLAN → GATHER → TRIAGE → INVESTIGATE → VERIFY → FACT-VALIDATE → SYNTHESIZE → AUDIT → FINALIZE → COMPLETE
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

### GATHER Phase
Gather news using MCP tools. For quantitative claims, must fetch actual sources and use GPT for fact extraction. See `/gather` skill for details.

### TRIAGE Phase
Evaluate stories and flag for investigation. Includes "Verifiable Facts" category for stories with dates, numbers, rates. See `/triage` skill for details.

### VERIFY Phase
Capture sources with SHA256 hashes. Cross-check claims against sources using GPT. See `/verify` skill for details.

### FACT-VALIDATE Phase (Gate 6)
Final fact-check before synthesis. All quantitative claims validated by GPT against captured sources. Outputs `fact-check.md`. See `/fact-validate` skill for details.

## Gate Process (9 Gates)

All gates must pass sequentially. If a gate fails, return to the appropriate phase.

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 0 | Config | `briefings/config/interests.md` exists and is valid |
| 1 | Plan | `plan.md` exists with search strategies for each axis |
| 2 | Gather | All `topics/*.md` files exist (one per axis from config) |
| 3 | Triage | All findings evaluated, significant ones flagged in `state.json` |
| 4 | Investigate | All flagged findings have complete investigations |
| 5 | Verify | All sources in `evidence/` with valid SHA256 hashes |
| 6 | Fact Validation | All quantitative claims validated against sources; `fact-check.md` complete |
| 7 | Neutrality | Multi-agent debate passes (no advocacy, balanced presentation) |
| 8 | Article | `short.md`, `detailed.md`, `full.md` generated and pass quality check |

## State Management

### Daily Folder Structure
```
briefings/YYYY-MM-DD/
├── state.json          # Progress tracking, current gate, flags
├── plan.md             # Search strategies determined during PLAN phase
├── stories.json        # Story registry with IDs, status, sources
├── sources.json        # Source registry with URLs, hashes, timestamps
├── fact-check.md       # Fact validation results (Gate 6)
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
  "phase": "INIT|PLAN|GATHER|TRIAGE|INVESTIGATE|VERIFY|FACT-VALIDATE|SYNTHESIZE|AUDIT|FINALIZE|COMPLETE",
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
- `generate_text` - Fact extraction with structured JSON output
- `web_search` - Grounded verification searches with citations

## Model Responsibilities & Anti-Hallucination Strategy

### Core Principle
**Claude orchestrates; GPT validates quantitative facts.**

Claude is prone to hallucinating specific numbers, dates, and rates from training data. To prevent this, all quantitative fact extraction and verification is delegated to GPT with structured output.

### Model Division by Task

| Task | Model | Rationale |
|------|-------|-----------|
| Workflow orchestration | Claude | Good at planning and coordination |
| News search | Grok (mcp-xai) | Real-time news access |
| Qualitative summaries | Claude | Good at synthesis and writing |
| **Quantitative fact extraction** | **GPT** | Structured output prevents fabrication |
| **Fact verification** | **GPT** | JSON schema enforces source-grounded answers |
| **Independent verification** | **GPT web_search** | Grounded search with citations |
| Deep investigation | GPT (deep_research) | Thorough multi-source research |

### Anti-Hallucination Rules

1. **Claude MUST NOT generate quantitative claims from memory**
   - No dates, rates, percentages, or specific numbers from training data
   - All quantitative data must come from tool outputs

2. **Quantitative facts require GPT extraction**
   - See `/gather` skill for implementation details

3. **Verification uses GPT, not Claude judgment**
   - See `/verify` and `/fact-validate` skills for implementation

4. **When in doubt, use GPT web_search**
   - Independent verification for critical claims

### Failure Modes to Avoid

| Failure | How It Happened (RCA-1) | Prevention |
|---------|-------------------------|------------|
| Wrong dates | Claude used 2025 training data for 2026 | GPT extracts from fetched source |
| Wrong rates | Claude used pre-December rate | GPT web_search verifies current rate |
| Fabricated probabilities | Claude made up "65%/30%" | Require GPT-extracted verbatim or omit |
| Unfetched sources | Claude cited URL without reading | Require osint_get before any claims |

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

### Neutrality Audit (Gate 7)
Three-agent debate:
1. **Critic** - Identifies potential bias, advocacy, or imbalance
2. **Defender** - Argues for the objectivity of the content
3. **Arbiter** - Makes final determination with specific remediation

### Factual Accuracy Audit
Additional audit dimension for fact-checking:
1. Sample 5-10 quantitative claims from briefing
2. Verify each against captured source in `evidence/`
3. Check for temporal currency against thresholds
4. Pass/Fail with specific issues listed

**Audit Failure Conditions:**
- Any claim cannot be traced to a captured source
- Any numerical value doesn't match source
- Any time-sensitive data exceeds currency threshold

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

