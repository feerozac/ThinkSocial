# Think Social

> *Peer under the hood. You decide.*

---

## Project Status

**Stage:** MVP Development  
**Created:** 2026-01-29

---

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key (for Claude)
- Chrome browser

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm run dev
```

The API will start on http://localhost:3001

### Extension Setup

```bash
cd extension
npm install
npm run build
```

Then load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### Testing

1. Start the backend server
2. Load the extension in Chrome
3. Go to Twitter/X
4. Scroll through posts - traffic light badges will appear

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Chrome     │────▶│  Backend    │────▶│  Claude     │
│  Extension  │     │  API        │     │  API        │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Project Structure

```
think-social/
├── extension/           # Chrome extension (Manifest V3)
│   ├── src/
│   │   ├── content.ts   # Injects into Twitter
│   │   ├── background.ts # Service worker
│   │   └── popup.ts     # Extension popup
│   └── manifest.json
├── backend/             # Express API server
│   ├── src/
│   │   ├── index.ts     # Express server
│   │   ├── analyze.ts   # Claude integration
│   │   └── cache.ts     # Redis caching
│   └── package.json
└── _bmad-output/        # Product planning docs
```

---

## Quick Links

| Document | Path |
|----------|------|
| Product Brief | `_bmad-output/planning-artifacts/product-brief-think-social.md` |

---

## Features (MVP)

- 🚦 Traffic light badges on Twitter/X posts
- 🔍 "Under the Hood" panel with 5 analysis dimensions
- 📊 Perspective, Verification, Balance, Source, Tone
- 💾 Caching to reduce API costs
- 🔒 Rate limiting (50 posts/day free tier)

---

## Environment Variables

### Backend (.env)

```
ANTHROPIC_API_KEY=sk-ant-...  # Required
REDIS_URL=redis://...          # Optional (for caching)
PORT=3001                      # Optional
```

---

## BMAD Agents Available

| Agent | Command |
|-------|---------|
| Business Analyst | `@_bmad/bmm/agents/analyst.md` |
| Product Manager | `@_bmad/bmm/agents/pm.md` |
| UX Designer | `@_bmad/bmm/agents/ux-designer.md` |
| Architect | `@_bmad/bmm/agents/architect.md` |
| Developer | `@_bmad/bmm/agents/dev.md` |

---

*Think Social — Because what you consume shapes what you believe.*
