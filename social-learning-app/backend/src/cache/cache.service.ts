import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    });
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async setUserSession(userId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    await this.set(`user:session:${userId}`, sessionData, ttl);
  }

  async getUserSession<T>(userId: string): Promise<T | null> {
    return this.get<T>(`user:session:${userId}`);
  }

  async setFeedCache(userId: string, feedData: any, ttl: number = 300): Promise<void> {
    await this.set(`feed:${userId}`, feedData, ttl);
  }

  async getFeedCache<T>(userId: string): Promise<T | null> {
    return this.get<T>(`feed:${userId}`);
  }

  async invalidateFeedCache(userId: string): Promise<void> {
    await this.del(`feed:${userId}`);
  }

  async setInsightEngagement(insightId: string, engagement: any, ttl: number = 3600): Promise<void> {
    await this.set(`insight:engagement:${insightId}`, engagement, ttl);
  }

  async getInsightEngagement<T>(insightId: string): Promise<T | null> {
    return this.get<T>(`insight:engagement:${insightId}`);
  }

  async incrementCounter(key: string, expireSeconds?: number): Promise<number> {
    const multi = this.redis.multi();
    multi.incr(key);
    
    if (expireSeconds) {
      multi.expire(key, expireSeconds);
    }
    
    const results = await multi.exec();
    return results ? results[0][1] as number : 0;
  }

  async setRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.incrementCounter(key, windowSeconds);
    return current <= limit;
  }

  async setHackerNewsStories(stories: any, ttl: number = 300): Promise<void> {
    await this.set('hn:top_stories', stories, ttl);
  }

  async getHackerNewsStories<T>(): Promise<T | null> {
    return this.get<T>('hn:top_stories');
  }

  async setHackerNewsStory(storyId: number, story: any, ttl: number = 3600): Promise<void> {
    await this.set(`hn:story:${storyId}`, story, ttl);
  }

  async getHackerNewsStory<T>(storyId: number): Promise<T | null> {
    return this.get<T>(`hn:story:${storyId}`);
  }

  async invalidateHackerNewsCache(): Promise<void> {
    const keys = ['hn:top_stories'];
    await Promise.all(keys.map(key => this.del(key)));
  }
}