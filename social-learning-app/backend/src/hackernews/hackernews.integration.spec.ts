import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsService } from './hackernews.service';
import { HackerNewsController } from './hackernews.controller';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';

describe('HackerNews Feed Mechanics Integration', () => {
  let module: TestingModule;
  let service: HackerNewsService;
  let controller: HackerNewsController;
  let repository: Repository<HackerNewsStory>;
  let cacheService: CacheService;

  // Mock cache service for integration tests
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeAll(async () => {
    // Use a test database configuration
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'spencermerrill',
          password: process.env.DB_PASSWORD || 'password1',
          database: (process.env.DB_NAME || 'social_learning') + '_test',
          entities: [HackerNewsStory],
          synchronize: true, // Auto-create schema for tests
          dropSchema: true,  // Clean slate for each test run
          logging: false,
        }),
        TypeOrmModule.forFeature([HackerNewsStory]),
      ],
      controllers: [HackerNewsController],
      providers: [
        HackerNewsService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<HackerNewsService>(HackerNewsService);
    controller = module.get<HackerNewsController>(HackerNewsController);
    repository = module.get<Repository<HackerNewsStory>>('HackerNewsStoryRepository');
    cacheService = module.get<CacheService>(CacheService);
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clear database and mocks before each test
    await repository.clear();
    jest.clearAllMocks();
  });

  describe('Fresh Data Filtering', () => {
    it('should only return stories from last 48 hours', async () => {
      // Arrange - Create test stories with different ages
      const now = new Date();
      const stories = [
        // Fresh story (1 hour ago)
        repository.create({
          id: 1,
          title: 'Fresh Story',
          by: 'user1',
          score: 100,
          descendants: 10,
          time: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          type: 'story',
          url: 'https://example.com',
        }),
        // Borderline story (47 hours ago)
        repository.create({
          id: 2,
          title: 'Borderline Story',
          by: 'user2',
          score: 150,
          descendants: 20,
          time: new Date(now.getTime() - 47 * 60 * 60 * 1000),
          type: 'story',
          url: 'https://test.com',
        }),
        // Stale story (50 hours ago)
        repository.create({
          id: 3,
          title: 'Stale Story',
          by: 'user3',
          score: 200,
          descendants: 30,
          time: new Date(now.getTime() - 50 * 60 * 60 * 1000),
          type: 'story',
          url: 'https://stale.com',
        }),
      ];
      
      await repository.save(stories);
      mockCacheService.get.mockResolvedValue(null);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result.stories).toHaveLength(2);
      expect(result.stories.map(s => s.id)).toEqual([2, 1]); // Ordered by score DESC
      
      // Verify all stories are within 48h
      result.stories.forEach(story => {
        const hoursAgo = (now.getTime() - new Date(story.time).getTime()) / (60 * 60 * 1000);
        expect(hoursAgo).toBeLessThanOrEqual(48);
      });
    });

    it('should return empty results when no fresh stories exist', async () => {
      // Arrange - Create only stale stories
      const staleStory = repository.create({
        id: 1,
        title: 'Old Story',
        by: 'user1',
        score: 500,
        descendants: 100,
        time: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
        type: 'story',
        url: 'https://old.com',
      });
      
      await repository.save([staleStory]);
      mockCacheService.get.mockResolvedValue(null);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result.stories).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('Ordering and Pagination', () => {
    it('should order fresh stories by score DESC, time DESC', async () => {
      // Arrange - Create stories with different scores and times
      const baseTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const stories = [
        repository.create({
          id: 1,
          title: 'Low Score Recent',
          by: 'user1',
          score: 50,
          descendants: 5,
          time: new Date(baseTime.getTime() + 60 * 60 * 1000), // 1 hour ago
          type: 'story',
        }),
        repository.create({
          id: 2,
          title: 'High Score Old',
          by: 'user2',
          score: 200,
          descendants: 30,
          time: baseTime, // 2 hours ago
          type: 'story',
        }),
        repository.create({
          id: 3,
          title: 'High Score Recent',
          by: 'user3',
          score: 200,
          descendants: 25,
          time: new Date(baseTime.getTime() + 30 * 60 * 1000), // 1.5 hours ago
          type: 'story',
        }),
      ];
      
      await repository.save(stories);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result.stories).toHaveLength(3);
      // Should be ordered: High Score Recent (200, newer), High Score Old (200, older), Low Score Recent (50)
      expect(result.stories[0].id).toBe(3);
      expect(result.stories[1].id).toBe(2);
      expect(result.stories[2].id).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      // Arrange - Create 5 fresh stories
      const stories = [];
      for (let i = 1; i <= 5; i++) {
        stories.push(repository.create({
          id: i,
          title: `Story ${i}`,
          by: `user${i}`,
          score: 100 - i, // Decreasing scores for predictable order
          descendants: 10,
          time: new Date(Date.now() - i * 60 * 60 * 1000), // Different times
          type: 'story',
        }));
      }
      
      await repository.save(stories);

      // Act - Get first page (limit 3, offset 0)
      const page1 = await service.getTopStories(3, 0);
      
      // Act - Get second page (limit 3, offset 3)  
      const page2 = await service.getTopStories(3, 3);

      // Assert
      expect(page1.stories).toHaveLength(3);
      expect(page1.pagination.hasMore).toBe(true);
      expect(page1.stories.map(s => s.id)).toEqual([1, 2, 3]);
      
      expect(page2.stories).toHaveLength(2); // Only 2 remaining
      expect(page2.pagination.hasMore).toBe(false);
      expect(page2.stories.map(s => s.id)).toEqual([4, 5]);
    });
  });

  describe('Cache Integration', () => {
    it('should cache results after database query', async () => {
      // Arrange
      const story = repository.create({
        id: 1,
        title: 'Test Story',
        by: 'user1',
        score: 100,
        descendants: 10,
        time: new Date(Date.now() - 1 * 60 * 60 * 1000),
        type: 'story',
        url: 'https://example.com',
      });
      
      await repository.save([story]);
      mockCacheService.get.mockResolvedValue(null); // Cache miss

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(
        'hn:fresh:stories:50:0',
        expect.objectContaining({
          stories: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: 'Test Story',
              timeAgo: expect.stringMatching(/\d+h ago/),
              domain: 'example.com',
            })
          ]),
          pagination: {
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
        300
      );
    });

    it('should return cached data on subsequent calls', async () => {
      // Arrange
      const cachedData = {
        stories: [{ id: 1, title: 'Cached Story' }],
        pagination: { limit: 50, offset: 0, hasMore: false },
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith('hn:fresh:stories:50:0');
    });

    it('should clear cache when stories are synced', async () => {
      // Arrange
      const cacheKeys = [
        'hn:fresh:stories:50:0',
        'hn:fresh:stories:20:0',
        'hn:fresh:stories:100:0',
        'hn:fresh:stories:25:0'
      ];

      // Mock fetch responses for sync
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([1, 2, 3]) // top story IDs
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Synced Story',
            by: 'user1',
            score: 100,
            time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            descendants: 10,
            type: 'story'
          })
        });

      // Act
      await service.syncTopStories();

      // Assert
      cacheKeys.forEach(key => {
        expect(cacheService.del).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('Controller Integration', () => {
    it('should handle requests through controller', async () => {
      // Arrange
      const story = repository.create({
        id: 1,
        title: 'Controller Test Story',
        by: 'user1',
        score: 150,
        descendants: 20,
        time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        type: 'story',
        url: 'https://test.com',
      });
      
      await repository.save([story]);
      mockCacheService.get.mockResolvedValue(null);

      // Act
      const result = await controller.getTopStories(25, 0);

      // Assert
      expect(result.stories).toHaveLength(1);
      expect(result.stories[0]).toMatchObject({
        id: 1,
        title: 'Controller Test Story',
        score: 150,
        domain: 'test.com',
      });
      expect(result.pagination).toEqual({
        limit: 25,
        offset: 0,
        hasMore: false,
      });
    });

    it('should handle sync endpoint', async () => {
      // Arrange
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([1]) // single story ID
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            title: 'Sync Test',
            by: 'user1',
            score: 75,
            time: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
            descendants: 5,
            type: 'story'
          })
        });

      // Act
      const result = await controller.syncStories();

      // Assert
      expect(result).toEqual({ message: 'Sync initiated' });
      
      // Verify story was saved
      const savedStories = await repository.find();
      expect(savedStories).toHaveLength(1);
      expect(savedStories[0].title).toBe('Sync Test');
    });
  });
});