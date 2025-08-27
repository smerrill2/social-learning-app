import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

interface HackerNewsApiStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  time: number;
  descendants: number;
  kids?: number[];
  type: string;
}

@Injectable()
export class HackerNewsService {
  private readonly logger = new Logger(HackerNewsService.name);
  private readonly baseUrl = 'https://hacker-news.firebaseio.com/v0';
  private ai: GoogleGenerativeAI | null = null;
  private summarizationEnabled = false;

  constructor(
    @InjectRepository(HackerNewsStory)
    private storyRepository: Repository<HackerNewsStory>,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_GENAI_API_KEY') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');

    this.logger.debug(`🔑 API Key check: ${apiKey ? 'Found' : 'Missing'}`);

    if (!apiKey) {
      this.logger.warn('Google GenAI API key not found; summarization disabled.');
      this.ai = null;
      this.summarizationEnabled = false;
    } else {
      this.ai = new GoogleGenerativeAI(apiKey);
      this.summarizationEnabled = true;
    }
  }

  async getTopStories(limit: number = 50, offset: number = 0) {
    const cacheKey = `hn:fresh:stories:${limit}:${offset}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}, querying database`);
    const startTime = Date.now();

    const stories = await this.storyRepository
      .createQueryBuilder('story')
      .where('story.time >= :timeThreshold', {
        timeThreshold: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
      })
      .orderBy('story.score', 'DESC')
      .addOrderBy('story.time', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    const queryTime = Date.now() - startTime;
    this.logger.debug(`Fresh stories query completed in ${queryTime}ms, found ${stories.length} stories`);

    const result = {
      stories: stories.map(story => ({
        ...story,
        timeAgo: this.getTimeAgo(story.time),
        domain: this.extractDomain(story.url),
      })),
      pagination: {
        limit,
        offset,
        hasMore: stories.length === limit,
      },
    };

    await this.cacheService.set(cacheKey, result, 300); // 5 minutes
    return result;
  }

  async syncTopStories(): Promise<void> {
    try {
      this.logger.log('Starting sync of top HackerNews stories...');
      
      // Fetch top story IDs
      const topStoryIds = await this.fetchTopStoryIds();
      const storiesToFetch = topStoryIds.slice(0, 100); // Get top 100

      // Fetch story details in batches
      const batchSize = 10;
      for (let i = 0; i < storiesToFetch.length; i += batchSize) {
        const batch = storiesToFetch.slice(i, i + batchSize);
        await Promise.all(batch.map(id => this.fetchAndSaveStory(id)));
      }

      // Clear relevant caches
      await this.clearStoryCaches();
      
      this.logger.log(`Synced ${storiesToFetch.length} HackerNews stories`);
      // Focus on top trending stories only - single batch to avoid rate limits  
      try {
        await this.summarizeMissingSummariesBatch(10); // Conservative batch size
      } catch (e) {
        this.logger.warn('Batch summarization after sync failed:', e);
      }
    } catch (error) {
      this.logger.error('Failed to sync HackerNews stories', error);
    }
  }

  private async fetchTopStoryIds(): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/topstories.json`);
    if (!response.ok) {
      throw new Error(`HackerNews API error: ${response.status}`);
    }
    return response.json();
  }

  private async fetchStoryDetails(id: number): Promise<HackerNewsApiStory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/item/${id}.json`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      this.logger.warn(`Failed to fetch story ${id}:`, error);
      return null;
    }
  }

  private async fetchAndSaveStory(id: number): Promise<void> {
    const storyData = await this.fetchStoryDetails(id);
    if (!storyData || storyData.type !== 'story') {
      return;
    }

    // Check if story already exists
    const existingStory = await this.storyRepository.findOne({ where: { id } });
    
    const storyEntity: Partial<HackerNewsStory> = {
      id: storyData.id,
      title: storyData.title,
      url: storyData.url || undefined,
      text: storyData.text || undefined,
      by: storyData.by,
      score: storyData.score,
      descendants: storyData.descendants || 0,
      time: new Date(storyData.time * 1000),
      kids: storyData.kids || [],
      type: storyData.type,
      fetchedAt: new Date(),
    };

    if (existingStory) {
      // Update existing story
      await this.storyRepository.update(id, storyEntity);
    } else {
      // Create new story
      const story = this.storyRepository.create(storyEntity);
      await this.storyRepository.save(story);
    }

    // Note: Individual summary generation removed to avoid rate limits
    // Summaries will be generated in batch after sync completes
  }

  private async generateUrlSummary(url: string, title?: string): Promise<string | null> {
    if (!this.summarizationEnabled || !this.ai) {
      this.logger.debug('Summarization disabled or AI client not configured. Skipping.');
      return null;
    }
    try {
      const prompt = [
        `Create a HackerNews-style summary for: ${url}`,
        `Rules: 2-3 sentences (80-120 words max). Start with what it actually is/does.`,
        `Include the key technical insight or why it matters.`,
        `${title?.includes('Show HN') ? 'Focus on what the creator built and its unique features.' : ''}`,
        `Avoid filler phrases. Be direct and factual, no marketing speak.`,
      ].join(' ');

      this.logger.debug(`🤖 Generating summary for: ${url}`);
      const ai = this.ai; // local narrowing for TS
      if (!ai) return null;
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      if (!text) return null;
      // Trim and cap length to about 200 words
      const words = text.split(/\s+/);
      if (words.length > 220) {
        return words.slice(0, 220).join(' ') + '...';
      }
      return text;
    } catch (error) {
      this.logger.error('Error generating URL summary:', error);
      return null;
    }
  }

  // Batch summarization focused on top trending stories only
  async summarizeMissingSummariesBatch(maxBatch: number = 15): Promise<void> {
    if (!this.summarizationEnabled || !this.ai) {
      this.logger.debug('Summarization disabled; skipping batch summarization.');
      return;
    }
    this.logger.log(`🔍 Starting batch summarization for top trending stories (max: ${maxBatch})`);
    
    // Only focus on fresh, high-scoring stories (trending content)
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const now = Date.now();
    
    // Get top 50 stories by score that are < 2 days old
    const trendingCandidates = await this.storyRepository
      .createQueryBuilder('story')
      .where('story.time >= :timeThreshold', {
        timeThreshold: new Date(now - twoDaysMs) // Last 2 days only
      })
      .andWhere('story.url IS NOT NULL') // Must have URL
      .orderBy('story.score', 'DESC') // Highest scoring first
      .addOrderBy('story.time', 'DESC') // Then most recent
      .limit(50) // Top 50 trending stories
      .getMany();

    this.logger.log(`📊 Found ${trendingCandidates.length} trending candidates from last 2 days`);

    // Filter for stories missing summaries or with stale summaries
    const needsSummary = trendingCandidates
      .filter(s => !s.summary || !s.summaryUpdatedAt || (now - new Date(s.summaryUpdatedAt).getTime()) > twelveHoursMs)
      .slice(0, maxBatch); // Limit to API-safe batch size

    this.logger.log(`📝 ${needsSummary.length} trending stories need summaries`);

    if (needsSummary.length === 0) {
      this.logger.log('✅ No stories need summaries');
      return;
    }

    const urls = needsSummary.map(s => s.url as string);

    const prompt = [
      'For each URL, fetch the content and create a HackerNews-style summary. Follow these rules:',
      '• Keep it 2-3 sentences (80-120 words max)',
      '• Start with what it actually is/does, not generic descriptions',
      '• Include the key technical insight or why it matters',
      '• For Show HN posts: focus on what the creator built and its unique features', 
      '• Avoid filler phrases like "the article discusses" or "according to the post"',
      '• No marketing speak - be direct and factual',
      '• If you can\'t access the content, respond with null for that URL',
      '',
      'Respond as JSON array: [{"url": string, "summary": string | null}]',
      '',
      'URLs:',
      ...urls.map(u => `- ${u}`),
    ].join('\n');

    try {
      this.logger.log(`🤖 Batch summarizing ${urls.length} URLs`);
      const ai = this.ai; // local narrowing for TS
      if (!ai) return;
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      if (!text) {
        this.logger.warn('Batch summarization returned empty response');
        return;
      }

      // Try to parse JSON from the response
      let parsed: Array<{ url: string; summary: string }> | null = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract JSON block if model wrapped it with prose
        const match = text.match(/\[([\s\S]*)\]/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch {}
        }
      }

      if (!parsed || !Array.isArray(parsed)) {
        this.logger.warn('Batch summarization response was not valid JSON array');
        return;
      }

      const mapByUrl = new Map<string, string>();
      const failedUrls: string[] = [];
      
      for (const item of parsed) {
        if (item && typeof item.url === 'string') {
          if (typeof item.summary === 'string' && item.summary.trim() && item.summary !== 'null') {
            mapByUrl.set(item.url, item.summary);
          } else {
            failedUrls.push(item.url);
          }
        }
      }

      const updates = needsSummary
        .filter(s => s.url && mapByUrl.has(s.url))
        .map(s => ({ id: s.id, summary: mapByUrl.get(s.url as string) as string }));

      const failed = needsSummary
        .filter(s => s.url && !mapByUrl.has(s.url))
        .map(s => ({ id: s.id, url: s.url, title: s.title.substring(0, 50) + '...' }));

      await Promise.all(
        updates.map(u => this.storyRepository.update(u.id, { summary: u.summary, summaryUpdatedAt: new Date() }))
      );

      this.logger.log(`✅ Batch summarized ${updates.length} stories`);
      if (failed.length > 0) {
        this.logger.warn(`❌ Failed to summarize ${failed.length} stories:`, failed.map(f => f.title));
      }
    } catch (error) {
      this.logger.warn('Batch summarization failed:', error);
    }
  }

  private async clearStoryCaches(): Promise<void> {
    // Clear fresh story caches
    const keys = [
      'hn:fresh:stories:50:0', 
      'hn:fresh:stories:20:0', 
      'hn:fresh:stories:100:0',
      'hn:fresh:stories:25:0'
    ];
    await Promise.all(keys.map(key => this.cacheService.del(key)));
    this.logger.debug('Cleared fresh stories cache');
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  private extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  }
}
