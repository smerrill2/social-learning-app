import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';

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

  constructor(
    @InjectRepository(HackerNewsStory)
    private storyRepository: Repository<HackerNewsStory>,
    private cacheService: CacheService,
  ) {}

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
    
    const storyEntity = {
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