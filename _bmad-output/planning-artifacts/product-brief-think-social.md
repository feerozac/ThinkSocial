# Product Brief: Think Social

**Version:** 1.0  
**Date:** 2026-01-29  
**Author:** Mark  
**Status:** Discovery

---

## Executive Summary

**Think Social** is a media transparency tool that lets you **peer under the hood** of any social media post or news story. Like checking a car's history before buying, Think Social shows you what's behind the content — the sources, the perspectives, the context — so you can make your own informed decision.

We don't tell you what's true or false. We show you the full picture. **You decide.**

---

## The Big Idea

> **"Peer under the hood of any story. You decide what to believe."**

Think Social doesn't tell you what's true or false — it shows you **what's behind the content** so you can make your own informed decision. Like checking a car's history before buying, or reading ingredients before eating.

**Core philosophy:**
- ❌ "We tell you what's biased"
- ✅ "We show you what's under the hood — you decide"

**The Traffic Light System** — not a judgment, but a quick signal to dig deeper:

- 🟢 **Green** — Multiple sources agree, claims verified, perspectives represented
- 🟡 **Amber** — Worth a closer look — limited sources, or single perspective
- 🔴 **Red** — Dig deeper — conflicting information, disputed claims, or missing context

---

## Problem Statement

### The Problem

Social media users are bombarded with content that mixes news, opinion, misinformation, and propaganda — often indistinguishable from each other. Most people don't have time to fact-check everything they read, and even well-intentioned users unknowingly share biased or false content.

### The Impact

- **Polarization:** People live in filter bubbles, reinforcing existing beliefs
- **Misinformation spread:** False stories go viral before fact-checkers respond
- **Erosion of trust:** People don't know what to believe anymore
- **Real-world harm:** Health misinformation, election interference, financial scams

### Why Existing Solutions Fall Short

| Solution | Limitation |
|----------|------------|
| **Fact-check sites** (Snopes, PolitiFact) | Reactive, slow, requires user effort |
| **Platform labels** (Twitter Community Notes) | Inconsistent, politicized perception |
| **Media bias charts** | Static, not real-time, not integrated |
| **News literacy education** | Doesn't scale, people don't have time |

---

## Proposed Solution

### Think Social — Media Health Labels

A **browser extension** (Chrome, Safari, Firefox) and **mobile app** that automatically analyzes social media posts and displays a health warning label in real-time.

**User experience:**
1. User scrolls Twitter/Facebook/Instagram/LinkedIn
2. Think Social analyzes each post in background
3. Traffic light badge appears on post (🟢🟡🔴)
4. User taps/hovers for detailed breakdown

### The "Under the Hood" Panel

```
┌─────────────────────────────────────────────┐
│         🔍 UNDER THE HOOD                   │
├─────────────────────────────────────────────┤
│                                             │
│  QUICK SIGNAL:  🟡 Worth a closer look      │
│                                             │
├─────────────────────────────────────────────┤
│  WHAT WE FOUND:                             │
│                                             │
│  Perspective     🟡  Leans left of center   │
│  Verification    🟢  Key claims check out   │
│  Other Views     🔴  Only one side shown    │
│  Source History  🟢  Established outlet     │
│  Tone            🟡  Some emotional framing │
│                                             │
├─────────────────────────────────────────────┤
│  THE FULL PICTURE:                          │
│  The facts here appear accurate, but this   │
│  is one perspective on a multi-sided issue. │
│  Here's what other sources are saying →     │
│                                             │
├─────────────────────────────────────────────┤
│  👁️ See other perspectives  |  🔗 Sources   │
└─────────────────────────────────────────────┘
```

**Key language shifts:**
| Old (Judgmental) | New (Transparent) |
|------------------|-------------------|
| "This is biased" | "This leans [direction] of center" |
| "False" | "We found conflicting information" |
| "Warning" | "Worth a closer look" |
| "Unreliable source" | "This source has a mixed track record" |
| "What this means" | "What we found" / "The full picture" |

---

## Core Analysis Dimensions

