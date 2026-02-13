// Think Social - Backend API Server

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { analyzePost } from './analyze';
import { initCache, getCachedAnalysis, cacheAnalysis, isCacheAvailable } from './cache';
import { isVisionAvailable } from './vision';
import { isSearchAvailable } from './search';
import { AnalyzeRequest, AnalyzeResponse } from './types';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any chrome extension
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    // Allow localhost (any port)
    if (origin.match(/^http:\/\/localhost(:\d+)?$/)) return callback(null, true);
    // Allow Twitter/X, Facebook, Instagram
    const allowedOrigins = [
      'https://twitter.com', 'https://x.com',
      'https://www.facebook.com', 'https://facebook.com',
      'https://www.instagram.com', 'https://instagram.com'
    ];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Block everything else
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    cache: isCacheAvailable() ? 'connected' : 'disconnected',
    vision: isVisionAvailable() ? 'enabled (Qwen VL)' : 'disabled (no QWEN_API_KEY)',
    search: isSearchAvailable() ? 'enabled (Tavily)' : 'disabled (no TAVILY_API_KEY)',
    timestamp: new Date().toISOString()
  });
});

// Main analysis endpoint
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls } = req.body as AnalyzeRequest;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      const response: AnalyzeResponse = {
        success: false,
        error: 'Missing or invalid "text" field'
      };
      res.status(400).json(response);
      return;
    }
    
    // Check text length
    if (text.length < 10) {
      const response: AnalyzeResponse = {
        success: false,
        error: 'Text too short to analyze'
      };
      res.status(400).json(response);
      return;
    }
    
    if (text.length > 5000) {
      const response: AnalyzeResponse = {
        success: false,
        error: 'Text too long (max 5000 characters)'
      };
      res.status(400).json(response);
      return;
    }
    
    // Check cache first
    const cached = await getCachedAnalysis(text);
    if (cached) {
      const response: AnalyzeResponse = {
        success: true,
        analysis: cached,
        cached: true
      };
      res.json(response);
      return;
    }
    
    // Perform analysis (routes through Qwen VL for visual content, then DeepSeek for structured analysis)
    const analysis = await analyzePost(
      text,
      author || 'Unknown',
      hasVideo || false,
      videoDescription || '',
      videoThumbnailUrl || '',
      imageUrls || []
    );
    
    // Cache the result
    await cacheAnalysis(text, analysis);
    
    const response: AnalyzeResponse = {
      success: true,
      analysis,
      cached: false
    };
    
    res.json(response);
  } catch (error) {
    console.error('[Inkline] API error:', error);
    
    const response: AnalyzeResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Inkline] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize cache and start server
async function start(): Promise<void> {
  // Initialize Redis cache
  initCache();
  
  // Start server
  app.listen(PORT, () => {
    console.log(`[Inkline] Server running on port ${PORT}`);
    console.log(`[Inkline] Health check: http://localhost:${PORT}/health`);
    console.log(`[Inkline] Analyze endpoint: http://localhost:${PORT}/api/analyze`);
  });
}

start().catch((error) => {
  console.error('[Inkline] Failed to start server:', error);
  process.exit(1);
});
