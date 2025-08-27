import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsService } from './hackernews.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

class RepoMock<T> {
  data: T[] = [] as any;
  find = jest.fn(async (_?: any) => this.data);
  update = jest.fn(async (_id: any, _patch: any) => {});
  createQueryBuilder = jest.fn();
}

describe('HackerNewsService summarizeMissingSummariesBatch', () => {
  let service: HackerNewsService;
  let repo: RepoMock<HackerNewsStory>;

  beforeEach(async () => {
    repo = new RepoMock<HackerNewsStory>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HackerNewsService,
        { provide: getRepositoryToken(HackerNewsStory), useValue: repo },
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'test-key') } },
      ],
    }).compile();

    service = module.get<HackerNewsService>(HackerNewsService);

    // Stub AI client on service instance
    // @ts-expect-error private
    service.ai = {
      models: {
        generateContent: jest.fn(async (_args: any) => ({
          text: JSON.stringify([
            { url: 'https://a.com', summary: 'A summary' },
            { url: 'https://b.com', summary: 'B summary' },
          ]),
        })),
      },
    } as any;
  });

  it('summarizes only missing or stale summaries in one batch call and updates repo once per item', async () => {
    const now = new Date();
    const fresh = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const stale = new Date(now.getTime() - 13 * 60 * 60 * 1000); // 13h ago

    repo.data = [
      { id: 1, url: 'https://a.com', title: 'A', summary: null, summaryUpdatedAt: null } as any,
      { id: 2, url: 'https://b.com', title: 'B', summary: undefined, summaryUpdatedAt: undefined } as any,
      { id: 3, url: 'https://c.com', title: 'C', summary: 'exists', summaryUpdatedAt: fresh } as any, // should skip (fresh)
      { id: 4, url: 'https://d.com', title: 'D', summary: 'old', summaryUpdatedAt: stale } as any,    // should include (stale)
    ];

    // @ts-expect-error access private
    const aiSpy = jest.spyOn(service.ai.models, 'generateContent');

    await service.summarizeMissingSummariesBatch(10);

    expect(aiSpy).toHaveBeenCalledTimes(1);
    // Expect repo.update called for items 1,2 (matched in JSON) and 4 (not in JSON -> skipped)
    // With provided stubbed response, only a.com and b.com will update
    const updatedIds = repo.update.mock.calls.map((c: any[]) => c[0]);
    expect(updatedIds.sort()).toEqual([1, 2]);

    // Ensure it did not attempt to resummarize fresh summary
    expect(updatedIds).not.toContain(3);
  });
});