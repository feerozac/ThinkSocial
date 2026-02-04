# UX Design Specification: Think Social

**Author:** Product Team  
**Date:** 2026-02-04  
**Version:** 1.0  
**Status:** MVP Design Complete

---

## Executive Summary

This document defines the user experience design for Think Social, a media transparency browser extension. The design follows our core philosophy: **"Peer under the hood. You decide."**

**Interactive Prototype:** [`/prototype/index.html`](../../prototype/index.html)

---

## Design Principles

### 1. Non-Intrusive Transparency
- Badges appear subtly within the existing Twitter/X interface
- Information is available on-demand, not forced
- Users maintain control of their feed experience

### 2. Empowerment Over Judgment
- We show evidence, not verdicts
- Language is humble and suggestive, not authoritative
- Users are the final arbiter of what to believe

### 3. Progressive Disclosure
- Quick signal (traffic light) for at-a-glance assessment
- Detailed panel for those who want to dig deeper
- Full transparency on methodology for power users

### 4. Platform-Native Feel
- Matches Twitter/X dark mode aesthetic
- Uses familiar interaction patterns
- Feels like a natural extension of the platform

---

## Visual Design System

### Color Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Green Signal | Emerald | `#10B981` | Multiple sources agree |
| Amber Signal | Amber | `#F59E0B` | Worth a closer look |
| Red Signal | Red | `#EF4444` | Dig deeper |
| Background | Dark | `#16181C` | Panel background |
| Border | Gray | `#2F3336` | Dividers, borders |
| Primary Text | White | `#E7E9EA` | Headlines, body |
| Secondary Text | Gray | `#71767B` | Labels, metadata |

### Typography

| Element | Style |
|---------|-------|
| Panel Title | 14px, Bold, Uppercase, 0.5px letter-spacing |
| Section Title | 11px, Bold, Uppercase, 0.5px letter-spacing, Gray |
| Body Text | 14px, Regular |
| Dimension Names | 13px, Regular, Gray |
| Dimension Labels | 13px, Regular |

### Iconography

| Icon | Meaning |
|------|---------|
| 🔍 | Under the Hood panel |
| 🟢 | Green rating / Multiple sources agree |
| 🟡 | Amber rating / Worth a closer look |
| 🔴 | Red rating / Dig deeper |
| ✕ | Close panel |

---

## Component Specifications

### 1. Traffic Light Badge

**Purpose:** Quick visual signal on each post

**Placement:** Left of the tweet action bar (reply, retweet, like, share)

**States:**
| State | Appearance |
|-------|------------|
| Loading | Animated spinner, gray |
| Green | Solid green dot with subtle glow |
| Amber | Solid amber dot with subtle glow |
| Red | Solid red dot with subtle glow |
| Error | Warning icon (⚠️) |

**Dimensions:**
- Container: 34px × 34px
- Light indicator: 12px diameter
- Border radius: 50%
- Hover state: 10% white background overlay

**Interaction:**
- Hover: Show tooltip with quick signal text
- Click: Open "Under the Hood" panel

```
┌──────────────────────────────────────────────────────────────┐
│ [Avatar] Display Name @username · 2h                         │
│                                                              │
│ Tweet content goes here...                                   │
│                                                              │
│ [●] [💬 124] [🔁 892] [❤️ 3.2K] [📊 142K]                    │
│  ↑                                                           │
│  Traffic Light Badge                                         │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. Under the Hood Panel

**Purpose:** Detailed analysis breakdown on demand

**Trigger:** Click on traffic light badge

**Position:** Floating panel adjacent to the tweet (right side on desktop, below on mobile)

**Dimensions:**
- Width: 320px
- Border radius: 16px
- Shadow: `0 8px 28px rgba(0, 0, 0, 0.5)`

**Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 UNDER THE HOOD                                      [✕]  │  ← Header
├─────────────────────────────────────────────────────────────┤
│ QUICK SIGNAL:  🟡 Worth a closer look                       │  ← Signal
├─────────────────────────────────────────────────────────────┤
│ WHAT WE FOUND:                                              │  ← Dimensions
│                                                             │
│  Perspective     🟡  Leans progressive                      │
│  Verification    🟢  Based on real event                    │
│  Other Views     🟡  One-sided framing                      │
│  Source History  🟡  Commentary account                     │
│  Tone            🟡  Emotional framing                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ THE FULL PICTURE:                                           │  ← Summary
│                                                             │
│ This is political commentary on a real news event.          │
│ The interpretation is presented as fact without             │
│ acknowledging alternative perspectives.                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Confidence: 78%                          🔍 Think Social    │  ← Footer
└─────────────────────────────────────────────────────────────┘
```

