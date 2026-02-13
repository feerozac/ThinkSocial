// Think Social - Redis Caching Layer

import Redis from 'ioredis';
import crypto from 'crypto';
import { AnalysisResult } from './types';

// Redis client - will connect to Upstash or local Redis
let redis: Redis | null = null;

// Initialize Redis connection
export function initCache(): void {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });
      
      redis.on('connect', () => {
        console.log('[Inkline] Redis connected');
      });
      
      redis.on('error', (err) => {
        console.error('[Inkline] Redis error:', err.message);
      });
      
      // Connect
      redis.connect().catch((err) => {
        console.error('[Inkline] Redis connection failed:', err.message);
        redis = null;
      });
    } catch (error) {
      console.error('[Inkline] Redis init error:', error);
      redis = null;
    }
  } else {
    console.log('[Inkline] No REDIS_URL configured, caching disabled');
  }
}

// Generate cache key from post content
function generateCacheKey(text: string): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  return `ts:analysis:${hash}`;
}

// Cache TTL in seconds (24 hours)
const CACHE_TTL = 24 * 60 * 60;

// Get cached analysis
export async function getCachedAnalysis(text: string): Promise<AnalysisResult | null> {
  if (!redis) return null;
  
  try {
    const key = generateCacheKey(text);
    const cached = await redis.get(key);
    
    if (cached) {
      console.log('[Inkline] Cache hit:', key);
      return JSON.parse(cached) as AnalysisResult;
    }
    
    console.log('[Inkline] Cache miss:', key);
    return null;
  } catch (error) {
    console.error('[Inkline] Cache get error:', error);
    return null;
  }
}

// Save analysis to cache
export async function cacheAnalysis(text: string, analysis: AnalysisResult): Promise<void> {
  if (!redis) return;
  
  try {
    const key = generateCacheKey(text);
    await redis.setex(key, CACHE_TTL, JSON.stringify(analysis));
    console.log('[Inkline] Cached:', key);
  } catch (error) {
    console.error('[Inkline] Cache set error:', error);
  }
}

// Check if cache is available
export function isCacheAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

// Close Redis connection
export async function closeCache(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
