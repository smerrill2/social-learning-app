import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { Insight } from '../entities/insight.entity';
import { CacheService } from '../cache/cache.service';

describe('SessionService (unit/integration)', () => {
  let module: TestingModule;
  let service: SessionService;

  const mockCache = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
  } as unknown as CacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [HackerNewsStory, ResearchPaper, Insight],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([HackerNewsStory, ResearchPaper, Insight]),
      ],
      providers: [
        SessionService,
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('builds a daily pack with up to 12 items and never throws on empty data', async () => {
    const res = await service.getDailyPack('user-1', 'ai-ml');
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.length).toBeLessThanOrEqual(12);
  });
});

