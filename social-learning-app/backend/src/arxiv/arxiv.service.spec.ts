import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArxivService } from './arxiv.service';
import { ResearchPaper } from '../entities/research-paper.entity';
import { CacheService } from '../cache/cache.service';

describe('ArxivService.getRecentByTopic', () => {
  let module: TestingModule;
  let service: ArxivService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [ResearchPaper],
          logging: false,
        }),
        TypeOrmModule.forFeature([ResearchPaper]),
      ],
      providers: [
        ArxivService,
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
      ],
    }).compile();

    service = module.get(ArxivService);

    const repo = module.get('ResearchPaperRepository') as any;
    const now = Date.now();
    const mk = (id: string, title: string, daysAgo: number) => ({
      id,
      title,
      abstract: 'Test abstract',
      authors: ['Author A'],
      categories: ['cs.AI'],
      tags: ['ai'],
      publishedDate: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      updatedDate: null,
      pdfUrl: 'https://arxiv.org/pdf/1234.pdf',
      abstractUrl: 'https://arxiv.org/abs/1234',
      doi: null,
      journal: null,
      engagement: { viewCount: 0, saveCount: 0, shareCount: 0, citationCount: 0 },
      classification: { isPsychology: false, isBehavioralScience: false, isHealthScience: false, isNeuroscience: false, isCognitiveScience: false, isAI: true, isComputerScience: true, confidence: 0.8 },
      fetchedAt: new Date(),
    });

    await repo.save([
      repo.create(mk('p1', 'LLM inference optimization', 2)),
      repo.create(mk('p2', 'Transformers overview', 10)),
      repo.create(mk('p3', 'Old AI paper', 30)),
    ]);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns only ≤14d and topic-matching papers ordered by recency', async () => {
    const res = await service.getRecentByTopic('ai-ml', 10);
    expect(res.length).toBeGreaterThan(0);
    const ids = res.map(p => p.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).not.toContain('p3'); // older than 14 days
    // p1 (2 days) should be before p2 (10 days)
    expect(ids.indexOf('p1')).toBeLessThan(ids.indexOf('p2'));
  });
});
