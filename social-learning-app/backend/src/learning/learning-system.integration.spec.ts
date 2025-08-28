import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LearningModule } from './learning.module';
import { LearningAlgorithmService } from './learning-algorithm.service';
import { AchievementService } from './achievement.service';
import { LearningPathService } from './learning-path.service';
import { SkillChallengeService } from './skill-challenge.service';

// Entities
import { UserLearningProfile } from '../entities/user-learning-profile.entity';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { ContentDifficultyAssessment } from '../entities/content-difficulty.entity';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { LlmService } from '../llm/llm.service';

// Mock implementations for external dependencies
class MockCacheService {
  private cache = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

class MockLlmService {
  async summarizePaper(paper: any) {
    return {
      tldr: `AI-generated summary of ${paper.title}`,
      paradigms: { machine_learning: 8, artificial_intelligence: 9 },
      meritScore: 85,
    };
  }
}

describe('Learning System Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let learningService: LearningAlgorithmService;
  let achievementService: AchievementService;
  let pathService: LearningPathService;
  let challengeService: SkillChallengeService;

  // Repositories for direct data setup
  let userRepo: Repository<User>;
  let profileRepo: Repository<UserLearningProfile>;
  let achievementRepo: Repository<Achievement>;
  let difficultyRepo: Repository<ContentDifficultyAssessment>;
  let pathRepo: Repository<LearningPath>;
  let challengeRepo: Repository<SkillChallenge>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            UserLearningProfile,
            Achievement,
            UserAchievement,
            ContentDifficultyAssessment,
            LearningPath,
            UserLearningPathEnrollment,
            SkillChallenge,
            ChallengeAttempt,
          ],
          synchronize: true,
          logging: false,
        }),
        LearningModule,
      ],
    })
      .overrideProvider(CacheService)
      .useClass(MockCacheService)
      .overrideProvider(LlmService)
      .useClass(MockLlmService)
      .compile();

    dataSource = module.get<DataSource>(DataSource);
    learningService = module.get<LearningAlgorithmService>(LearningAlgorithmService);
    achievementService = module.get<AchievementService>(AchievementService);
    pathService = module.get<LearningPathService>(LearningPathService);
    challengeService = module.get<SkillChallengeService>(SkillChallengeService);

    // Get repositories for test data setup
    userRepo = dataSource.getRepository(User);
    profileRepo = dataSource.getRepository(UserLearningProfile);
    achievementRepo = dataSource.getRepository(Achievement);
    difficultyRepo = dataSource.getRepository(ContentDifficultyAssessment);
    pathRepo = dataSource.getRepository(LearningPath);
    challengeRepo = dataSource.getRepository(SkillChallenge);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await dataSource.synchronize(true);
  });

  describe('Complete User Learning Journey', () => {
    it('should simulate a complete user learning experience', async () => {
      // 1. Set up test data
      const testUser = await userRepo.save({
        id: 'test-user-123',
        username: 'learner',
        email: 'learner@test.com',
        passwordHash: 'hashed',
      });

      // Create some content with difficulty assessments
      const easyContent = await difficultyRepo.save({
        contentId: 'easy-ai-paper',
        contentType: 'research',
        primarySkillArea: 'artificial_intelligence',
        overallDifficulty: 'beginner',
        difficultyMetrics: {
          conceptualComplexity: 3,
          prerequisiteKnowledge: 2,
          technicalDepth: 3,
          readingLevel: 4,
          timeToUnderstand: 10,
          applicationDifficulty: 3,
        },
        learningOutcomes: {
          skills: ['artificial_intelligence'],
          concepts: ['neural_networks', 'machine_learning'],
          prerequisites: [],
          followUpTopics: ['deep_learning'],
          confidenceBoost: 7,
        },
        learningValue: 8,
        assessedBy: 'algorithm',
        confidence: 0.85,
      });

      const mediumContent = await difficultyRepo.save({
        contentId: 'medium-ai-paper',
        contentType: 'research',
        primarySkillArea: 'artificial_intelligence',
        overallDifficulty: 'intermediate',
        difficultyMetrics: {
          conceptualComplexity: 6,
          prerequisiteKnowledge: 5,
          technicalDepth: 7,
          readingLevel: 7,
          timeToUnderstand: 25,
          applicationDifficulty: 6,
        },
        learningOutcomes: {
          skills: ['artificial_intelligence', 'deep_learning'],
          concepts: ['transformers', 'attention_mechanisms'],
          prerequisites: ['neural_networks'],
          followUpTopics: ['large_language_models'],
          confidenceBoost: 8,
        },
        learningValue: 9,
        assessedBy: 'algorithm',
        confidence: 0.90,
      });

      // Create an achievement for content consumption
      const contentAchievement = await achievementRepo.save({
        name: 'Knowledge Seeker',
        description: 'Consume 5 pieces of learning content',
        category: 'content_consumption',
        tier: 'bronze',
        criteria: { type: 'content_consumed', threshold: 5 },
        statusPoints: 100,
        isActive: true,
        rarityScore: 20,
      });

      // Create a learning streak achievement
      const streakAchievement = await achievementRepo.save({
        name: 'Consistent Learner',
        description: 'Maintain a 7-day learning streak',
        category: 'learning_streak',
        tier: 'silver',
        criteria: { type: 'learning_streak', threshold: 7 },
        statusPoints: 200,
        isActive: true,
        rarityScore: 40,
      });

      // Create a learning path
      const aiPath = await pathRepo.save({
        title: 'AI Fundamentals Path',
        description: 'Learn the basics of artificial intelligence',
        skillArea: 'artificial_intelligence',
        steps: [
          {
            id: 'step-1',
            title: 'Introduction to AI',
            description: 'Basic AI concepts',
            estimatedTimeMinutes: 30,
            difficulty: 'beginner',
            contentIds: [{ id: 'easy-ai-paper', type: 'research', isRequired: true }],
            completionCriteria: { readContent: true },
            prerequisites: [],
          },
          {
            id: 'step-2',
            title: 'Advanced AI Concepts',
            description: 'Deep dive into AI',
            estimatedTimeMinutes: 60,
            difficulty: 'intermediate',
            contentIds: [{ id: 'medium-ai-paper', type: 'research', isRequired: true }],
            completionCriteria: { readContent: true },
            prerequisites: ['step-1'],
          },
        ],
        estimatedDurationDays: 7,
        targetLevel: 'intermediate',
        metrics: {
          enrollmentCount: 0,
          completionCount: 0,
          averageCompletionTime: 0,
          satisfactionRating: 0,
          dropoffPoints: [],
        },
        isActive: true,
      });

      // Create a skill challenge
      const aiChallenge = await challengeRepo.save({
        title: 'AI Basics Quiz',
        description: 'Test your knowledge of AI fundamentals',
        skillArea: 'artificial_intelligence',
        type: 'quiz',
        difficultyLevel: 'beginner',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            question: 'What is machine learning?',
            options: ['A subset of AI', 'A type of hardware', 'A programming language'],
            correctAnswer: 0,
            weight: 10,
          },
        ],
        timeLimit: 30,
        passingScore: 7,
        statusPointsAwarded: 50,
        status: 'active',
      });

      // 2. Test initial state - user has no learning profile
      let recommendations = await learningService.getPersonalizedRecommendations(testUser.id);
      expect(recommendations).toHaveLength(0); // No skills = no recommendations initially

      // 3. Simulate user learning activities over time
      
      // Day 1: User reads easy content
      await learningService.trackLearningActivity(testUser.id, 'content_consumed', {
        contentId: 'easy-ai-paper',
        skillArea: 'artificial_intelligence',
        timeSpentMinutes: 15,
        completionRate: 1.0,
        difficultyLevel: 'beginner',
      });

      // Check that profile was created
      let profile = await profileRepo.findOne({ where: { userId: testUser.id } });
      expect(profile).toBeDefined();
      expect(profile?.skills).toHaveProperty('artificial_intelligence');
      expect(profile?.metrics.totalContentConsumed).toBe(1);

      // Day 2: User reads more content
      await learningService.trackLearningActivity(testUser.id, 'content_consumed', {
        contentId: 'another-ai-paper',
        skillArea: 'artificial_intelligence',
        timeSpentMinutes: 20,
        completionRate: 0.8,
        difficultyLevel: 'beginner',
      });

      // Continue learning activities to trigger achievements
      for (let day = 3; day <= 7; day++) {
        await learningService.trackLearningActivity(testUser.id, 'content_consumed', {
          contentId: `content-day-${day}`,
          skillArea: 'artificial_intelligence',
          timeSpentMinutes: 18,
          completionRate: 0.9,
          difficultyLevel: 'beginner',
        });
      }

      // 4. Check that achievements were awarded
      const userAchievements = await achievementService.getUserAchievements(testUser.id);
      expect(userAchievements.length).toBeGreaterThan(0);
      
      const achievementNames = userAchievements.map(ua => ua.achievement.name);
      expect(achievementNames).toContain('Knowledge Seeker'); // Should have consumed 5+ content pieces
      expect(achievementNames).toContain('Consistent Learner'); // Should have 7-day streak

      // 5. Test personalized recommendations now that user has skills
      profile = await profileRepo.findOne({ where: { userId: testUser.id } });
      expect(profile?.skills.artificial_intelligence.level).toBe('beginner');
      
      recommendations = await learningService.getPersonalizedRecommendations(testUser.id, 'artificial_intelligence');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].skillsAddressed).toContain('artificial_intelligence');

      // 6. Test learning progress insights
      const insights = await learningService.getLearningProgressInsights(testUser.id);
      expect(insights.overallProgressScore).toBeGreaterThan(0);
      expect(insights.currentLevel).toBeDefined();
      expect(insights.strengths.length).toBeGreaterThanOrEqual(0);
      expect(insights.motivationalMessage).toBeDefined();

      // 7. Test learning path enrollment
      const enrollment = await pathService.enrollUser(testUser.id, aiPath.id);
      expect(enrollment.userId).toBe(testUser.id);
      expect(enrollment.pathId).toBe(aiPath.id);

      // 8. Test skill challenge
      const attempt = await challengeService.startAttempt(testUser.id, aiChallenge.id);
      expect(attempt.userId).toBe(testUser.id);
      expect(attempt.challengeId).toBe(aiChallenge.id);

      const result = await challengeService.submitAttempt(attempt.id, { q1: 0 });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.submittedAt).toBeDefined();

      // 9. Verify final state shows learning progression
      const finalProfile = await profileRepo.findOne({ where: { userId: testUser.id } });
      expect(finalProfile?.metrics.totalContentConsumed).toBeGreaterThanOrEqual(5);
      expect(finalProfile?.skills.artificial_intelligence.experience).toBeGreaterThan(0);
      expect(Object.keys(finalProfile?.streaks || {}).length).toBeGreaterThan(0);
    });

    it('should correctly calculate skill progression and level ups', async () => {
      const testUser = await userRepo.save({
        id: 'progression-user',
        username: 'progressor',
        email: 'progress@test.com',
        passwordHash: 'hashed',
      });

      // Track many learning activities to trigger level up
      for (let i = 0; i < 50; i++) { // Should generate enough experience to level up
        await learningService.trackLearningActivity(testUser.id, 'content_consumed', {
          contentId: `content-${i}`,
          skillArea: 'machine_learning',
          timeSpentMinutes: 20,
          completionRate: 1.0,
          difficultyLevel: 'intermediate', // Higher difficulty = more experience
        });
      }

      const profile = await profileRepo.findOne({ where: { userId: testUser.id } });
      expect(profile?.skills.machine_learning).toBeDefined();
      
      // Should have leveled up from beginner
      const mlSkill = profile?.skills.machine_learning;
      expect(['intermediate', 'advanced'].includes(mlSkill?.level || '')).toBe(true);
      expect(mlSkill?.assessmentHistory.length).toBeGreaterThan(0);
    });

    it('should generate appropriate difficulty recommendations based on skill level', async () => {
      const testUser = await userRepo.save({
        id: 'difficulty-user',
        username: 'difficultytest',
        email: 'difficulty@test.com',  
        passwordHash: 'hashed',
      });

      // Create content at different difficulty levels
      await difficultyRepo.save({
        contentId: 'beginner-content',
        contentType: 'research',
        primarySkillArea: 'data_science',
        overallDifficulty: 'beginner',
        difficultyMetrics: {
          conceptualComplexity: 2,
          prerequisiteKnowledge: 1,
          technicalDepth: 2,
          readingLevel: 3,
          timeToUnderstand: 8,
          applicationDifficulty: 2,
        },
        learningOutcomes: {
          skills: ['data_science'],
          concepts: ['statistics'],
          prerequisites: [],
          followUpTopics: ['regression'],
          confidenceBoost: 6,
        },
        learningValue: 6,
        assessedBy: 'algorithm',
        confidence: 0.90,
      });

      await difficultyRepo.save({
        contentId: 'expert-content',
        contentType: 'research', 
        primarySkillArea: 'data_science',
        overallDifficulty: 'expert',
        difficultyMetrics: {
          conceptualComplexity: 9,
          prerequisiteKnowledge: 8,
          technicalDepth: 10,
          readingLevel: 9,
          timeToUnderstand: 60,
          applicationDifficulty: 9,
        },
        learningOutcomes: {
          skills: ['data_science', 'advanced_statistics'],
          concepts: ['bayesian_inference', 'causal_inference'],
          prerequisites: ['statistics', 'regression', 'machine_learning'],
          followUpTopics: ['research_methodology'],
          confidenceBoost: 10,
        },
        learningValue: 10,
        assessedBy: 'expert',
        confidence: 0.95,
      });

      // User starts as beginner
      await learningService.trackLearningActivity(testUser.id, 'content_consumed', {
        contentId: 'starter-content',
        skillArea: 'data_science', 
        timeSpentMinutes: 15,
        completionRate: 1.0,
        difficultyLevel: 'beginner',
      });

      // Should recommend beginner content
      const beginnerRecommendations = await learningService.getPersonalizedRecommendations(
        testUser.id, 
        'data_science'
      );
      
      expect(beginnerRecommendations.length).toBeGreaterThan(0);
      // Should not get expert level content when user is beginner
      const hasExpertContent = beginnerRecommendations.some(r => r.difficulty === 'expert');
      expect(hasExpertContent).toBe(false);
    });
  });
});