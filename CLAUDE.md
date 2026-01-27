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
Two-step process separating topic discovery from fact gathering:

**Step 1: Topic Discovery (XAI)**
For each interest axis, use XAI tools (`news_search`, `x_search`, `research`) to identify:
- What stories are newsworthy today
- Social signals and trending topics
- Breaking news and developing stories

Output: List of story topics with headlines and qualitative descriptions. **XAI outputs are leads to investigate, not facts to publish.**

**Step 2: Fact Gathering (OpenAI)**
For each discovered topic, use OpenAI `web_search` to find:
- All factual claims with source citations
- Every number, date, name, quote, or verifiable detail
- Authoritative sources for official data

Output: Structured facts with source URLs for each story. **Only OpenAI-sourced facts appear in final briefings.**

See `/gather` skill for implementation details.

### TRIAGE Phase
Evaluate stories and flag for investigation. Includes "Verifiable Facts" category for stories with dates, numbers, rates. See `/triage` skill for details.

### VERIFY Phase
Capture sources with SHA256 hashes. Use OpenAI to extract and validate all factual claims against captured sources. Outputs `fact-check.md`. See `/verify` skill for details.

## Gate Process (8 Gates)

All gates must pass sequentially. If a gate fails, return to the appropriate phase.

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 0 | Config | `briefings/config/interests.md` exists and is valid |
| 1 | Plan | `plan.md` exists with search strategies for each axis |
| 2 | Gather | All `topics/*.md` files exist (one per axis from config) |
| 3 | Triage | All findings evaluated, significant ones flagged in `state.json` |
| 4 | Investigate | All flagged findings have complete investigations |
| 5 | Verify | Sources captured with hashes; all factual claims validated; `fact-check.md` complete |
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
Use for topic identification and social awareness. **XAI tells us what to cover, not the facts to publish.**

- `news_search` - Identify newsworthy topics and headlines
- `x_search` - Social signals, trending topics, breaking news, public sentiment
- `web_search` - General topic discovery
- `research` - Multi-source topic aggregation

**XAI outputs are leads to investigate**, not facts to publish. When XAI returns specific numbers, dates, or details, treat them as search hints for OpenAI verification.

### mcp-openai (Detail Layer)
Use for all fact gathering and verification. **Every factual claim needs an OpenAI source.**

- `web_search` - **Primary fact verification tool** (returns source URLs)
- `generate_text` - Structured fact extraction with JSON schemas
- `deep_research` - In-depth investigation of complex topics

**OpenAI queries should be specific and source-directed.** Examples:
- "Official German Bundestag election results February 2025 Bundeswahlleiter"
- "Current fed funds target rate Federal Reserve"
- "Gold spot price January 27 2026"

### mcp-osint (Source Capture & Government Data)
Use for authoritative government sources and for capturing evidence with verification hashes.

- `osint_search` - Government databases, official records (elections, regulatory filings, etc.)
- `osint_get` - Fetch and capture any source with SHA256 hash for verification

**Relationship to OpenAI**: Use OpenAI `web_search` to find and verify facts. Use `osint_get` to capture the authoritative source for the evidence trail. Both serve fact verification; OpenAI finds facts, OSINT preserves evidence.

## Model Responsibilities & Anti-Hallucination Strategy

### Core Principle

**If a claim could be wrong, verify it with OpenAI.**

This single rule replaces enumerated categories. Don't ask "is this type of fact on our verification list?" Ask "could this be incorrect?" If yes, use OpenAI web_search.

### Model Roles

| Model | Role | Provides |
|-------|------|----------|
| **XAI** | News wire editor | "Here's what's happening—go cover it" |
| **OpenAI** | Fact checker | "Here are the verified details with sources" |
| **Claude** | Writer | "I'll craft the narrative from verified facts only" |

### What XAI Provides (Discovery Only)

XAI's scope is **narrowly limited** to topic discovery:

- **Story identification**: "There's news about X"
- **Newsworthiness signals**: "This is trending / breaking / significant because..."
- **Qualitative framing**: "This is seen as hawkish / controversial / unexpected"
- **Social context**: "Public reaction on X includes..."

### What XAI Does NOT Provide

XAI should not provide any factual claim that could be verified or falsified:

- ❌ Numbers (rates, prices, percentages, counts, vote totals)
- ❌ Dates (meeting dates, release dates, event dates, historical dates)
- ❌ Names and titles (verify spelling, current titles, affiliations)
- ❌ Quotes (verify exact wording)
- ❌ Historical facts (what happened, when, outcomes)
- ❌ Current facts (status, measurements, official positions)
- ❌ Comparisons (changes from baseline, rankings, records)

**If XAI provides any of the above, treat it as a lead to investigate, not a fact to publish.**

### What OpenAI Provides (All Facts)

Every factual claim in the final briefing must come from OpenAI with a source citation:

- `web_search` - Primary tool for fact verification (returns source URLs)
- `generate_text` - Structured extraction from fetched content
- `deep_research` - Complex topics requiring multiple sources

### Decision Flowchart

```
Is this claim about WHAT is newsworthy?
  → YES: XAI can provide it
  → NO: Continue...

Could this claim be wrong?
  → YES: OpenAI must verify it
  → NO: (This almost never happens—verify anyway)
```

### Anti-Hallucination Rules

1. **Claude writes prose, not facts**
   - Claude's role is narrative construction from verified inputs
   - If a fact isn't in an MCP tool result with a source, it doesn't go in the briefing
   - "I think..." or "I recall..." → Use OpenAI web_search instead

2. **XAI outputs are leads, not facts**
   - XAI: "Fed held rates steady" → OpenAI: "What is the current fed funds rate?"
   - XAI: "German election showed AfD gains" → OpenAI: "Official German election results 2025"
   - XAI: "Gold hit record high" → OpenAI: "Gold spot price January 27 2026"

3. **When uncertain, verify**
   - The cost of an unnecessary verification is low (one API call)
   - The cost of publishing a wrong fact is high (credibility damage)
   - Default to verification

### Common Failure Patterns

These illustrate the principle—they are not an exhaustive list:

| Pattern | Example | Prevention |
|---------|---------|------------|
| Stale data | Wrong current rates/prices | OpenAI web_search for current figures |
| Approximation | Numbers off by small amounts | Require exact figures from authoritative sources |
| Conflation | Similar metrics confused (CPI vs PCE) | OpenAI query must name specific metric |
| Omission | Incomplete data (missing parties, categories) | Use authoritative sources with complete data |
| Assumed schedules | Wrong meeting/event dates | Verify against official calendars |
| Training bleed | Claude/XAI uses training data as fact | Only MCP tool outputs with sources are facts |

**When a new failure pattern emerges**: It likely fits the general principle already. Ask "could this claim be wrong?" and the answer determines whether verification was needed.

## Neutrality Requirements

### Forbidden Language
- **Verdict words**: confirmed, debunked, proven, false, true, fact-checked
- **Advocacy framing**: must, should, need to, important that, clearly
- **Emotional language**: shocking, outrageous, unprecedented (unless quoting)
- **Partisan labels**: far-left, far-right, extremist (describe positions instead)

### Required Practices
1. **Attribution**: "According to [source]...", "[Organization] reported that..."
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
