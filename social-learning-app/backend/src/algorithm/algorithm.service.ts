import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Insight } from '../entities/insight.entity';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { CacheService } from '../cache/cache.service';

export interface FeedItem {
  id: string;
  type: 'insight' | 'hackernews' | 'research_paper';
  title: string;
  content?: string;
  abstract?: string;
  text?: string;
  url?: string;
  score: number;
  publishedDate: Date;
  category?: string;
  tags: string[];
  source: string;
  relevanceScore?: number;
}

export interface AlgorithmWeights {
  recencyBoost: number;      // 0-1
  popularityBoost: number;   // 0-1
  personalizedBoost: number; // 0-1
  diversityPenalty: number;  // 0-1
}

@Injectable()
export class AlgorithmService {
  private readonly logger = new Logger(AlgorithmService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Insight)
    private insightRepository: Repository<Insight>,
    @InjectRepository(HackerNewsStory)
    private hackerNewsRepository: Repository<HackerNewsStory>,
    @InjectRepository(ResearchPaper)
    private researchPaperRepository: Repository<ResearchPaper>,
    private cacheService: CacheService,
  ) {}

  async generatePersonalizedFeed(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: FeedItem[]; pagination: any }> {
    const cacheKey = `personalized_feed:${userId}:${limit}:${offset}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get user preferences
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.algorithmPreferences) {
      return this.getDefaultFeed(limit, offset);
    }

    const preferences = user.algorithmPreferences;
    
    // Fetch content from different sources based on user preferences
    const [insights, hackerNewsStories, researchPapers] = await Promise.all([
      this.fetchInsights(preferences, Math.ceil(limit * (preferences.contentTypes.insights / 100))),
      this.fetchHackerNewsStories(preferences, Math.ceil(limit * (preferences.contentTypes.hackernews / 100))),
      this.fetchResearchPapers(preferences, Math.ceil(limit * (preferences.contentTypes.researchPapers / 100))),
    ]);

    // Convert to unified feed items
    let feedItems: FeedItem[] = [
      ...this.convertInsightsToFeedItems(insights),
      ...this.convertHackerNewsToFeedItems(hackerNewsStories),
      ...this.convertResearchPapersToFeedItems(researchPapers),
    ];

    // Apply algorithm scoring
    feedItems = this.scoreAndRankItems(feedItems, preferences);

    // Apply diversity and final sorting
    feedItems = this.applyDiversityFiltering(feedItems);
    
    // Paginate results
    const paginatedItems = feedItems.slice(offset, offset + limit);

    const result = {
      items: paginatedItems,
      pagination: {
        limit,
        offset,
        total: feedItems.length,
        hasMore: offset + limit < feedItems.length,
      },
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  private async getDefaultFeed(limit: number, offset: number) {
    // Fallback to basic feed when user has no preferences
    const [insights, hackerNewsStories] = await Promise.all([
      this.insightRepository
        .createQueryBuilder('insight')
        .leftJoinAndSelect('insight.user', 'user')
        .orderBy('insight.createdAt', 'DESC')
        .limit(Math.ceil(limit / 2))
        .getMany(),
      this.hackerNewsRepository
        .createQueryBuilder('story')
        .orderBy('story.score', 'DESC')
        .limit(Math.ceil(limit / 2))
        .getMany(),
    ]);

    const feedItems: FeedItem[] = [
      ...this.convertInsightsToFeedItems(insights),
      ...this.convertHackerNewsToFeedItems(hackerNewsStories),
    ];

    const paginatedItems = feedItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        limit,
        offset,
        total: feedItems.length,
        hasMore: offset + limit < feedItems.length,
      },
    };
  }

  private async fetchInsights(preferences: any, limit: number): Promise<Insight[]> {
    if (limit <= 0) return [];

    const query = this.insightRepository
      .createQueryBuilder('insight')
      .leftJoinAndSelect('insight.author', 'author')
      .orderBy('insight.createdAt', 'DESC')
      .limit(limit * 2); // Fetch more for filtering

    return query.getMany();
  }

  private async fetchHackerNewsStories(preferences: any, limit: number): Promise<HackerNewsStory[]> {
    if (limit <= 0) return [];

    const query = this.hackerNewsRepository
      .createQueryBuilder('story')
      .orderBy('story.score', 'DESC')
      .limit(limit * 2); // Fetch more for filtering

    // Apply source preferences if available
    if (preferences.sourcePreferences?.hackernews < 50) {
      query.andWhere('story.score > :minScore', { minScore: 100 });
    }

    return query.getMany();
  }

  private async fetchResearchPapers(preferences: any, limit: number): Promise<ResearchPaper[]> {
    if (limit <= 0) return [];

    const query = this.researchPaperRepository
      .createQueryBuilder('paper')
      .orderBy('paper.publishedDate', 'DESC')
      .limit(limit * 2); // Fetch more for filtering

    // Apply research category preferences
    const categoryConditions: string[] = [];
    const categoryParams: any = {};

    if (preferences.researchCategories?.psychology > 30) {
      categoryConditions.push('(paper.classification->\'isPsychology\')::boolean = true');
    }
    if (preferences.researchCategories?.behavioralScience > 30) {
      categoryConditions.push('(paper.classification->\'isBehavioralScience\')::boolean = true');
    }
    if (preferences.researchCategories?.healthSciences > 30) {
      categoryConditions.push('(paper.classification->\'isHealthScience\')::boolean = true');
    }
    if (preferences.researchCategories?.neuroscience > 30) {
      categoryConditions.push('(paper.classification->\'isNeuroscience\')::boolean = true');
    }
    if (preferences.researchCategories?.cognitiveScience > 30) {
      categoryConditions.push('(paper.classification->\'isCognitiveScience\')::boolean = true');
    }
    if (preferences.researchCategories?.artificialIntelligence > 30) {
      categoryConditions.push('(paper.classification->\'isAI\')::boolean = true');
    }

    if (categoryConditions.length > 0) {
      query.andWhere(`(${categoryConditions.join(' OR ')})`, categoryParams);
    }

    return query.getMany();
  }

  private convertInsightsToFeedItems(insights: Insight[]): FeedItem[] {
    return insights.map(insight => ({
      id: insight.id,
      type: 'insight' as const,
      title: insight.content.substring(0, 100) + (insight.content.length > 100 ? '...' : ''), // Use content as title since there's no title field
      content: insight.content,
      score: 0, // Will be calculated by scoring algorithm
      publishedDate: insight.createdAt,
      tags: insight.tags || [],
      source: `@${insight.author?.email || 'user'}`,
      category: 'insights',
    }));
  }

  private convertHackerNewsToFeedItems(stories: HackerNewsStory[]): FeedItem[] {
    return stories.map(story => ({
      id: story.id.toString(),
      type: 'hackernews' as const,
      title: story.title,
      content: story.text,
      url: story.url,
      score: story.score,
      publishedDate: story.time,
      tags: this.extractTagsFromHackerNewsStory(story),
      source: 'Hacker News',
      category: 'tech',
    }));
  }

  private convertResearchPapersToFeedItems(papers: ResearchPaper[]): FeedItem[] {
    return papers.map(paper => ({
      id: paper.id,
      type: 'research_paper' as const,
      title: paper.title,
      abstract: paper.abstract,
      url: paper.abstractUrl,
      score: 0,
      publishedDate: paper.publishedDate,
      tags: paper.tags || [],
      source: `arXiv (${paper.authors.slice(0, 2).join(', ')}${paper.authors.length > 2 ? ' et al.' : ''})`,
      category: this.getPrimaryCategory(paper),
    }));
  }

  private getPrimaryCategory(paper: ResearchPaper): string {
    const classification = paper.classification;
    if (classification.isPsychology) return 'psychology';
    if (classification.isBehavioralScience) return 'behavioral-science';
    if (classification.isHealthScience) return 'health-science';
    if (classification.isNeuroscience) return 'neuroscience';
    if (classification.isCognitiveScience) return 'cognitive-science';
    if (classification.isAI) return 'ai-ml';
    return 'research';
  }

  private scoreAndRankItems(items: FeedItem[], preferences: any): FeedItem[] {
    const weights = this.calculateAlgorithmWeights(preferences);
    const now = new Date();

    return items.map(item => {
      let score = 0;

      // Recency score (0-1)
      const ageInHours = (now.getTime() - item.publishedDate.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.exp(-ageInHours / 24); // Exponential decay over 24 hours
      score += recencyScore * weights.recencyBoost * preferences.feedBehavior.recencyWeight / 100;

      // Popularity score (0-1) 
      const popularityScore = item.type === 'hackernews' ? 
        Math.min(item.score / 500, 1) : 0.5; // Normalize HN score, default for others
      score += popularityScore * weights.popularityBoost * preferences.feedBehavior.popularityWeight / 100;

      // Content type preference
      const contentTypeWeight = preferences.contentTypes[
        item.type === 'research_paper' ? 'researchPapers' : 
        item.type === 'hackernews' ? 'hackernews' : 'insights'
      ] / 100;
      score += contentTypeWeight * weights.personalizedBoost;

      // Category/research area boost
      if (item.type === 'research_paper' && item.category) {
        const categoryKey = item.category.replace('-', '');
        const categoryWeight = preferences.researchCategories?.[categoryKey] || 50;
        score += (categoryWeight / 100) * 0.3;
      }

      // Tag matching boost
      const userInterests = this.extractUserInterests(preferences);
      const tagMatchScore = this.calculateTagRelevance(item.tags, userInterests);
      score += tagMatchScore * 0.2;

      return {
        ...item,
        score,
        relevanceScore: score,
      };
    }).sort((a, b) => b.score - a.score);
  }

  private calculateAlgorithmWeights(preferences: any): AlgorithmWeights {
    return {
      recencyBoost: preferences.feedBehavior?.recencyWeight / 100 || 0.6,
      popularityBoost: preferences.feedBehavior?.popularityWeight / 100 || 0.3,
      personalizedBoost: 0.8,
      diversityPenalty: preferences.feedBehavior?.diversityImportance / 100 || 0.2,
    };
  }

  private extractUserInterests(preferences: any): string[] {
    const interests: string[] = [];
    
    // Extract from research categories with high weights
    Object.entries(preferences.researchCategories || {}).forEach(([key, weight]) => {
      if ((weight as number) > 70) {
        interests.push(key);
      }
    });

    return interests;
  }

  private calculateTagRelevance(itemTags: string[], userInterests: string[]): number {
    if (!itemTags.length || !userInterests.length) return 0;

    const matches = itemTags.filter(tag => 
      userInterests.some(interest => 
        tag.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(tag.toLowerCase())
      )
    );

    return matches.length / Math.max(itemTags.length, userInterests.length);
  }

  private applyDiversityFiltering(items: FeedItem[]): FeedItem[] {
    // Ensure diversity by preventing too many items from the same source/category in a row
    const diversifiedItems: FeedItem[] = [];
    const recentSources: string[] = [];
    const recentCategories: string[] = [];
    const maxConsecutive = 2;

    for (const item of items) {
      const sourceCount = recentSources.filter(s => s === item.source).length;
      const categoryCount = recentCategories.filter(c => c === item.category).length;

      if (sourceCount < maxConsecutive && categoryCount < maxConsecutive) {
        diversifiedItems.push(item);
        recentSources.push(item.source);
        recentCategories.push(item.category || 'unknown');

        // Keep only recent items for tracking
        if (recentSources.length > 5) recentSources.shift();
        if (recentCategories.length > 5) recentCategories.shift();
      }
    }

    // Fill remaining slots with skipped items
    const skipped = items.filter(item => !diversifiedItems.includes(item));
    return [...diversifiedItems, ...skipped];
  }

  private extractTagsFromHackerNewsStory(story: HackerNewsStory): string[] {
    const tags: string[] = [];
    
    // Extract tags from title and text
    const text = `${story.title} ${story.text || ''}`.toLowerCase();
    
    // Common tech keywords
    const techKeywords = ['ai', 'ml', 'javascript', 'python', 'react', 'vue', 'angular', 
                          'nodejs', 'blockchain', 'crypto', 'startup', 'programming'];
    
    techKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // Category-based tags
    if (text.includes('show hn')) tags.push('show-hn');
    if (text.includes('ask hn')) tags.push('ask-hn');
    if (story.score > 100) tags.push('popular');
    if (story.descendants > 50) tags.push('discussion');
    
    return tags;
  }
}