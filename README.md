# Daily Briefing System

A Claude-powered news briefing system that generates factual, neutral daily briefings across your personal interest areas.

## Overview

This system gathers news from the last 24 hours, verifies sources, and produces balanced briefings tailored to your interests. It uses multiple MCP servers for news gathering, official sources, and deep research.

## Quick Start

1. **Run a briefing**:
```
/brief
```

If no interests file exists, the system will ask about your interests and create `briefings/config/interests.md` for you.

## How It Works

### Workflow
```
INIT → PLAN → GATHER → TRIAGE → INVESTIGATE → VERIFY → SYNTHESIZE → AUDIT → FINALIZE
```

1. **PLAN** - Analyzes your interests and creates search strategies
2. **GATHER** - Parallel agents collect news for each interest axis
3. **TRIAGE** - Evaluates findings, flags significant stories for deep investigation
4. **INVESTIGATE** - Parallel agents explore important findings in depth
5. **VERIFY** - Captures sources with SHA256 hashes for integrity
6. **SYNTHESIZE** - Generates short, detailed, and full briefings
7. **AUDIT** - Multi-agent debate ensures neutrality and completeness

### Output Formats

| Format | Length | Purpose |
|--------|--------|---------|
| `short.md` | 500-900 words | Quick morning read |
| `detailed.md` | 2,000-4,000 words | Comprehensive briefing |
| `full.md` | Unlimited | Complete with sources and methodology |

## Configuration

Your interests file should be **lightweight and curiosity-driven**:

- Express what you care about, not where to look
- Provide context about your perspective
- Keep it high-level - the system figures out sources and search strategies

The config file is gitignored for privacy.

### Example Configuration

```markdown
## Tech Industry
I work in software engineering. Interested in AI developments, major tech company
news, startup funding trends, and programming language ecosystem changes.

## Personal Finance
Care about investment strategies, tax law changes, retirement planning,
and economic indicators that affect savings and market performance.

## Local News
I live in Raleigh, NC. Care about local development, schools, traffic,
city council decisions, and regional business news.
```

**Tips:**
- Use `##` headings for each interest area (these become briefing sections)
- Write 2-3 sentences describing what you care about and why
- Provide context (e.g., "I work in software") to help prioritize relevance
- Keep it high-level -- the system determines sources and search strategies

## Project Structure

```
├── CLAUDE.md                    # Behavioral rules and gate process
├── briefings/
│   ├── config/
│   │   └── interests.md         # Your interests (gitignored)
│   └── YYYY-MM-DD/              # Daily briefing outputs
│       ├── plan.md              # Search strategies
│       ├── state.json           # Progress tracking
│       ├── topics/              # Gathered news by axis
│       ├── investigations/      # Investigation outputs
│       ├── evidence/            # Captured sources
│       └── briefings/           # Final outputs (md + pdf)
├── reference/
│   └── neutrality-guidelines.md # Writing standards
├── scripts/
│   ├── init-briefing.js         # Initialize daily structure
│   ├── check-continue.js        # Gate checking
│   ├── verify-source.js         # Source hash verification
│   └── generate-pdf.js          # PDF generation
└── .claude/skills/              # Skill definitions
    ├── brief/                   # Main entry point
    ├── plan/                    # Search strategy planning
    ├── gather/                  # News gathering
    ├── triage/                  # Finding evaluation
    ├── investigate/             # Deep investigation
    ├── verify/                  # Source verification & fact validation
    ├── synthesize/              # Briefing generation
    └── audit/                   # Neutrality & completeness check
```

## Gate Process

| Gate | Name | Criteria |
|------|------|----------|
| 0 | Config | interests.md exists |
| 1 | Plan | plan.md created with search strategies |
| 2 | Gather | All topic files exist |
| 3 | Triage | Findings evaluated and flagged |
| 4 | Investigate | Flagged findings explored |
| 5 | Verify | Sources captured; claims validated via GPT |
| 6 | Audit | Neutrality and completeness checks pass |
| 7 | Article | `short.md`, `detailed.md`, `full.md` generated and pass quality check |

## Neutrality

The system enforces strict neutrality:

- No verdict language (confirmed, debunked, proven)
- No advocacy framing (must, should, need to)
- Balanced presentation of all perspectives
- Clear attribution for all claims
- Opinion separated from fact

A three-agent debate (Critic, Defender, Arbiter) audits every briefing.

## MCP Servers

| Server | Layer | Purpose |
|--------|-------|---------|
| mcp-xai | Discovery | Topic identification via news, social media, and web search |
| mcp-openai | Verification | Fact checking, source-grounded citations, deep research |
| mcp-osint | Evidence | Government databases, official records, source capture with SHA256 hashes |

The system uses a **discovery --> verification** pipeline: XAI identifies what is newsworthy, OpenAI verifies the facts, and OSINT captures authoritative sources for the evidence trail.

## Commands

| Command | Purpose |
|---------|---------|
| `/brief` | Start new daily briefing |
| `/brief --status` | Show current progress |

## Utility Scripts

| Command | Purpose |
|---------|---------|
| `npm run init` | Initialize briefing for today's date |
| `npm run init:date -- --date YYYY-MM-DD` | Initialize for a specific date |
| `npm run check -- briefings/YYYY-MM-DD` | Check gate progression and status |
| `npm run verify -- <url> <briefing-dir>` | Capture and verify a source with SHA256 hash |
| `npm run pdf -- briefings/YYYY-MM-DD` | Generate PDF versions of briefings |

## Troubleshooting

**"interests.md not found"**
Run `/brief` and the system will ask about your interests and create the config file. Or manually create `briefings/config/interests.md` following the example above.

**A gate fails during briefing generation**
Check `state.json` in the briefing directory to see the current phase and any errors. Use `npm run check -- briefings/YYYY-MM-DD` to diagnose which gate criteria are not met.

**Briefings are below word count targets**
Word count targets are guidelines, not hard requirements. The system prioritizes covering all significant stories with verified facts over hitting arbitrary word counts.

**Resuming an interrupted briefing**
Run `/brief` again -- the system detects existing state and resumes from the last completed gate. To target a specific date: initialize with `npm run init:date -- --date YYYY-MM-DD`, then run `/brief`.

## License

MIT