| Dimension | What It Measures | Traffic Light Logic |
|-----------|------------------|---------------------|
| **Bias** | Political/ideological lean (left, center, right) | 🟢 Center / 🟡 Lean / 🔴 Strong bias |
| **Factual Accuracy** | Are claims verifiable and true? | 🟢 Verified / 🟡 Unverified / 🔴 False |
| **Balance** | Are multiple perspectives represented? | 🟢 Balanced / 🟡 Limited / 🔴 One-sided |
| **Source Credibility** | Track record of the source | 🟢 Reliable / 🟡 Mixed / 🔴 Unreliable |
| **Emotional Manipulation** | Sensationalism, fear, outrage bait | 🟢 Neutral / 🟡 Moderate / 🔴 High |
| **Historical Accuracy** | Does it align with historical record? | 🟢 Accurate / 🟡 Disputed / 🔴 Revisionist |

---

## Target User

### Primary Persona: "The Conscious Scroller"

**Name:** Jamie, 32  
**Location:** Hong Kong / Singapore / Sydney  
**Behavior:**
- Spends 2+ hours/day on social media
- Wants to be informed but doesn't have time to fact-check
- Has unknowingly shared misleading content before
- Cares about not being part of the misinformation problem
- Politically moderate, suspicious of extreme views on both sides

**Jobs to Be Done:**
- "Help me quickly assess if this post is trustworthy"
- "Warn me before I share something embarrassing"
- "Show me my own blind spots and biases"
- "Make me a more informed citizen without extra effort"

### Secondary Personas

| Persona | Use Case |
|---------|----------|
| **Parent** | Monitor what kids are exposed to on social media |
| **Teacher** | Use as a teaching tool for media literacy |
| **Journalist** | Quick bias check before citing sources |
| **Concerned Elder** | Protection against scams and health misinformation |

---

## Key Features (MVP)

### 1. Real-Time Traffic Light Badges
- Instant visual indicator on social media posts
- Works across Twitter/X, Facebook, Instagram, LinkedIn
- Non-intrusive — doesn't block content

### 2. Detailed Health Label (Tap to Expand)
- Breakdown by dimension (bias, factual, balance, etc.)
- Plain-language explanation of rating
- Links to sources and methodology

### 3. Personal Bias Dashboard
- "Your media diet this week"
- Shows what political lean you're exposed to
- Highlights blind spots
- Gamification: "Media Health Score"

### 4. "Think Before You Share" Prompt
- Warning when user attempts to share 🔴 content
- "This post has been flagged for [reason]. Share anyway?"
- Reduces accidental misinformation spread

### 5. Source Reputation Database
- Crowdsourced + AI-curated database of sources
- Track record, ownership, funding transparency
- Updated continuously

---

## Advanced Features: Media Firewall & Perspective Challenge

### 6. Media Firewall Mode 🛡️

A configurable content filter that limits exposure to harmful or low-quality content — like parental controls, but for media quality.

**Firewall Settings:**

| Level | What It Does |
|-------|--------------|
| **Off** | Labels only, no blocking |
| **Gentle** | Blur 🔴 content with "Show anyway?" option |
| **Moderate** | Hide 🔴 content, blur 🟡 content |
| **Strict** | Only show 🟢 verified content |
| **Custom** | User defines thresholds per dimension |

**Use Cases:**
- **Parents:** Protect kids from misinformation and hate speech
- **Mental health:** Reduce exposure to outrage bait and doom scrolling
- **Focus mode:** Only see verified, balanced content during work hours
- **Election season:** Filter out propaganda and unverified claims

**Firewall UI:**
```
┌─────────────────────────────────────────────┐
│  🛡️ MEDIA FIREWALL ACTIVE                  │
├─────────────────────────────────────────────┤
│                                             │
│  This content is hidden because:            │
│  • 🔴 High emotional manipulation           │
│  • 🔴 Unverified claims                     │
│                                             │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Show Anyway │  │ See Alternative View │  │
│  └─────────────┘  └─────────────────────┘  │
│                                             │
│  🔧 Adjust firewall settings                │
└─────────────────────────────────────────────┘
```

---

### 7. Perspective Challenge Mode 🔄

Proactively challenges users to escape their filter bubble by presenting alternative viewpoints on the same topic.

**How It Works:**

1. User reads a post on Topic X
2. Think Social detects bias direction (e.g., left-leaning)
3. System surfaces: *"See how others see this story"*
4. Shows same topic from different perspective sources

**Challenge Prompts:**

| Trigger | Challenge |
|---------|-----------|
| User reads 5+ posts with same bias | "You've been reading mostly [left/right] takes. Want to see the other side?" |
| User about to share one-sided content | "This post only shows one perspective. See the full picture?" |
| Hot-button topic detected | "This topic is polarizing. Here's how [left/center/right] outlets are covering it." |
| User in deep scroll | "You've been scrolling for 20 mins. Take a perspective break?" |

