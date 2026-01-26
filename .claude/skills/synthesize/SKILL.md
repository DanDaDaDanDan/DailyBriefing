# /synthesize - Generate Briefings

Generates three briefing formats from gathered and investigated content.

## Usage

```
/synthesize <briefing-dir>
```

## Output Formats

| Format | Length | Purpose | Read Time |
|--------|--------|---------|-----------|
| short.md | 500-900 words | Executive summary | 3-5 min |
| detailed.md | 2,000-4,000 words | Comprehensive briefing | 10-15 min |
| full.md | Unlimited | Complete with sources | 20+ min |

## Process

### 1. Load Content

Read all source material:
- `topics/*.md` - Gathered news by axis
- `investigations/*/findings.md` - Deep investigation results
- `stories.json` - Story metadata and priorities
- `sources.json` - Verified source references

### 2. Prioritize Content

Rank stories by:
1. Investigation status (investigated = higher priority)
2. Relevance rating from triage
3. Significance and impact
4. Recency of developments

### 3. Generate short.md

Write to `<briefing-dir>/briefings/short.md`:

**Structure:**
```markdown
# Daily Briefing - [Date]

*Quick read: 3-5 minutes*

---

## [Axis 1 Name]

**[Top Story Headline]**
[2-3 sentence summary with key facts]

**[Second Story]**
[1-2 sentence summary]

---

## [Axis 2 Name]
...

---

*Sources and detailed analysis available in full briefing*
```

**Guidelines:**
- 500-900 words total
- Top 2-3 stories per axis
- Facts only, no deep analysis
- No source citations inline (reference full briefing)
- Lead with most impactful information

### 4. Generate detailed.md

Write to `<briefing-dir>/briefings/detailed.md`:

**Structure:**
```markdown
# Daily Briefing - [Date]

*Comprehensive briefing: 10-15 minutes*

---

## [Axis 1 Name]

### [Top Story Headline]

[3-4 paragraphs with context and analysis]

According to [source], ...
[Other perspective] argues that ...

**Key Points:**
- Point 1
- Point 2

**What to Watch:**
[Forward-looking implications]

### [Second Story]
...

---

## [Axis 2 Name]
...

---

## Sources

[List of primary sources with links]
```

**Guidelines:**
- 2,000-4,000 words total
- Full coverage of significant stories
- Include context and background
- Analysis with attribution
- Multiple perspectives on controversies

### 5. Generate full.md

Write to `<briefing-dir>/briefings/full.md`:

**Structure:**
```markdown
# Complete Daily Briefing - [Date]

## Briefing Metadata
- Generated: [timestamp]
- Sources verified: [count]
- Stories covered: [count]
- Investigations completed: [count]

---

## [Axis 1 Name]

### [Story with full detail]

[Complete coverage including all gathered information]

#### Background
[Historical context]

#### Developments
[Detailed timeline of events]

#### Perspectives
[All viewpoints with full attribution]

#### Sources
| ID | Source | URL | Verified |
|----|--------|-----|----------|
| S001 | Name | link | ✓ |

---

## Methodology

### Search Strategy
[Summary of plan.md approach]

### Sources Consulted
[Complete source list with verification status]

### Investigations Conducted
[List of deep investigations with findings]
```

**Guidelines:**
- No length limit
- Complete coverage with all details
- Full source citations with verification status
- Methodology documentation
- Suitable for archival

## Neutrality Requirements

Apply throughout all formats:

**Language:**
- Attribution: "According to [source]...", "X reported that..."
- Uncertainty: "reportedly", "sources say", "allegedly"
- Balance: Include opposing viewpoints

**Forbidden:**
- Verdict words: confirmed, debunked, proven, false, true
- Advocacy: must, should, need to, important that, clearly
- Emotional: shocking, outrageous, unprecedented (unless quoting)
- Partisan labels: far-left, far-right, extremist

## Gate 7 Criteria

Synthesis passes when:
- All three files generated in `<briefing-dir>/briefings/`: `short.md`, `detailed.md`, `full.md`
- Word counts within target ranges
- All axes have proportional coverage
- Neutrality standards applied
- Sources properly attributed
