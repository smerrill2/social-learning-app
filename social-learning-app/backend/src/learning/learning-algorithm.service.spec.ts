import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningAlgorithmService } from './learning-algorithm.service';
import { UserLearningProfile } from '../entities/user-learning-profile.entity';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { ContentDifficultyAssessment } from '../entities/content-difficulty.entity';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { LlmService } from '../llm/llm.service';

describe('LearningAlgorithmService', () => {
  let service: LearningAlgorithmService;
  let profileRepo: jest.Mocked<Repository<UserLearningProfile>>;
  let achievementRepo: jest.Mocked<Repository<Achievement>>;
  let userAchievementRepo: jest.Mocked<Repository<UserAchievement>>;
  let difficultyRepo: jest.Mocked<Repository<ContentDifficultyAssessment>>;
  let pathRepo: jest.Mocked<Repository<LearningPath>>;
  let enrollmentRepo: jest.Mocked<Repository<UserLearningPathEnrollment>>;
  let challengeRepo: jest.Mocked<Repository<SkillChallenge>>;
  let attemptRepo: jest.Mocked<Repository<ChallengeAttempt>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let cacheService: jest.Mocked<CacheService>;
  let llmService: jest.Mocked<LlmService>;

  const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
    })),
  });

  const mockCacheService = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  });

  const mockLlmService = () => ({
    summarizePaper: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningAlgorithmService,
        {
          provide: getRepositoryToken(UserLearningProfile),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Achievement),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(ContentDifficultyAssessment),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(LearningPath),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(UserLearningPathEnrollment),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(SkillChallenge),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(ChallengeAttempt),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: CacheService,
          useFactory: mockCacheService,
        },
        {
          provide: LlmService,
          useFactory: mockLlmService,
        },
      ],
    }).compile();

    service = module.get<LearningAlgorithmService>(LearningAlgorithmService);
    profileRepo = module.get(getRepositoryToken(UserLearningProfile));
    achievementRepo = module.get(getRepositoryToken(Achievement));
    userAchievementRepo = module.get(getRepositoryToken(UserAchievement));
    difficultyRepo = module.get(getRepositoryToken(ContentDifficultyAssessment));
    pathRepo = module.get(getRepositoryToken(LearningPath));
    enrollmentRepo = module.get(getRepositoryToken(UserLearningPathEnrollment));
    challengeRepo = module.get(getRepositoryToken(SkillChallenge));
    attemptRepo = module.get(getRepositoryToken(ChallengeAttempt));
    userRepo = module.get(getRepositoryToken(User));
    cacheService = module.get(CacheService);
    llmService = module.get(LlmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return cached recommendations if available', async () => {
      const userId = 'test-user';
      const mockRecommendations = [
        {
          contentId: 'content-1',
          contentType: 'research' as const,
          title: 'Test Research',
          difficulty: 'intermediate' as const,
          relevanceScore: 0.8,
          learningValue: 8,
          estimatedTimeMinutes: 15,
          skillsAddressed: ['ai'],
          whyRecommended: 'Great for AI learning',
          priorityLevel: 'high' as const,
        },
      ];

      cacheService.get.mockResolvedValue(mockRecommendations);

      const result = await service.getPersonalizedRecommendations(userId);

      expect(result).toEqual(mockRecommendations);
      expect(cacheService.get).toHaveBeenCalledWith('learning:recommendations:test-user:all:10');
    });

    it('should generate new recommendations when cache is empty', async () => {
      const userId = 'test-user';
      const mockProfile = {
        userId,
        skills: {
          ai: {
            level: 'intermediate' as const,
            experience: 500,
            confidence: 70,
            validated: false,
            lastAssessed: new Date(),
            assessmentHistory: [],
          },
        },
        difficultyPreference: 60,
      };

      const mockContentAssessments = [
        {
          contentId: 'content-1',
          contentType: 'research' as const,
          primarySkillArea: 'ai',
          secondarySkillAreas: ['ml'],
          overallDifficulty: 'intermediate' as const,
          difficultyMetrics: {
            conceptualComplexity: 6,
            prerequisiteKnowledge: 5,
            technicalDepth: 7,
            readingLevel: 6,
            timeToUnderstand: 20,
            applicationDifficulty: 6,
          },
          learningValue: 8,
        },
      ];

      cacheService.get.mockResolvedValue(null);
      profileRepo.findOne.mockResolvedValue(mockProfile as any);
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockContentAssessments),
      };
      difficultyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getPersonalizedRecommendations(userId);

      expect(result).toHaveLength(1);
      expect(result[0].contentId).toBe('content-1');
      expect(result[0].skillsAddressed).toContain('ai');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('trackLearningActivity', () => {
    it('should create new profile if none exists', async () => {
      const userId = 'new-user';
      const activityType = 'content_consumed';
      const metadata = { contentId: 'content-1', skillArea: 'ai', timeSpentMinutes: 15 };

      profileRepo.findOne.mockResolvedValue(null);
      
      const mockNewProfile = {
        userId,
        skills: {},
        metrics: {
          totalContentConsumed: 0,
          averageEngagementRate: 0,
          preferredLearningTimes: [],
          averageSessionDuration: 0,
          completionRate: 0,
          retentionScore: 0,
          applicationRate: 0,
        },
        goals: { shortTerm: [], longTerm: [], interests: [] },
        streaks: {},
        difficultyPreference: 50,
        adaptiveLearningRate: 0.7,
      };

      profileRepo.create.mockReturnValue(mockNewProfile as any);
      profileRepo.save.mockResolvedValue(mockNewProfile as any);

      // Mock achievement checking
      userAchievementRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      achievementRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      await service.trackLearningActivity(userId, activityType, metadata);

      expect(profileRepo.create).toHaveBeenCalled();
      expect(profileRepo.save).toHaveBeenCalledTimes(2); // once for create, once for update
    });

    it('should update existing profile metrics', async () => {
      const userId = 'existing-user';
      const mockProfile = {
        userId,
        skills: {},
        metrics: {
          totalContentConsumed: 5,
          averageEngagementRate: 0.7,
          preferredLearningTimes: [],
          averageSessionDuration: 20,
          completionRate: 0.8,
          retentionScore: 0.75,
          applicationRate: 0.6,
        },
        goals: { shortTerm: [], longTerm: [], interests: [] },
        streaks: {},
        difficultyPreference: 50,
        adaptiveLearningRate: 0.7,
      };

      profileRepo.findOne.mockResolvedValue(mockProfile as any);

      // Mock achievement checking
      userAchievementRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      achievementRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      await service.trackLearningActivity(
        userId,
        'content_consumed',
        { timeSpentMinutes: 25, completionRate: 0.9 }
      );

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            totalContentConsumed: 6,
            averageSessionDuration: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getLearningProgressInsights', () => {
    it('should return cached insights if available', async () => {
      const userId = 'test-user';
      const mockInsights = {
        userId,
        overallProgressScore: 65,
        currentLevel: 'intermediate' as const,
        skillGaps: ['advanced-ai'],
        strengths: ['basic-ml'],
        recommendedActions: ['Practice more'],
        nextMilestones: [{ skill: 'ai', timeframe: '2 weeks' }],
        motivationalMessage: 'Great progress!',
      };

      cacheService.get.mockResolvedValue(mockInsights);

      const result = await service.getLearningProgressInsights(userId);

      expect(result).toEqual(mockInsights);
      expect(cacheService.get).toHaveBeenCalledWith('learning:insights:test-user');
    });

    it('should generate insights when cache is empty', async () => {
      const userId = 'test-user';
      const mockProfile = {
        userId,
        skills: {
          ai: {
            level: 'advanced' as const,
            experience: 800,
            confidence: 85,
            validated: true,
            lastAssessed: new Date(),
            assessmentHistory: [],
          },
          ml: {
            level: 'intermediate' as const,
            experience: 300,
            confidence: 45, // Low confidence = skill gap
            validated: false,
            lastAssessed: new Date(),
            assessmentHistory: [],
          },
        },
        metrics: {
          totalContentConsumed: 20,
          completionRate: 0.8,
          applicationRate: 0.6,
        },
        goals: { shortTerm: [], longTerm: [], interests: [] },
        streaks: { content_consumed: { current: 5, longest: 10, lastActivity: new Date() } },
      };

      cacheService.get.mockResolvedValue(null);
      profileRepo.findOne.mockResolvedValue(mockProfile as any);

      const result = await service.getLearningProgressInsights(userId);

      expect(result.overallProgressScore).toBeGreaterThan(0);
      expect(result.currentLevel).toBeDefined();
      expect(result.skillGaps).toContain('ml'); // Should identify low confidence skill
      expect(result.strengths).toContain('ai'); // Should identify advanced skill
      expect(result.motivationalMessage).toBeDefined();
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('skill level progression', () => {
    it('should correctly convert skill levels to numbers and back', async () => {
      const userId = 'test-user';
      const mockProfile = {
        userId,
        skills: {
          testSkill: {
            level: 'intermediate' as const,
            experience: 975, // Should reach 1005 with expert difficulty (30 exp)
            confidence: 70,
            validated: false,
            lastAssessed: new Date(),
            assessmentHistory: [],
          },
        },
        metrics: {} as any,
        goals: {} as any,
        streaks: {},
        difficultyPreference: 50,
        adaptiveLearningRate: 0.7,
      };

      profileRepo.findOne.mockResolvedValue(mockProfile as any);

      // Mock achievement checking
      userAchievementRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      achievementRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Track high-difficulty activity to push experience over 1000
      await service.trackLearningActivity(userId, 'content_consumed', {
        skillArea: 'testSkill',
        difficultyLevel: 'expert',
        timeSpentMinutes: 30,
      });

      // Verify that the skill leveled up
      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: expect.objectContaining({
            testSkill: expect.objectContaining({
              level: 'advanced', // Should have leveled up from intermediate
              experience: expect.any(Number),
            }),
          }),
        })
      );
    });
  });

  describe('achievement system', () => {
    it('should award achievements when criteria are met', async () => {
      const userId = 'test-user';
      const mockProfile = {
        userId,
        skills: {},
        metrics: {
          totalContentConsumed: 10,
        },
        streaks: {
          content_consumed: { current: 7, longest: 7, lastActivity: new Date() },
        },
        goals: {} as any,
        difficultyPreference: 50,
        adaptiveLearningRate: 0.7,
      };

      const mockAchievement = {
        id: 'streak-achievement',
        name: '7-Day Streak',
        criteria: { type: 'learning_streak', threshold: 7 },
        statusPoints: 100,
      };

      profileRepo.findOne.mockResolvedValue(mockProfile as any);

      // Mock no existing achievements
      userAchievementRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      // Mock available achievements
      achievementRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAchievement]),
      } as any);

      userAchievementRepo.create.mockReturnValue({
        userId,
        achievementId: 'streak-achievement',
        earnedAt: new Date(),
        earnedData: { trigger: 'content_consumed' },
      } as any);

      await service.trackLearningActivity(userId, 'content_consumed', {
        skillArea: 'ai',
        timeSpentMinutes: 15,
      });

      expect(userAchievementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          achievementId: 'streak-achievement',
        })
      );
      expect(userAchievementRepo.save).toHaveBeenCalled();
    });
  });
});