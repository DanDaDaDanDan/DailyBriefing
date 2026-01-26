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

### GATHER Phase
Two-step process separating topic discovery from detail gathering:

**Step 1: Topic Discovery (XAI)**
For each interest axis, use XAI tools (`news_search`, `x_search`, `research`) to identify:
- What stories are newsworthy today
- Social signals and trending topics
- Breaking news and developing stories

Output: List of story topics with headlines and brief descriptions. **No specific numbers or precise dates.**

**Step 2: Detail Gathering (OpenAI)**
For each discovered topic, use OpenAI `web_search` to find:
- Precise facts with source citations
- Specific numbers, rates, dates
- Disambiguated metrics (CPI vs PCE, etc.)

Output: Structured facts with source URLs for each story.

See `/gather` skill for implementation details.

### TRIAGE Phase
Evaluate stories and flag for investigation. Includes "Verifiable Facts" category for stories with dates, numbers, rates. See `/triage` skill for details.

### VERIFY Phase
Capture sources with SHA256 hashes. Use GPT to extract and validate all quantitative claims against captured sources. Outputs `fact-check.md`. See `/verify` skill for details.

## Gate Process (8 Gates)

All gates must pass sequentially. If a gate fails, return to the appropriate phase.

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 0 | Config | `briefings/config/interests.md` exists and is valid |
| 1 | Plan | `plan.md` exists with search strategies for each axis |
| 2 | Gather | All `topics/*.md` files exist (one per axis from config) |
| 3 | Triage | All findings evaluated, significant ones flagged in `state.json` |
| 4 | Investigate | All flagged findings have complete investigations |
| 5 | Verify | Sources captured with hashes; all quantitative claims validated; `fact-check.md` complete |
| 6 | Audit | Neutrality and completeness checks pass |
| 7 | Article | `short.md`, `detailed.md`, `full.md` generated and pass quality check |

## State Management