**Section Specifications:**

| Section | Padding | Border |
|---------|---------|--------|
| Header | 12px 16px | Bottom: 1px #2F3336 |
| Signal | 12px 16px | None |
| Dimensions | 0 16px 12px | Top/Bottom: 1px #2F3336 |
| Summary | 12px 16px | None |
| Footer | 10px 16px | Top: 1px #2F3336 |

---

### 3. Analysis Dimensions

**The 5 Dimensions:**

| Dimension | Display Name | What It Measures |
|-----------|--------------|------------------|
| perspective | Perspective | Political/ideological lean |
| verification | Verification | Can claims be verified? |
| balance | Other Views | Are multiple perspectives shown? |
| source | Source History | Credibility of the source |
| tone | Tone | Emotional manipulation level |

**Rating Definitions:**

| Rating | Perspective | Verification | Other Views | Source History | Tone |
|--------|-------------|--------------|-------------|----------------|------|
| 🟢 Green | Center/balanced | Claims verified | Multiple sides | Established outlet | Neutral, factual |
| 🟡 Amber | Leans left/right | Unverified/developing | Limited views | Mixed track record | Some emotional framing |
| 🔴 Red | Strong ideological | Conflicts with facts | One-sided | Anonymous/unreliable | Heavy manipulation |

---

### 4. Quick Signal Labels

| Rating | Label | Implication |
|--------|-------|-------------|
| 🟢 Green | "Multiple sources agree" | Low friction, consume normally |
| 🟡 Amber | "Worth a closer look" | Pause and consider |
| 🔴 Red | "Dig deeper" | Exercise caution |

---

## User Flows

### Flow 1: Passive Discovery

```
User scrolls Twitter
       ↓
Sees traffic light badge on post
       ↓
┌─────────────────────────────┐
│ Badge is GREEN              │──→ User continues scrolling (trust signal)
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│ Badge is AMBER/RED          │──→ User notices, may investigate
└─────────────────────────────┘
```

### Flow 2: Active Investigation

```
User sees AMBER/RED badge
       ↓
Clicks badge
       ↓
Panel opens with analysis
       ↓
┌─────────────────────────────┐
│ User reads dimensions       │
│ User reads summary          │
│ User checks confidence      │
└─────────────────────────────┘
       ↓
User makes informed decision about content
       ↓
Clicks outside or X to close panel
```

### Flow 3: Share Prevention (Future)

