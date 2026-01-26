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
    ├── verify/                  # Source verification
    ├── synthesize/              # Briefing generation
    ├── audit-neutrality/        # Bias detection
    └── audit-completeness/      # Coverage verification
```

## Gate Process

| Gate | Name | Criteria |
|------|------|----------|
| 0 | Config | interests.md exists |
| 1 | Plan | plan.md created with search strategies |
| 2 | Gather | All topic files exist |
| 3 | Triage | Findings evaluated and flagged |
| 4 | Investigate | Flagged findings explored |
| 5 | Verify | Sources captured with hashes |
| 6 | Neutrality | Multi-agent audit passed |
| 7 | Article | All briefings generated |

## Neutrality

The system enforces strict neutrality:

- No verdict language (confirmed, debunked, proven)
- No advocacy framing (must, should, need to)
- Balanced presentation of all perspectives
- Clear attribution for all claims
- Opinion separated from fact

A three-agent debate (Critic, Defender, Arbiter) audits every briefing.

## MCP Servers Used

| Server | Purpose |
|--------|---------|
| mcp-xai | Real-time news, social media, web search |
| mcp-osint | Government and official sources |
| mcp-openai | Deep research and verification |

## Commands

| Command | Purpose |
|---------|---------|
| `/brief` | Start new daily briefing |
| `/brief --status` | Show current progress |

## License

MIT
