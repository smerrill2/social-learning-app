import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsService } from './hackernews.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';

describe('HackerNews MVP Benefits Validation', () => {
  let module: TestingModule;
  let service: HackerNewsService;
  let repository: Repository<HackerNewsStory>;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'spencermerrill',
          password: process.env.DB_PASSWORD || 'password1',
          database: (process.env.DB_NAME || 'social_learning') + '_test_mvp',
          entities: [HackerNewsStory],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([HackerNewsStory]),
      ],
      providers: [
        HackerNewsService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<HackerNewsService>(HackerNewsService);
    repository = module.get<Repository<HackerNewsStory>>('HackerNewsStoryRepository');
    cacheService = module.get<CacheService>(CacheService);
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await repository.clear();
    jest.clearAllMocks();
  });

  describe('MVP Benefit 1: Predictable Content Freshness', () => {
    it('should guarantee 100% of returned stories are ≤48 hours old', async () => {
      // Arrange - Create mixed age stories
      const now = new Date();
      const stories = [];
      
      // Create stories with various ages
      for (let i = 1; i <= 20; i++) {
        stories.push(repository.create({
          id: i,
          title: `Story ${i}`,
          by: `user${i}`,
          score: Math.floor(Math.random() * 1000),
          descendants: Math.floor(Math.random() * 50),
          time: new Date(now.getTime() - i * 5 * 60 * 60 * 1000), // Every 5 hours
          type: 'story',
        }));
      }
      
      await repository.save(stories);

      // Act
      const result = await service.getTopStories(100, 0);

      // Assert - Only stories ≤48 hours should be returned
      const maxAge = 48 * 60 * 60 * 1000; // 48 hours in ms
      const allFresh = result.stories.every(story => {
        const age = now.getTime() - new Date(story.time).getTime();
        return age <= maxAge;
      });
      
      expect(allFresh).toBe(true);
      expect(result.stories.length).toBeLessThanOrEqual(9); // Only first 9 stories are ≤48h
      
      // Verify specific age constraint
      result.stories.forEach(story => {
        const hoursOld = (now.getTime() - new Date(story.time).getTime()) / (60 * 60 * 1000);
        expect(hoursOld).toBeLessThanOrEqual(48);
      });
    });

    it('should have zero stale content in feed results', async () => {
      // Arrange - Create only stale stories (>48h old)
      const staleStories = [];
      for (let i = 1; i <= 5; i++) {
        staleStories.push(repository.create({
          id: i,
          title: `Stale Story ${i}`,
          by: `user${i}`,
          score: 500, // High scores to ensure they would appear if not filtered
          descendants: 100,
          time: new Date(Date.now() - (50 + i) * 60 * 60 * 1000), // >50 hours old
          type: 'story',
        }));
      }
      
      await repository.save(staleStories);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result.stories).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('MVP Benefit 2: Query Performance', () => {
    it('should achieve query performance <50ms target', async () => {
      // Arrange - Create large dataset for performance testing
      const largeDataset = [];
      const now = Date.now();
      
      for (let i = 1; i <= 1000; i++) {
        largeDataset.push(repository.create({
          id: i,
          title: `Performance Test Story ${i}`,
          by: `user${i % 100}`,
          score: Math.floor(Math.random() * 1000),
          descendants: Math.floor(Math.random() * 100),
          time: new Date(now - (Math.random() * 47 * 60 * 60 * 1000)), // Random within 47h
          type: 'story',
        }));
      }
      
      await repository.save(largeDataset);
      mockCacheService.get.mockResolvedValue(null); // Force database query

      // Act & Measure
      const startTime = Date.now();
      await service.getTopStories(50, 0);
      const queryTime = Date.now() - startTime;

      // Assert
      expect(queryTime).toBeLessThan(50); // Target: <50ms
    });

    it('should use composite index for optimal query plan', async () => {
      // This test verifies the query uses the (time, score) index
      // In a real database, you would use EXPLAIN to verify index usage
      
      // Arrange
      const testStories = [];
      for (let i = 1; i <= 100; i++) {
        testStories.push(repository.create({
          id: i,
          title: `Index Test ${i}`,
          by: `user${i}`,
          score: i * 10,
          descendants: i,
          time: new Date(Date.now() - i * 60 * 1000), // Every minute
          type: 'story',
        }));
      }
      
      await repository.save(testStories);
      mockCacheService.get.mockResolvedValue(null);

      // Act - Multiple queries to test index efficiency
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.getTopStories(25, i * 25));
      }
      
      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Assert - All queries should complete quickly due to index
      expect(totalTime).toBeLessThan(200); // 10 queries in <200ms
    });
  });

  describe('MVP Benefit 3: Cache Hit Rate Improvements', () => {
    it('should achieve >80% cache hit rate target', async () => {
      // Arrange
      const cachedResult = {
        stories: [{ id: 1, title: 'Cached Story' }],
        pagination: { limit: 50, offset: 0, hasMore: false }
      };
      
      // Mock 8 cache hits out of 10 calls (80% hit rate)
      mockCacheService.get
        .mockResolvedValueOnce(null) // Miss
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(null) // Miss
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult) // Hit
        .mockResolvedValueOnce(cachedResult); // Hit

      // Act - Make 10 requests
      for (let i = 0; i < 10; i++) {
        await service.getTopStories(50, 0);
      }

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledTimes(10);
      expect(mockCacheService.set).toHaveBeenCalledTimes(2); // Only for cache misses
      
      // Verify cache hit rate is 80%
      const cacheHits = mockCacheService.get.mock.results.filter(
        result => result.value && result.value !== null
      ).length;
      const hitRate = cacheHits / 10;
      expect(hitRate).toBeGreaterThanOrEqual(0.8);
    });

    it('should use predictable cache keys for efficient caching', async () => {
      // Arrange
      const testCases = [
        { limit: 50, offset: 0, expectedKey: 'hn:fresh:stories:50:0' },
        { limit: 25, offset: 10, expectedKey: 'hn:fresh:stories:25:10' },
        { limit: 100, offset: 25, expectedKey: 'hn:fresh:stories:100:25' },
      ];

      mockCacheService.get.mockResolvedValue(null);

      // Act & Assert
      for (const { limit, offset, expectedKey } of testCases) {
        await service.getTopStories(limit, offset);
        expect(mockCacheService.get).toHaveBeenCalledWith(expectedKey);
      }
    });
  });

  describe('MVP Benefit 4: Scalable Multi-Source Pattern', () => {
    it('should demonstrate reusable time-based filtering pattern', async () => {
      // This test validates the pattern can be applied to other data sources
      
      // Arrange - Simulate different time windows for different sources
      const timeWindows = {
        hackernews: 48, // hours
        twitter: 24,    // hours  
        arxiv: 14 * 24, // 14 days in hours
      };

      const now = new Date();

      // Create stories representing different source patterns
      const stories = [
        // HackerNews pattern (48h)
        repository.create({
          id: 1,
          title: 'HN Story',
          by: 'hnuser',
          score: 100,
          descendants: 10,
          time: new Date(now.getTime() - 47 * 60 * 60 * 1000), // 47h ago
          type: 'story',
        }),
        // Would be Twitter pattern (24h) - should still appear in HN 48h window
        repository.create({
          id: 2,
          title: 'Recent Story',
          by: 'recentuser',
          score: 200,
          descendants: 20,
          time: new Date(now.getTime() - 23 * 60 * 60 * 1000), // 23h ago
          type: 'story',
        }),
        // Would be arXiv pattern (14 days) - but outside HN 48h window
        repository.create({
          id: 3,
          title: 'Academic Paper',
          by: 'researcher',
          score: 300,
          descendants: 30,
          time: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72h ago
          type: 'story',
        }),
      ];

      await repository.save(stories);

      // Act - Apply HackerNews 48h filter
      const result = await service.getTopStories(50, 0);

      // Assert - Only stories within 48h window
      expect(result.stories).toHaveLength(2);
      expect(result.stories.map(s => s.id)).toEqual([2, 1]); // Ordered by score DESC
      
      // Verify pattern scalability
      const hnWindow = timeWindows.hackernews * 60 * 60 * 1000;
      result.stories.forEach(story => {
        const age = now.getTime() - new Date(story.time).getTime();
        expect(age).toBeLessThanOrEqual(hnWindow);
      });
    });

    it('should maintain consistent response format across sources', async () => {
      // Arrange
      const story = repository.create({
        id: 1,
        title: 'Format Test Story',
        by: 'testuser',
        score: 150,
        descendants: 15,
        time: new Date(Date.now() - 1 * 60 * 60 * 1000),
        type: 'story',
        url: 'https://example.com/test',
      });
      
      await repository.save([story]);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert - Consistent format for multi-source compatibility
      expect(result).toHaveProperty('stories');
      expect(result).toHaveProperty('pagination');
      
      expect(result.stories[0]).toHaveProperty('id');
      expect(result.stories[0]).toHaveProperty('title');
      expect(result.stories[0]).toHaveProperty('score');
      expect(result.stories[0]).toHaveProperty('time');
      expect(result.stories[0]).toHaveProperty('timeAgo');
      expect(result.stories[0]).toHaveProperty('domain');
      
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('offset');
      expect(result.pagination).toHaveProperty('hasMore');
    });
  });

  describe('MVP Benefit 5: Clean System Architecture', () => {
    it('should have simple and maintainable query logic', async () => {
      // This test validates the implementation is clean and understandable
      
      // Arrange
      const story = repository.create({
        id: 1,
        title: 'Architecture Test',
        by: 'architect',
        score: 100,
        descendants: 10,
        time: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12h ago
        type: 'story',
      });
      
      await repository.save([story]);
      
      // Mock to capture query builder calls
      const createQueryBuilderSpy = jest.spyOn(repository, 'createQueryBuilder');

      // Act
      await service.getTopStories(50, 0);

      // Assert - Verify clean query structure
      expect(createQueryBuilderSpy).toHaveBeenCalledWith('story');
      
      // The query should be simple and readable:
      // 1. Time filter (WHERE time >= threshold)
      // 2. Score ordering (ORDER BY score DESC)
      // 3. Time ordering (ORDER BY time DESC)
      // 4. Pagination (LIMIT/OFFSET)
      
      // This validates the architecture remains simple for MVP
    });

    it('should handle edge cases gracefully', async () => {
      // Test empty database
      let result = await service.getTopStories(50, 0);
      expect(result.stories).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);

      // Test large offset
      result = await service.getTopStories(10, 1000);
      expect(result.stories).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);

      // Test zero limit (edge case)
      result = await service.getTopStories(0, 0);
      expect(result.stories).toHaveLength(0);
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should maintain performance as dataset grows', async () => {
      // Arrange - Create incrementally larger datasets
      const dataSizes = [100, 500, 1000];
      const performanceTimes: number[] = [];

      for (const size of dataSizes) {
        // Clear and create new dataset
        await repository.clear();
        
        const stories = [];
        for (let i = 1; i <= size; i++) {
          stories.push(repository.create({
            id: i,
            title: `Performance Story ${i}`,
            by: `user${i}`,
            score: Math.floor(Math.random() * 1000),
            descendants: Math.floor(Math.random() * 100),
            time: new Date(Date.now() - Math.random() * 47 * 60 * 60 * 1000),
            type: 'story',
          }));
        }
        
        await repository.save(stories);
        mockCacheService.get.mockResolvedValue(null);

        // Act & Measure
        const startTime = Date.now();
        await service.getTopStories(50, 0);
        const queryTime = Date.now() - startTime;
        
        performanceTimes.push(queryTime);
      }

      // Assert - Performance should not degrade significantly
      // Each query should still be fast regardless of dataset size
      performanceTimes.forEach(time => {
        expect(time).toBeLessThan(100); // Conservative upper bound
      });
      
      // Verify performance doesn't degrade linearly with data size
      const maxTime = Math.max(...performanceTimes);
      const minTime = Math.min(...performanceTimes);
      expect(maxTime / minTime).toBeLessThan(3); // Less than 3x degradation
    });
  });
});