**Perspective Panel:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 PERSPECTIVE CHALLENGE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're reading about: "New immigration policy announced"       │
│                                                                 │
│  YOUR FEED SHOWS:                                               │
│  ├── 🔵 Left-leaning sources (80%)                              │
│  ├── ⚪ Center sources (15%)                                    │
│  └── 🔴 Right-leaning sources (5%)                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  SEE OTHER PERSPECTIVES:                                        │
│                                                                 │
│  🔵 Left: "Policy praised by human rights groups"               │
│     └── Source: The Guardian (🟢 Reliable, 🔵 Left-lean)        │
│                                                                 │
│  ⚪ Center: "Policy draws mixed reactions"                      │
│     └── Source: Reuters (🟢 Reliable, ⚪ Center)                 │
│                                                                 │
│  🔴 Right: "Policy criticized as insufficient"                  │
│     └── Source: Wall Street Journal (🟢 Reliable, 🔴 Right-lean)│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💡 Understanding multiple perspectives helps you form          │
│     your own informed opinion.                                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Read All     │  │ Dismiss      │  │ Turn Off Challenges  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. Media Wellness Features

**Daily/Weekly Limits:**
- Set time or post limits: "Alert me after 30 mins of social media"
- "Doom scroll detector" — warns when consuming too much negative content

**Bias Balance Goals:**
- "This week, try to read 3 articles from sources you don't usually read"
- Gamification: Earn "Open Mind" badges

**Detox Mode:**
- Temporarily block all social media except 🟢 verified content
- "I need a break from the outrage"

**Reflection Prompts:**
- End of day: "Here's what shaped your worldview today"
- Weekly: "Your media diet was 70% left-leaning. Here's what you might have missed."

---

## Legal Shield Agent ⚖️

**The differentiator that makes Think Social defensible — by design.**

No other media analysis tool has built-in legal AI. Think Social is the only platform where every rating passes through an autonomous legal review agent before publishing.

> **"The only media transparency tool with built-in legal AI — every rating is legally defensible by design."**

### Core Functions

| Function | What It Does |
|----------|--------------|
| **Pre-Rating Review** | Before any rating publishes, scans language for defamation risk |
| **Safe Harbor Framing** | Auto-rewrites risky language to defensible alternatives |
| **Risk Scoring** | Flags high-profile subjects (politicians, celebrities, corporations) for extra caution |
| **Jurisdiction Awareness** | Adjusts language by user region (UK defamation law is stricter than US) |
| **Precedent Tracking** | Monitors media law cases and updates guidance accordingly |
| **Threat Response** | When legal threats arrive, assesses exposure and recommends rapid correction |

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEGAL SHIELD AGENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Content    │───▶│   Analysis   │───▶│ Legal Shield │      │
│  │   Analyzed   │    │   Generated  │    │    Review    │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │               │
│                            ┌─────────────────────┼───────────┐  │
│                            ▼                     ▼           ▼  │
│                      ┌──────────┐         ┌──────────┐  ┌──────┐│
│                      │ 🟢 PASS  │         │ 🟡 REFRAME│  │🔴 HOLD││
│                      │ Publish  │         │ Auto-edit │  │Human ││
│                      └──────────┘         └──────────┘  │Review││
│                                                         └──────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Legal Shield Rules Engine

| Trigger | Action |
|---------|--------|
| Subject is public figure with litigation history | Escalate to 🟡 REFRAME |
| Rating implies criminal conduct | Escalate to 🔴 HOLD for human review |
| Content involves ongoing legal proceedings | Add "sub judice" disclaimer |
| Absolute statements ("this is false") | Auto-reframe to "our analysis suggests" |
| User in UK/Australia (strict defamation laws) | Apply stricter language filters |
| High-engagement content (>10K shares) | Re-review before serving |

### Language Transformation Examples

| Before (Risky) | After Legal Shield (Defensible) |
|----------------|--------------------------------|
| "This claim by @SenatorX is **false**" | "Our analysis found this claim conflicts with [sources]" |
| "This source is **unreliable**" | "This source has a mixed track record on [topic]" |
| "This is **propaganda**" | "This content appears to present a single perspective without noting alternatives" |
| "**Warning:** Misleading content" | "Worth a closer look — our analysis found conflicting information" |
| "@CEO_Name **lied** about earnings" | "This statement conflicts with [source] — @CEO_Name has not responded to requests for comment" |