```
User clicks Retweet on RED content
       ↓
Think Social intercepts
       ↓
Shows warning: "This post has concerns. Share anyway?"
       ↓
┌─────────────────────────────┐
│ User shares anyway          │──→ Proceed with share
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│ User cancels                │──→ Share cancelled (success!)
└─────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (>1000px)
- Panel appears to the right of the tweet
- Full 320px width
- Positioned vertically centered with tweet

### Tablet/Narrow (600-1000px)
- Panel appears below the badge
- Centered horizontally
- Same 320px width

### Mobile (<600px)
- Panel appears as bottom sheet
- Full width minus padding
- Slides up from bottom

---

## Animation & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Badge hover | Background fade | 200ms | ease |
| Panel open | Opacity fade | 200ms | ease |
| Panel close | Opacity fade | 200ms | ease |
| Loading spinner | Rotate | 1000ms | linear, infinite |

---

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio minimum)
- Traffic lights use distinct hues, not just saturation
- Emoji indicators provide redundant encoding

### Keyboard Navigation
- Tab to badge
- Enter/Space to open panel
- Escape to close panel
- Tab through panel elements

### Screen Readers
- Badge: "Think Social analysis: [rating]. Click to see details."
- Panel: Semantic headings and labels
- Dimensions: "[Dimension]: [rating], [label]"

---

## Example Content Scenarios

### Scenario 1: Wire Service News (Green)

**Tweet:** "BREAKING: Federal Reserve holds interest rates steady, citing balanced economic indicators."

**Analysis:**
- Perspective: 🟢 Neutral reporting
- Verification: 🟢 Official source cited
- Other Views: 🟢 Multiple factors noted
- Source History: 🟢 Major wire service
- Tone: 🟢 Factual, no spin

**Summary:** "Straightforward news reporting from a major wire service. Presents official information without editorializing."

---

### Scenario 2: Political Commentary (Amber)

**Tweet:** "The Fed's decision shows they're more concerned about Wall Street than Main Street. Working families continue to struggle!"

**Analysis:**
- Perspective: 🟡 Leans progressive
- Verification: 🟢 Based on real event
- Other Views: 🟡 One-sided framing
- Source History: 🟡 Commentary account
- Tone: 🟡 Emotional framing

**Summary:** "Political commentary on a real news event. The interpretation is presented as fact without acknowledging alternative perspectives."

---

### Scenario 3: Misinformation (Red)

**Tweet:** "🚨 EXPOSED: The Fed's secret meeting with globalist bankers PROVES the economy is about to COLLAPSE! Share before they delete this!!"

**Analysis:**
- Perspective: 🔴 Conspiratorial framing
- Verification: 🔴 Unverified claims
- Other Views: 🔴 Dismisses mainstream
- Source History: 🔴 Anonymous account
- Tone: 🔴 Fear/urgency tactics

**Summary:** "Uses classic misinformation patterns: urgency language, unverified 'insider' claims, and calls to share quickly. No credible sources cited."

---

## Implementation Reference

### CSS Custom Properties

```css
:root {
  /* Signal Colors */
  --ts-green: #10B981;
  --ts-amber: #F59E0B;
  --ts-red: #EF4444;
  
  /* Background */
  --ts-bg-panel: #16181C;
  --ts-bg-hover: rgba(255, 255, 255, 0.1);
  
  /* Borders */
  --ts-border: #2F3336;
  
  /* Text */
  --ts-text-primary: #E7E9EA;
  --ts-text-secondary: #71767B;
  
  /* Spacing */
  --ts-panel-width: 320px;
  --ts-panel-radius: 16px;
  --ts-badge-size: 34px;
  --ts-light-size: 12px;
}
```

### Component Classes

| Class | Element |
|-------|---------|
| `.think-social-badge` | Badge container |
| `.think-social-light` | Light indicator |
| `.think-social-panel` | Panel container |
| `.ts-panel-header` | Panel header |
| `.ts-panel-signal` | Quick signal section |
| `.ts-dimensions` | Dimensions list |
| `.ts-dimension` | Single dimension row |
| `.ts-summary` | Summary section |
| `.ts-panel-footer` | Footer with confidence |

---

## Prototype

An interactive HTML prototype is available for testing and demonstration:

**Location:** `/prototype/index.html`

**Features demonstrated:**
- Traffic light badges on sample tweets
- Click interaction to open panels
- All 5 analysis dimensions
- Three rating types (green, amber, red)
- Real content scenarios

**To view:** Open `prototype/index.html` in any browser

---

## Next Steps

1. **User Testing** — Test prototype with 10-20 users
2. **Iteration** — Refine based on feedback
3. **Extension Build** — Implement in Chrome extension
4. **A/B Testing** — Test badge placement options
5. **Mobile Design** — Adapt for mobile browser/app

---

*Think Social — Peer under the hood. You decide.*
