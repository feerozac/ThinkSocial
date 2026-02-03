# Product Brief: Think Social

**Version:** 1.0  
**Date:** 2026-01-29  
**Author:** Mark  
**Status:** Discovery

---

## Executive Summary

**Think Social** is a consumer media literacy tool that displays "health warning labels" for social media content — like nutrition facts on food packaging. Using AI-powered analysis, it gives users instant visibility into bias, truthfulness, and balance of what they're reading, helping them **know before they share**.

---

## The Big Idea

> **"Nutrition labels for your news feed."**

Just as food products carry mandatory health warnings and nutrition facts, social media content should come with a **Media Health Label** — a simple traffic light system that tells you:

- 🟢 **Green** — Balanced, factual, verified
- 🟡 **Amber** — Caution — bias detected, unverified claims, or one-sided
- 🔴 **Red** — Warning — significant bias, misleading, or factually inaccurate

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

### The Media Health Label

```
┌─────────────────────────────────────────────┐
│         MEDIA HEALTH LABEL                  │
│         ══════════════════                  │
├─────────────────────────────────────────────┤
│                                             │
│  OVERALL RATING:  🟡 CAUTION                │
│                                             │
├─────────────────────────────────────────────┤
│  BREAKDOWN:                                 │
│                                             │
│  Bias            🟡  Moderate left lean     │
│  Factual         🟢  Claims verified        │
│  Balance         🔴  One perspective only   │
│  Source          🟢  Established outlet     │
│  Emotional Tone  🟡  Moderate sensationalism│
│                                             │
├─────────────────────────────────────────────┤
│  WHAT THIS MEANS:                           │
│  This post presents factual information     │
│  but only shows one side of the story.      │
│  Consider seeking alternative viewpoints.   │
│                                             │
├─────────────────────────────────────────────┤
│  📚 Learn more  |  🔗 See sources           │
└─────────────────────────────────────────────┘
```

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

## Competitive Landscape

| Competitor | What They Do | Think Social Advantage |
|------------|--------------|------------------------|
| **NewsGuard** | Browser extension with source ratings | We rate individual posts, not just sources |
| **Ground News** | Shows same story from left/right/center | We integrate into your existing feed |
| **Snopes / PolitiFact** | Manual fact-checking | We're real-time and automated |
| **Twitter Community Notes** | Crowdsourced context | We're consistent, not politicized |
| **Media Bias/Fact Check** | Static source ratings | We're dynamic and post-level |

### Positioning

> **Think Social is the only tool that brings food-style health warnings to your social media feed — instant, visual, and integrated where you already scroll.**

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
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Browser    │────▶│  Think      │────▶│  Analysis   │
│  Extension  │     │  Social API │     │  Engine     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
             ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
             │  Fact-Check │          │  Bias       │          │  Source     │
             │  Engine     │          │  Classifier │          │  Database   │
             └─────────────┘          └─────────────┘          └─────────────┘
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

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Accusations of bias** | "Who watches the watchers?" | Transparent methodology, open-source scoring |
| **Platform blocking** | Twitter/Meta block extension | Mobile app as fallback, API partnerships |
| **AI errors** | Wrong ratings damage trust | Confidence scores, human appeal process |
| **Scale/cost** | LLM costs at consumer scale | Caching, tiered analysis, efficient models |
| **Filter bubble reinforcement** | Users only trust 🟢 content | Encourage diverse consumption, not avoidance |
| **Legal/defamation** | Labeling content as "false" | Careful language, "our analysis suggests" |

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

1. **"Know before you share."**
2. **"Nutrition labels for your news feed."**
3. **"See the whole story."**
4. **"Think before you scroll."**
5. **"Media health, at a glance."**

---

## Next Steps

1. **Validate demand** — Landing page + waitlist
2. **Prototype** — Browser extension MVP (Twitter only)
3. **Bias model** — Train/fine-tune political lean classifier
4. **Source database** — Seed with 1000 top sources
5. **User testing** — 100 beta users, iterate on UX

---

*Think Social — Because what you consume shapes what you believe.*
