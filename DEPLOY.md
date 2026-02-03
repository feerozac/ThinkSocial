# Think Social - Deployment Guide

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Create Railway account** at https://railway.app

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Deploy:**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Set environment variables:**
   ```bash
   railway variables set DEEPSEEK_API_KEY=sk-your-deepseek-key
   railway variables set REDIS_URL=your-upstash-url  # Optional
   ```

5. **Get your API URL:**
   ```bash
   railway domain
   ```

### Option 2: Render

1. **Create Render account** at https://render.com

2. **Create Web Service:**
   - Connect your GitHub repo
   - Select the `backend` folder as root
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

3. **Set environment variables** in Render dashboard

### Option 3: Docker (Self-hosted)

```bash
cd backend
docker build -t think-social-api .
docker run -d -p 3001:3001 \
  -e DEEPSEEK_API_KEY=sk-your-deepseek-key \
  -e REDIS_URL=redis://... \
  think-social-api
```

---

## Redis Cache (Upstash)

1. **Create free account** at https://upstash.com

2. **Create Redis database:**
   - Select region closest to your backend
   - Copy the REST URL

3. **Set REDIS_URL** in your backend environment

---

## Extension Deployment

### Development/Testing

```bash
cd extension
npm install
npm run build
```

Then load in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### Production

1. **Package the extension:**
   ```bash
   cd extension
   ./package-extension.sh
   ```

2. **Update API URL:**
   Edit `src/background.ts` and change `API_URL` to your deployed backend URL.

3. **Rebuild and repackage:**
   ```bash
   npm run build
   ./package-extension.sh
   ```

4. **Submit to Chrome Web Store:**
   - Go to https://chrome.google.com/webstore/devconsole
   - Upload `dist/think-social-extension.zip`
   - Fill in store listing details

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | Your DeepSeek API key (get at https://platform.deepseek.com/) |
| `REDIS_URL` | No | Upstash Redis URL for caching |
| `PORT` | No | Server port (default: 3001) |

---

## Post-Deployment Checklist

- [ ] Backend health check passes: `curl https://your-api.com/health`
- [ ] Extension loads without errors
- [ ] Test analysis on a Twitter post
- [ ] Verify caching works (check Redis or logs)
- [ ] Rate limiting works correctly
