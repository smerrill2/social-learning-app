import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HackerNewsService } from './hackernews.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheService } from '../cache/cache.service';

describe('HackerNewsService - Fresh Data Implementation', () => {
  let service: HackerNewsService;
  let repository: Repository<HackerNewsStory>;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HackerNewsService,
        {
          provide: getRepositoryToken(HackerNewsStory),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<HackerNewsService>(HackerNewsService);
    repository = module.get<Repository<HackerNewsStory>>(getRepositoryToken(HackerNewsStory));
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Hit Tests', () => {
    it('should return cached data when available', async () => {
      // Arrange
      const cachedData = {
        stories: [
          { id: 1, title: 'Test Story', score: 100, time: new Date() }
        ],
        pagination: { limit: 50, offset: 0, hasMore: false }
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('hn:fresh:stories:50:0');
      expect(result).toEqual(cachedData);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should use correct cache key format', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(25, 10);

      // Assert
      expect(cacheService.get).toHaveBeenCalledWith('hn:fresh:stories:25:10');
    });

    it('should set cache with correct TTL after database query', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockStories = [
        { id: 1, title: 'Story 1', score: 200, time: new Date(), url: 'http://test.com' }
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockStories),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(
        'hn:fresh:stories:50:0',
        expect.any(Object),
        300 // 5 minutes TTL
      );
    });
  });

  describe('Fresh Data Query Tests', () => {
    it('should query only stories from last 48 hours', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'story.time >= :timeThreshold',
        {
          timeThreshold: expect.any(Date)
        }
      );

      // Check that timeThreshold is approximately 48 hours ago
      const whereCall = mockQueryBuilder.where.mock.calls[0];
      const timeThreshold = whereCall[1].timeThreshold;
      const expectedTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const timeDiff = Math.abs(timeThreshold.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should order by score DESC, then time DESC', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('story.score', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('story.time', 'DESC');
    });

    it('should apply correct limit and offset', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(25, 10);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('Response Format Tests', () => {
    it('should return properly formatted response with stories and pagination', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const mockStories = [
        { 
          id: 1, 
          title: 'Test Story', 
          score: 200, 
          time: new Date('2023-01-01T12:00:00Z'), 
          url: 'https://example.com' 
        }
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockStories),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result).toHaveProperty('stories');
      expect(result).toHaveProperty('pagination');
      expect(result.stories).toHaveLength(1);
      expect(result.stories[0]).toHaveProperty('timeAgo');
      expect(result.stories[0]).toHaveProperty('domain');
      expect(result.pagination).toEqual({
        limit: 50,
        offset: 0,
        hasMore: false
      });
    });

    it('should add timeAgo and domain to stories', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      const testTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockStories = [
        { 
          id: 1, 
          title: 'Test Story', 
          score: 200, 
          time: testTime, 
          url: 'https://www.example.com/article' 
        }
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockStories),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getTopStories(50, 0);

      // Assert
      expect(result.stories[0].timeAgo).toBe('2h ago');
      expect(result.stories[0].domain).toBe('example.com');
    });
  });

  describe('Performance Logging Tests', () => {
    it('should log cache hits', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'debug');
      mockCacheService.get.mockResolvedValue({ stories: [], pagination: {} });

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Cache hit for hn:fresh:stories:50:0');
    });

    it('should log query execution time on cache miss', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'debug');
      mockCacheService.get.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTopStories(50, 0);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Cache miss for hn:fresh:stories:50:0, querying database');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Fresh stories query completed in \d+ms, found 0 stories/)
      );
    });
  });
});