### Legal Shield Dashboard (Internal)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚖️ LEGAL SHIELD DASHBOARD                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TODAY'S STATS:                                                 │
│  ├── 🟢 Passed: 94,231 ratings                                  │
│  ├── 🟡 Reframed: 5,412 ratings (auto-corrected language)       │
│  └── 🔴 Held: 47 ratings (pending human review)                 │
│                                                                 │
│  HIGH-RISK SUBJECTS FLAGGED:                                    │
│  ├── @SenatorSmith — Active litigation, apply strict filter     │
│  ├── @MegaCorp — History of SLAPP suits, extra caution          │
│  └── Breaking: Ukraine conflict — sub judice in 3 jurisdictions │
│                                                                 │
│  LEGAL PRECEDENT UPDATES:                                       │
│  ├── ⚠️ New UK Online Safety Act guidance — updating filters    │
│  └── ✓ Dominion v Fox ruling — "actual malice" standard upheld  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Competitive Moat

| Competitor | Legal Approach | Think Social Advantage |
|------------|----------------|------------------------|
| **NewsGuard** | Editorial discretion, human editors | Scalable AI review, consistent application |
| **Snopes / PolitiFact** | Manual editorial review | Real-time, automated at scale |
| **Community Notes** | Crowdsourced, no legal review | Legally vetted language on every rating |
| **Ground News** | No rating language, just aggregation | Proactive legal protection built-in |

---

## Competitive Landscape

| Competitor | What They Do | Think Social Advantage |
|------------|--------------|------------------------|
| **NewsGuard** | Browser extension with source ratings | We rate individual posts, not just sources |
| **Ground News** | Shows same story from left/right/center | We integrate into your existing feed |
| **Snopes / PolitiFact** | Manual fact-checking | We're real-time and automated |
| **Twitter Community Notes** | Crowdsourced context | We're consistent, not politicized |
| **Media Bias/Fact Check** | Static source ratings | We're dynamic and post-level |

### Positioning

> **Think Social is the only media transparency tool with built-in legal AI — every rating is defensible by design.** We let you peer under the hood of any story, showing you the sources, perspectives, and context — and our Legal Shield Agent ensures we never overstep.

---

## Business Model

### Freemium Consumer Model

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Basic traffic lights, 50 posts/day limit |
| **Pro** | $4.99/mo | Unlimited posts, detailed breakdowns, bias dashboard |
| **Family** | $9.99/mo | Up to 5 accounts, parental controls |

### Future Revenue Streams

| Stream | Description |
|--------|-------------|
| **API licensing** | Newsrooms, platforms, researchers |
| **Enterprise** | Brand safety monitoring for corporates |
| **Education** | School/university site licenses |
| **Data insights** | Anonymized trend reports (ethical, privacy-preserving) |

---

## Technical Approach (High-Level)

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Browser    │────▶│  Think      │────▶│  Analysis   │────▶│   Legal     │
│  Extension  │     │  Social API │     │  Engine     │     │   Shield    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                              │                     │
                    ┌─────────────────────────┼─────────────────────┤
                    ▼                         ▼                     ▼
             ┌─────────────┐          ┌─────────────┐        ┌─────────────┐
             │  Fact-Check │          │  Bias       │        │   Rating    │
             │  Engine     │          │  Classifier │        │  Published  │
             └─────────────┘          └─────────────┘        └─────────────┘
                    │                         │
                    ▼                         ▼
             ┌─────────────┐          ┌─────────────┐
             │  Source     │          │   Legal     │
             │  Database   │          │  Precedent  │
             └─────────────┘          └─────────────┘