### Daily Folder Structure
```
briefings/YYYY-MM-DD/
├── state.json          # Progress tracking, current gate, flags
├── plan.md             # Search strategies determined during PLAN phase
├── stories.json        # Story registry with IDs, status, sources
├── sources.json        # Source registry with URLs, hashes, timestamps
├── fact-check.md       # Fact validation results (from VERIFY phase)
├── audit.md            # Audit results (from AUDIT phase)
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
  "axes": ["<axis-slug>", "..."],  // 1-N axes, derived from config headers
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

### Two-Layer Architecture

The system uses a **Discovery → Detail** pipeline that separates topic identification from fact gathering:

```
DISCOVERY LAYER (XAI)          DETAIL LAYER (OpenAI)
─────────────────────          ────────────────────────
"What's happening?"      →     "What exactly happened?"
Topics, headlines, trends      Precise facts, numbers, dates
Social signals                 Source-grounded citations
Speed over precision           Precision over speed
```

### mcp-xai (Discovery Layer)
Use for topic identification and social awareness. **Do NOT rely on XAI for precise quantitative details.**

- `news_search` - Identify newsworthy topics and headlines
- `x_search` - Social signals, trending topics, breaking news, public sentiment
- `web_search` - General topic discovery
- `research` - Multi-source topic aggregation

**XAI Output Should Include:**
- Story headlines and brief descriptions
- Why it's newsworthy (social buzz, breaking news, etc.)
- Keywords for follow-up research

**XAI Output Should NOT Include:**
- Specific numbers, rates, percentages (let OpenAI find these)
- Precise dates beyond "today" or "this week"
- Technical distinctions (CPI vs PCE, etc.)

### mcp-openai (Detail Layer)
Use for precise fact gathering and verification. Returns citations with URLs.

- `web_search` - **Primary tool for quantitative details** (returns source URLs)
- `generate_text` - Structured fact extraction with JSON schemas
- `deep_research` - In-depth investigation of complex topics

**OpenAI Queries Should Be Specific:**
- "What is the November 2025 CPI-U year-over-year rate according to BLS?"
- "What were the FOMC meeting dates in fall 2025?"
- "What was gold's spot price high on January 26, 2026?"

### mcp-osint (Official/Government Data)
Use for authoritative government and institutional sources.

- `osint_search` - Government databases, official records
- `osint_get` - Fetch and capture specific resources with SHA256 hashes

## Model Responsibilities & Anti-Hallucination Strategy

### Core Principle
**XAI discovers topics; OpenAI gathers details; Claude orchestrates and writes.**

Each model has distinct strengths. The system separates concerns to leverage these strengths and mitigate weaknesses:

- **XAI (Grok)**: Excellent real-time awareness, social integration, speed. Weak on precision for similar concepts.
- **OpenAI (GPT)**: Excellent precision, structured output, source citations. Slower, less real-time.
- **Claude**: Excellent orchestration, synthesis, writing quality. Prone to training-data hallucination.

### Model Division by Task

| Task | Model | Rationale |
|------|-------|-----------|
| Workflow orchestration | Claude | Planning and coordination |
| **Topic discovery** | **XAI** | Real-time news/social awareness |
| **Social signals & X content** | **XAI** | Native Twitter/X integration |
| **Quantitative details** | **OpenAI** | Precision + source citations |
| **Economic indicators** | **OpenAI** | Disambiguation required (CPI vs PCE, etc.) |
| **Dates & schedules** | **OpenAI** | Verify against official calendars |
| Fact verification | OpenAI | Grounded web_search with URLs |
| Deep investigation | OpenAI | Thorough multi-source research |
| Qualitative synthesis | Claude | Writing quality and coherence |
| Final briefing writing | Claude | Narrative construction |

### Anti-Hallucination Rules

1. **Claude MUST NOT generate quantitative claims from memory**
   - No dates, rates, percentages, or specific numbers from training data
   - All quantitative data must come from OpenAI tool outputs

2. **XAI discovers WHAT, OpenAI discovers HOW MUCH/WHEN**
   - XAI: "Fed held rates steady" ✓
   - XAI: "Fed funds rate is 3.5%-3.75%" ✗ (let OpenAI verify)
   - OpenAI: "Fed funds rate is 3.5%-3.75% per federalreserve.gov" ✓

3. **Economic indicators require explicit disambiguation**
   - Never say "inflation" without specifying CPI-U, Core CPI, PCE, or Core PCE
   - Always include the source agency (BLS for CPI, BEA for PCE)
   - Use OpenAI web_search to find the specific metric

4. **Dates and schedules require official source verification**
   - FOMC meeting dates → verify against Federal Reserve calendar
   - Economic release dates → verify against BLS/BEA calendars
   - Use OpenAI web_search: "FOMC meeting dates 2025 federalreserve.gov"

5. **When in doubt, use OpenAI web_search**
   - Returns source URLs for verification
   - Provides grounded answers, not training-data recall

### Failure Modes to Avoid

| Failure | Root Cause | Prevention |
|---------|------------|------------|
| Wrong dates | Claude used training data for future dates | OpenAI extracts from fetched source |
| Wrong rates | Claude used stale training data | OpenAI web_search verifies current rate |
| Fabricated probabilities | Claude invented statistics | Require OpenAI-extracted verbatim or omit |
| Unfetched sources | Claude cited URL without reading | Require osint_get before any claims |
| **CPI/PCE conflation** | **XAI conflated similar metrics (RCA-2)** | **OpenAI gathers all economic indicators with explicit metric names** |
| **Wrong meeting months** | **Assumed monthly meetings exist** | **OpenAI verifies against official calendars** |
| **Imprecise price data** | **XAI approximated market figures** | **OpenAI web_search for specific prices with sources** |

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

### Audit (Gate 6)
Single-pass check for neutrality and completeness. See `/audit` skill for details.

**Neutrality Checks:**
- No forbidden language (verdict words, advocacy framing, emotional language)
- Multiple perspectives on controversies
- Proper attribution throughout

**Completeness Checks:**
- All axes have proportional coverage
- All high-priority stories included
- Word counts within acceptable ranges

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

