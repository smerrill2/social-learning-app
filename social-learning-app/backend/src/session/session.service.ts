import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { Insight } from '../entities/insight.entity';
import { PackItemDto, PackResponseDto } from './dto/pack-item.dto';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(HackerNewsStory)
    private hnRepo: Repository<HackerNewsStory>,
    @InjectRepository(ResearchPaper)
    private paperRepo: Repository<ResearchPaper>,
    @InjectRepository(Insight)
    private insightRepo: Repository<Insight>,
    private cache: CacheService,
    private llm: LlmService,
  ) {}

  async getDailyPack(userId: string, topic?: string): Promise<PackResponseDto> {
    const today = new Date().toISOString().slice(0, 10);
    const effectiveTopic = (topic || 'ai-ml').toLowerCase();
    const cacheKey = `session:pack:${userId}:${today}`;

    const cached = await this.cache.get<PackResponseDto>(cacheKey);
    if (cached && (!topic || cached.topic === effectiveTopic)) {
      return cached;
    }

    const items = await this.buildPack(effectiveTopic);
    const response: PackResponseDto = { date: today, topic: effectiveTopic, items };
    // 24h TTL
    await this.cache.set(cacheKey, response, 60 * 60 * 24);
    return response;
  }

  private async buildPack(topic: string): Promise<PackItemDto[]> {
    // Targets
    const researchCount = 6;
    const hnCount = 3;
    const insightCount = 3;

    let [research, hn, insights] = await Promise.all([
      this.selectRecentResearchByTopic(topic, researchCount * 2), // oversample
      this.selectFreshHnByTopic(topic, hnCount * 3),
      this.selectInsightsByTopic(topic, insightCount * 3),
    ]);

    // Minimal fallback: if insights are sparse, synthesize simple apply prompts
    if (insights.length < insightCount) {
      const needed = insightCount - insights.length;
      const fillers: Insight[] = Array.from({ length: needed }).map((_, idx) => ({
        // synthetic shape to satisfy Insight typing usage in mapping
        id: `apply-${topic}-${idx}` as unknown as any,
        content: `Apply: Spend 2 minutes practicing one concept from today's ${topic} pack.`,
        tags: [topic, 'apply'],
        engagement: { likeCount: 0, shareCount: 0, saveCount: 0, applyCount: 0, viewCount: 0, engagementRate: 0 },
        pageReference: null as any,
        chapterReference: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: null as any,
        authorId: 'system',
        book: null as any,
        bookId: 'system',
        interactions: [] as any,
      } as unknown as Insight));
      insights = insights.concat(fillers as any);
    }

    const pickedResearchRaw = research.slice(0, researchCount);
    const pickedResearch = await this.enrichResearchWithSummaries(topic, pickedResearchRaw);
    const pickedHn = hn.slice(0, hnCount).map(this.hnToPackItem(topic));
    const pickedInsights = insights.slice(0, insightCount).map(this.insightToPackItem(topic));

    // Backfill if any category is short
    const items: PackItemDto[] = [];
    const interleaveOrder: Array<'research' | 'hackernews' | 'insight'> = [
      'research','research','hackernews','research','insight','research','hackernews','research','insight','hackernews','research','insight',
    ];

    const pools: Record<string, PackItemDto[]> = {
      research: pickedResearch,
      hackernews: pickedHn,
      insight: pickedInsights,
    };

    for (const slot of interleaveOrder) {
      let next: PackItemDto | undefined = pools[slot].shift();
      if (!next) {
        // Backfill from any other pool with remaining items
        const alt = Object.values(pools).find(arr => arr.length > 0);
        if (alt) next = alt.shift();
      }
      if (next) items.push(next);
    }

    // If still under 12, fill with most recent research then HN
    while (items.length < 12) {
      if (research.length > items.filter(i => i.source === 'research').length) {
        const idx = items.filter(i => i.source === 'research').length;
        const extra = research[idx];
        if (extra) items.push(this.paperToPackItem(topic)(extra));
        else break;
      } else if (hn.length > items.filter(i => i.source === 'hackernews').length) {
        const idx = items.filter(i => i.source === 'hackernews').length;
        const extra = hn[idx];
        if (extra) items.push(this.hnToPackItem(topic)(extra));
        else break;
      } else {
        // Fill with additional apply prompts to maintain 12 tiles
        items.push({
          id: `apply-${topic}-${items.length}`,
          source: 'insight',
          title: `Apply: Do a 2-minute action for ${topic}`,
          tldr: `Pick one small step related to ${topic} and do it now.`,
          whyItMatters: this.whyItMattersLine(topic, 'insight'),
          readingMinutes: 1,
          meta: { synthetic: true }
        });
      }
    }

    return items.slice(0, 12);
  }

  private paperToPackItem = (topic: string) => (p: ResearchPaper): PackItemDto => {
    const tldr = (p.abstract || '').trim();
    const words = tldr.split(/\s+/).filter(Boolean).length;
    const reading = Math.max(1, Math.min(6, Math.ceil(words / 200)));
    return {
      id: p.id,
      source: 'research',
      title: p.title,
      tldr: tldr ? this.truncate(tldr, 280) : undefined,
      whyItMatters: this.whyItMattersLine(topic, 'research'),
      readingMinutes: reading,
      url: p.abstractUrl || p.pdfUrl,
      domain: p.abstractUrl ? this.safeDomain(p.abstractUrl) : null,
      author: p.authors,
      publishedAt: p.publishedDate?.toISOString?.() || undefined,
      meta: { categories: p.categories, tags: p.tags }
    };
  };

  private async enrichResearchWithSummaries(topic: string, papers: ResearchPaper[]): Promise<PackItemDto[]> {
    const results: PackItemDto[] = [];
    for (const p of papers) {
      // Try cache first
      const cacheKey = `arxiv:summary:${p.id}`;
      let cached = await this.cache.get<any>(cacheKey);
      if (!cached) {
        const sum = await this.llm.summarizePaper({ title: p.title, abstract: p.abstract, url: p.abstractUrl });
        if (sum) {
          cached = sum;
          // cache for 7 days
          await this.cache.set(cacheKey, sum, 7 * 24 * 60 * 60);
        }
      }

      const base = this.paperToPackItem(topic)(p);
      if (cached?.tldr) base.tldr = cached.tldr;
      if (cached?.paradigms) base.meta = { ...(base.meta || {}), paradigms: cached.paradigms, meritScore: cached.meritScore };
      // Slightly refine why-it-matters based on paradigms
      if (cached?.paradigms && typeof cached.paradigms === 'object') {
        const top = Object.entries(cached.paradigms as Record<string, number>).sort((a,b)=>b[1]-a[1])[0];
        if (top && top[1] >= 3) base.whyItMatters = `Strongly relevant to ${top[0].replace('_',' ')} in your ${topic} focus.`;
      }
      results.push(base);
    }
    return results;
  }

  private hnToPackItem = (topic: string) => (s: HackerNewsStory): PackItemDto => {
    const text = (s.summary || s.text || '').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const reading = Math.max(1, Math.min(6, Math.ceil(words / 200)));
    return {
      id: s.id,
      source: 'hackernews',
      title: s.title,
      tldr: text ? this.truncate(text, 280) : undefined,
      whyItMatters: this.whyItMattersLine(topic, 'hackernews'),
      readingMinutes: reading,
      url: s.url,
      domain: this.safeDomain(s.url || undefined) || null,
      author: s.by,
      publishedAt: s.time?.toISOString?.() || undefined,
      meta: { score: s.score, comments: s.descendants }
    };
  };

  private insightToPackItem = (topic: string) => (i: Insight): PackItemDto => {
    const text = (i.content || '').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const reading = Math.max(1, Math.min(3, Math.ceil(words / 200)));
    return {
      id: i.id,
      source: 'insight',
      title: this.truncate(text, 80),
      tldr: this.truncate(text, 200),
      whyItMatters: this.whyItMattersLine(topic, 'insight'),
      readingMinutes: reading,
      meta: { tags: i.tags, bookId: i.bookId, authorId: i.authorId }
    };
  };

  private async selectRecentResearchByTopic(topic: string, limit: number): Promise<ResearchPaper[]> {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const qb = this.paperRepo
      .createQueryBuilder('paper')
      .where('paper.publishedDate >= :cutoff', { cutoff })
      .orderBy('paper.publishedDate', 'DESC')
      .limit(limit);

    const keywords = this.topicKeywords(topic);
    if (keywords.length > 0) {
      qb.andWhere('(LOWER(paper.title) LIKE ANY(:kw) OR LOWER(paper.abstract) LIKE ANY(:kw))', {
        kw: keywords.map(k => `%${k}%`),
      });
    }
    return qb.getMany();
  }

  private async selectFreshHnByTopic(topic: string, limit: number): Promise<HackerNewsStory[]> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const qb = this.hnRepo
      .createQueryBuilder('story')
      .where('story.time >= :cutoff', { cutoff })
      .orderBy('story.score', 'DESC')
      .addOrderBy('story.time', 'DESC')
      .limit(limit);

    const keywords = this.topicKeywords(topic);
    if (keywords.length > 0) {
      qb.andWhere('(LOWER(story.title) LIKE ANY(:kw) OR LOWER(COALESCE(story.text, \'\')) LIKE ANY(:kw))', {
        kw: keywords.map(k => `%${k}%`),
      });
    }
    return qb.getMany();
  }

  private async selectInsightsByTopic(topic: string, limit: number): Promise<Insight[]> {
    const qb = this.insightRepo
      .createQueryBuilder('insight')
      .orderBy('insight.createdAt', 'DESC')
      .limit(limit);

    // Match tag or content keywords
    const keywords = this.topicKeywords(topic);
    if (keywords.length > 0) {
      qb.where('LOWER(insight.content) LIKE ANY(:kw)', { kw: keywords.map(k => `%${k}%`) });
    }
    return qb.getMany();
  }

  async recordFeedback(userId: string, action: { itemId: string | number; source: 'hackernews' | 'research' | 'insight'; action: 'save' | 'more' | 'less' | 'skip' }) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `feedback:${userId}:${today}`;
    const list = (await this.cache.get<any[]>(key)) || [];
    list.push({ ...action, ts: new Date().toISOString() });
    await this.cache.set(key, list, 60 * 60 * 24);
    return { ok: true };
  }

  private topicKeywords(topic: string): string[] {
    const t = topic.toLowerCase();
    if (t.includes('ai')) return ['llm', 'transformer', 'inference', 'agents', 'fine-tune', 'alignment', 'distillation', 'ml'];
    if (t.includes('cognitive') || t.includes('behavior')) return ['attention', 'memory', 'cognitive', 'neuroscience', 'decision', 'behavior'];
    if (t.includes('productivity') || t.includes('habit')) return ['habit', 'timebox', 'focus', 'productivity', 'gtd', 'zettelkasten', 'pkm'];
    return [];
  }

  private truncate(text: string, max: number): string {
    if (!text) return text;
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  private safeDomain(url?: string): string | null {
    if (!url) return null;
    try { return new URL(url).hostname.replace('www.', ''); } catch { return null; }
  }

  private whyItMattersLine(topic: string, source: 'research' | 'hackernews' | 'insight'): string {
    const t = topic.replace(/-/g, ' ');
    if (source === 'research') return `Fresh study aligned with your ${t} focus.`;
    if (source === 'hackernews') return `Popular discussion relevant to ${t}.`;
    return `Actionable idea to apply in your ${t} journey.`;
  }
}