```

### Key Technical Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Browser Extension** | JavaScript, Chrome/Firefox APIs | Content injection, badge display |
| **Mobile App** | React Native | Share sheet integration, feed overlay |
| **Analysis Engine** | LLM (Claude/GPT) + custom models | Multi-dimensional content analysis |
| **Fact-Check Engine** | RAG over verified sources | Claim verification |
| **Bias Classifier** | Fine-tuned classifier | Political lean detection |
| **Source Database** | PostgreSQL + embeddings | Source reputation tracking |
| **Legal Shield Agent** | LLM + rules engine | Pre-publish legal review, language reframing |
| **Legal Precedent DB** | PostgreSQL + case embeddings | Media law cases, jurisdiction rules |
| **Risk Scoring Engine** | Custom ML model | High-profile subject flagging |

---

## Risks & Mitigations (Pre-mortem Analysis)

### Critical Risks

| Risk | Likelihood | Impact | Prevention |
|------|------------|--------|------------|
| **"Ministry of Truth" perception** | High | Critical | Transparent methodology, third-party audits, user appeals, humble language |
| **Platform blocking** | High | Critical | Early partnerships, standalone news reader, legal prep |
| **Accuracy catastrophe** | Medium | Critical | "Developing story" mode, confidence thresholds, rapid corrections |
| **Filter bubble backfire** | Medium | High | Balance metrics, honest marketing, mandatory perspective prompts |
| **Scale economics death** | High | Critical | Aggressive caching, B2B revenue, smaller fine-tuned models |
| **Legal challenges** | Medium | High | "Our analysis suggests" language, opinion framing, media law review |

### The Core Risk

> **The biggest risk isn't getting the AI wrong. It's being perceived as the arbiter of truth.**

Think Social must position itself as a **tool that helps you see more**, not a **judge that tells you what's true**.

### Mitigation Strategies

**1. Radical Transparency**
- Publish methodology and training data sources
- Show confidence intervals on all ratings
- Third-party annual bias audits by independent academics
- Open-source the classification models

**2. Humble Language**
- Never say "false" — say "we found conflicting information"
- Never say "biased" — say "leans [direction] of center"
- Always frame as "our analysis suggests" not definitive judgment
- Show the evidence, let users decide

**3. User Control**
- Appeals process with human review
- Users can mark "I disagree with this rating"
- Adjustable sensitivity settings
- Option to see methodology for any rating

**4. Breaking News Protocol**
- "Developing story" mode with clear caveats
- Require 3+ sources before rating breaking news
- Higher confidence threshold for current events
- Prominent, immediate corrections when wrong

**5. Platform Strategy**
- Approach platforms as partners, not adversaries
- Build standalone news reader as backup
- Pre-emptive legal strategy
- User community to pressure for access

**6. Economic Resilience**
- Aggressive caching of popular content
- Tiered analysis (light for free, deep for Pro)
- B2B revenue from newsrooms/enterprises from day 1
- Fine-tuned smaller models to reduce LLM costs

---

## Success Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| **Downloads** | 500K browser extension installs |
| **DAU** | 50K daily active users |
| **Conversion to Pro** | 5% of free users |
| **Posts analyzed** | 10M posts/month |
| **Share prevention** | 20% of 🔴 shares cancelled after warning |
| **NPS** | > 40 |

---

## Tagline Options

1. **"Peer under the hood. You decide."**
2. **"See what's behind the story."**
3. **"The full picture, before you share."**
4. **"Look deeper. Think clearer."**
5. **"We show you more. You decide what to believe."**

**Positioning statement:**
> Think Social doesn't tell you what to think. We show you what's under the hood of any story — the sources, the perspectives, the context — so you can make your own informed decision.

---

## Design Artifacts

### Interactive UX Prototype

An interactive HTML prototype demonstrates the core user experience:

**Location:** [`/prototype/index.html`](../../prototype/index.html)

**What it shows:**
- Traffic light badges (🟢🟡🔴) integrated into Twitter/X feed
- "Under the Hood" panel with 5-dimension analysis
- Three content scenarios: news, commentary, misinformation
- Dark mode design matching Twitter/X aesthetic

**To view:** Open the file in any browser

### UX Design Specification

Comprehensive design documentation available at:

**Location:** [`ux-design-spec.md`](./ux-design-spec.md)

**Contents:**
- Visual design system (colors, typography, icons)
- Component specifications (badge, panel, dimensions)
- User flows and interaction patterns
- Responsive behavior
- Accessibility requirements
- Implementation reference (CSS, classes)

---

## Next Steps

1. ~~**Prototype** — Browser extension MVP (Twitter only)~~ ✅ Complete
2. ~~**UX Design** — Interactive prototype~~ ✅ Complete
3. **Validate demand** — Landing page + waitlist
4. **User testing** — Test prototype with 10-20 users
5. **Bias model** — Train/fine-tune political lean classifier
6. **Source database** — Seed with 1000 top sources

---

*Think Social — Because what you consume shapes what you believe.*
