import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { Insight } from '../entities/insight.entity';
import { CacheService } from '../cache/cache.service';
import { User } from '../entities/user.entity';
import { Book } from '../entities/book.entity';
import { LlmService } from '../llm/llm.service';

describe('SessionService — research inclusion', () => {
  let module: TestingModule;
  let service: SessionService;

  const mockCache: Partial<CacheService> = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
  };

  const mockLlm: Partial<LlmService> = {
    summarizePaper: jest.fn(async () => null),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          logging: false,
          entities: [HackerNewsStory, ResearchPaper, Insight, User, Book],
        }),
        TypeOrmModule.forFeature([HackerNewsStory, ResearchPaper, Insight]),
      ],
      providers: [
        SessionService,
        { provide: CacheService, useValue: mockCache },
        { provide: LlmService, useValue: mockLlm },
      ],
    }).compile();

    service = module.get(SessionService);

    const paperRepo = module.get('ResearchPaperRepository') as any;
    const now = Date.now();
    const mk = (id: string, title: string, daysAgo: number) => ({
      id,
      title,
      abstract: 'Abstract mentions inference and transformers for ai-ml topic.',
      authors: ['Author'],
      categories: ['cs.AI'],
      tags: [],
      publishedDate: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      updatedDate: null,
      pdfUrl: 'https://arxiv.org/pdf/x.pdf',
      abstractUrl: 'https://arxiv.org/abs/x',
      doi: null,
      journal: null,
      engagement: null,
      classification: { isPsychology: false, isBehavioralScience: false, isHealthScience: false, isNeuroscience: false, isCognitiveScience: false, isAI: true, isComputerScience: true, confidence: 0.8 },
      fetchedAt: new Date(),
    });
    await paperRepo.save([
      paperRepo.create(mk('r1', 'Inference efficiency', 1)),
      paperRepo.create(mk('r2', 'Transformer pruning', 3)),
      paperRepo.create(mk('r3', 'Alignment method', 6)),
      paperRepo.create(mk('r4', 'Old unrelated', 40)),
    ]);
  });

  afterAll(async () => {
    await module.close();
  });

  it('includes research items (≤14d) in the daily pack for ai-ml topic', async () => {
    const pack = await service.getDailyPack('user-1', 'ai-ml');
    expect(pack).toBeDefined();
    const research = pack.items.filter(i => i.source === 'research');
    expect(research.length).toBeGreaterThan(0);
    // Ensure no old paper sneaks in
    const hasOld = research.some(i => i.id === 'r4');
    expect(hasOld).toBe(false);
  });
});
