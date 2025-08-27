import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResearchPaper } from '../entities/research-paper.entity';
import { CacheService } from '../cache/cache.service';
import * as xml2js from 'xml2js';

interface ArxivEntry {
  id: [string];
  title: [string];
  summary: [string];
  author: Array<{ name: [string] }>;
  category: Array<{ $: { term: string } }>;
  published: [string];
  updated?: [string];
  link: Array<{ $: { href: string; type?: string } }>;
  'arxiv:doi'?: [{ $: { value: string } }];
  'arxiv:journal_ref'?: [string];
}

@Injectable()
export class ArxivService {
  private readonly logger = new Logger(ArxivService.name);
  private readonly baseUrl = 'http://export.arxiv.org/api/query';

  constructor(
    @InjectRepository(ResearchPaper)
    private paperRepository: Repository<ResearchPaper>,
    private cacheService: CacheService,
  ) {}

  async searchPapers(
    categories: string[] = [],
    query?: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    const cacheKey = `arxiv:search:${categories.join(',')}:${query}:${limit}:${offset}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const papers = await this.paperRepository
      .createQueryBuilder('paper')
      .where(categories.length > 0 ? 'paper.categories && :categories' : '1=1', 
        { categories })
      .andWhere(query ? 'paper.title ILIKE :query OR paper.abstract ILIKE :query' : '1=1',
        { query: query ? `%${query}%` : undefined })
      .orderBy('paper.publishedDate', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    const result = {
      papers,
      pagination: {
        limit,
        offset,
        hasMore: papers.length === limit,
      },
    };

    await this.cacheService.set(cacheKey, result, 600); // 10 minutes
    return result;
  }

  // Helper for Session packs: get recent papers by topic keywords/categories (≤14 days)
  async getRecentByTopic(topic: string, limit: number = 20) {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const keywords = this.topicKeywords(topic);

    const qb = this.paperRepository
      .createQueryBuilder('paper')
      .where('paper.publishedDate >= :cutoff', { cutoff })
      .orderBy('paper.publishedDate', 'DESC')
      .limit(limit);

    if (keywords.length > 0) {
      qb.andWhere('(LOWER(paper.title) LIKE ANY(:kw) OR LOWER(paper.abstract) LIKE ANY(:kw))', {
        kw: keywords.map(k => `%${k}%`),
      });
    }

    return qb.getMany();
  }

  private topicKeywords(topic: string): string[] {
    const t = (topic || '').toLowerCase();
    if (t.includes('ai')) return ['llm', 'transformer', 'inference', 'agent', 'distillation', 'alignment', 'machine learning'];
    if (t.includes('cognitive') || t.includes('behavior')) return ['attention', 'memory', 'cognitive', 'neuroscience', 'decision', 'behavior'];
    if (t.includes('productivity') || t.includes('habit')) return ['habit', 'attention', 'focus', 'self-control', 'time management'];
    return [];
  }

  async syncBehavioralSciencePapers(): Promise<void> {
    try {
      this.logger.log('Starting sync of behavioral science papers from arXiv...');
      
      // Define categories for behavioral sciences, psychology, health, etc.
      const categories = [
        'q-bio.NC',  // Neurons and Cognition
        'cs.AI',     // Artificial Intelligence
        'cs.CY',     // Computers and Society
        'cs.HC',     // Human-Computer Interaction
        'stat.ML',   // Machine Learning
        'cs.LG',     // Learning
        'econ.GN',   // General Economics (behavioral economics)
        'physics.bio-ph', // Biological Physics
      ];

      const queries = [
        'psychology',
        'behavioral science',
        'cognitive science', 
        'neuroscience',
        'mental health',
        'behavior change',
        'decision making',
        'social psychology',
        'computational psychology',
      ];

      for (const query of queries) {
        await this.fetchAndSavePapers(query, categories, 20);
        // Add delay to respect arXiv rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      this.logger.log('Completed behavioral science papers sync');
    } catch (error) {
      this.logger.error('Error syncing behavioral science papers:', error);
      throw error;
    }
  }

  private async fetchAndSavePapers(
    searchQuery: string, 
    categories: string[], 
    maxResults: number = 20
  ): Promise<void> {
    try {
      // Build arXiv API query
      const categoryQuery = categories.map(cat => `cat:${cat}`).join(' OR ');
      const fullQuery = `(${categoryQuery}) AND all:${searchQuery}`;
      
      const url = `${this.baseUrl}?search_query=${encodeURIComponent(fullQuery)}&start=0&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;

      this.logger.log(`Fetching papers for query: ${searchQuery}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': `SocialLearningApp/1.0 (mailto:spencer19merrill@gmail.com)`,
          'Accept': 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      const xmlData = await response.text();
      
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);
      
      const entries = result.feed?.entry || [];
      
      if (!Array.isArray(entries)) {
        this.logger.warn(`No entries found for query: ${searchQuery}`);
        return;
      }

      for (const entry of entries) {
        await this.processArxivEntry(entry as ArxivEntry);
      }
      
      this.logger.log(`Processed ${entries.length} papers for query: ${searchQuery}`);
    } catch (error) {
      this.logger.error(`Error fetching papers for query ${searchQuery}:`, error);
    }
  }

  private async processArxivEntry(entry: ArxivEntry): Promise<void> {
    try {
      // Extract arXiv ID from URL
      const arxivId = this.extractArxivId(entry.id[0]);
      
      if (!arxivId) {
        this.logger.warn('Could not extract arXiv ID from:', entry.id[0]);
        return;
      }

      // Check if paper already exists
      const existingPaper = await this.paperRepository.findOne({ 
        where: { id: arxivId } 
      });

      const authors = entry.author?.map(a => a.name[0]) || [];
      const categories = entry.category?.map(c => c.$.term) || [];
      const title = entry.title[0]?.replace(/\s+/g, ' ').trim();
      const abstract = entry.summary[0]?.replace(/\s+/g, ' ').trim();
      
      const publishedDate = new Date(entry.published[0]);
      const updatedDate = entry.updated ? new Date(entry.updated[0]) : null;

      // Find PDF and abstract URLs
      const pdfLink = entry.link?.find(l => l.$.type === 'application/pdf');
      const abstractLink = entry.link?.find(l => !l.$.type || l.$.type === 'text/html');
      
      const pdfUrl = pdfLink?.$.href || `https://arxiv.org/pdf/${arxivId}.pdf`;
      const abstractUrl = abstractLink?.$.href || `https://arxiv.org/abs/${arxivId}`;

      // Classify the paper
      const classification = this.classifyPaper(title, abstract, categories);

      const paperData: any = {
        id: arxivId,
        title,
        abstract,
        authors,
        categories,
        tags: this.extractTags(title, abstract),
        publishedDate,
        pdfUrl,
        abstractUrl,
        doi: entry['arxiv:doi']?.[0]?.$?.value || undefined,
        journal: entry['arxiv:journal_ref']?.[0] || undefined,
        engagement: {
          viewCount: 0,
          saveCount: 0,
          shareCount: 0,
          citationCount: 0,
        },
        classification,
        fetchedAt: new Date(),
      };

      if (updatedDate) {
        paperData.updatedDate = updatedDate;
      }

      if (existingPaper) {
        await this.paperRepository.update(arxivId, paperData);
        this.logger.debug(`Updated paper: ${arxivId}`);
      } else {
        const newPaper = this.paperRepository.create(paperData);
        await this.paperRepository.save(newPaper);
        this.logger.debug(`Saved new paper: ${arxivId}`);
      }
    } catch (error) {
      this.logger.error('Error processing arXiv entry:', error);
    }
  }

  private extractArxivId(idUrl: string): string | null {
    const match = idUrl.match(/arxiv\.org\/abs\/(.+)$/);
    return match ? match[1] : null;
  }

  private classifyPaper(title: string, abstract: string, categories: string[]) {
    const text = `${title} ${abstract}`.toLowerCase();
    
    // Psychology keywords
    const psychologyKeywords = ['psychology', 'psychological', 'cognitive', 'behavior', 'mental', 'emotion'];
    const isPsychology = psychologyKeywords.some(kw => text.includes(kw)) || 
                        categories.some(cat => cat.includes('q-bio.NC'));

    // Behavioral science keywords  
    const behavioralKeywords = ['behavioral', 'behaviour', 'decision making', 'social behavior', 'choice'];
    const isBehavioralScience = behavioralKeywords.some(kw => text.includes(kw));

    // Health science keywords
    const healthKeywords = ['health', 'medical', 'clinical', 'therapy', 'treatment', 'disease'];
    const isHealthScience = healthKeywords.some(kw => text.includes(kw));

    // Neuroscience keywords
    const neuroKeywords = ['neuroscience', 'neural', 'brain', 'neuron', 'cortex'];
    const isNeuroscience = neuroKeywords.some(kw => text.includes(kw)) ||
                          categories.some(cat => cat.includes('q-bio.NC'));

    // Cognitive science keywords
    const cognitiveKeywords = ['cognitive', 'cognition', 'memory', 'attention', 'perception'];
    const isCognitiveScience = cognitiveKeywords.some(kw => text.includes(kw));

    // AI keywords
    const aiKeywords = ['artificial intelligence', 'machine learning', 'deep learning', 'neural network'];
    const isAI = aiKeywords.some(kw => text.includes(kw)) ||
                categories.some(cat => ['cs.AI', 'cs.LG', 'stat.ML'].includes(cat));

    // Computer science
    const isComputerScience = categories.some(cat => cat.startsWith('cs.'));

    // Calculate confidence based on keyword matches and category relevance
    const matches = [isPsychology, isBehavioralScience, isHealthScience, 
                    isNeuroscience, isCognitiveScience, isAI].filter(Boolean).length;
    const confidence = Math.min(matches * 0.2 + 0.1, 1.0);

    return {
      isPsychology,
      isBehavioralScience,
      isHealthScience: isHealthScience,
      isNeuroscience,
      isCognitiveScience,
      isAI,
      isComputerScience,
      confidence,
    };
  }

  private extractTags(title: string, abstract: string): string[] {
    const text = `${title} ${abstract}`.toLowerCase();
    const tags: string[] = [];
    
    const tagMappings = {
      'machine learning': ['ai', 'ml', 'algorithms'],
      'psychology': ['psychology', 'behavior', 'cognitive'],
      'neuroscience': ['brain', 'neural', 'neuroscience'],
      'health': ['health', 'medical', 'clinical'],
      'behavioral': ['behavior', 'decision-making', 'social'],
    } as Record<string, string[]>;

    Object.entries(tagMappings).forEach(([key, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        tags.push(key);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }
}

