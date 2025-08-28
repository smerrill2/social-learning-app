import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLearningProfile, SkillLevel, SkillAssessment } from '../entities/user-learning-profile.entity';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { ContentDifficultyAssessment, DifficultyLevel } from '../entities/content-difficulty.entity';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { LlmService } from '../llm/llm.service';

export interface PersonalizedLearningRecommendation {
  contentId: string;
  contentType: 'research' | 'hackernews' | 'insight' | 'challenge';
  title: string;
  difficulty: DifficultyLevel;
  relevanceScore: number; // 0-1
  learningValue: number; // 1-10
  estimatedTimeMinutes: number;
  skillsAddressed: string[];
  whyRecommended: string;
  priorityLevel: 'high' | 'medium' | 'low';
}

export interface LearningProgressInsight {
  userId: string;
  overallProgressScore: number; // 0-100
  currentLevel: SkillLevel;
  skillGaps: string[];
  strengths: string[];
  recommendedActions: string[];
  nextMilestones: Array<{ skill: string; timeframe: string; }>;
  motivationalMessage: string;
}

@Injectable()
export class LearningAlgorithmService {
  private readonly logger = new Logger(LearningAlgorithmService.name);

  constructor(
    @InjectRepository(UserLearningProfile)
    private profileRepo: Repository<UserLearningProfile>,
    @InjectRepository(Achievement)
    private achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(ContentDifficultyAssessment)
    private difficultyRepo: Repository<ContentDifficultyAssessment>,
    @InjectRepository(LearningPath)
    private pathRepo: Repository<LearningPath>,
    @InjectRepository(UserLearningPathEnrollment)
    private enrollmentRepo: Repository<UserLearningPathEnrollment>,
    @InjectRepository(SkillChallenge)
    private challengeRepo: Repository<SkillChallenge>,
    @InjectRepository(ChallengeAttempt)
    private attemptRepo: Repository<ChallengeAttempt>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cache: CacheService,
    private llm: LlmService,
  ) {}

  /**
   * Main algorithm: Generate personalized learning recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    skillArea?: string,
    limit: number = 10
  ): Promise<PersonalizedLearningRecommendation[]> {
    const cacheKey = `learning:recommendations:${userId}:${skillArea || 'all'}:${limit}`;
    const cached = await this.cache.get<PersonalizedLearningRecommendation[]>(cacheKey);
    if (cached) return cached;

    // Get user's learning profile
    const profile = await this.getUserLearningProfile(userId);
    const userSkills = profile.skills || {};
    
    // Find content at appropriate difficulty levels
    const targetSkills = skillArea ? [skillArea] : Object.keys(userSkills);
    const recommendations: PersonalizedLearningRecommendation[] = [];

    for (const skill of targetSkills) {
      const userSkill = userSkills[skill];
      const targetDifficulty = this.calculateOptimalDifficulty(userSkill, profile.difficultyPreference);
      
      // Find relevant content at this difficulty
      const content = await this.difficultyRepo
        .createQueryBuilder('assessment')
        .where('assessment.primarySkillArea = :skill', { skill })
        .andWhere('assessment.overallDifficulty = :difficulty', { difficulty: targetDifficulty })
        .orderBy('assessment.learningValue', 'DESC')
        .limit(Math.ceil(limit / targetSkills.length))
        .getMany();

      for (const item of content) {
        const relevanceScore = this.calculateRelevanceScore(item, userSkill, profile);
        const whyRecommended = this.generateRecommendationReason(item, userSkill, profile);
        
        // Only include content types that are supported in recommendations
        if (item.contentType === 'research' || item.contentType === 'hackernews' || item.contentType === 'insight' || item.contentType === 'challenge') {
          recommendations.push({
            contentId: item.contentId,
            contentType: item.contentType,
            title: `Learning content for ${item.primarySkillArea}`, // Would be enriched with actual title
            difficulty: item.overallDifficulty as 'beginner' | 'intermediate' | 'advanced' | 'expert',
            relevanceScore,
            learningValue: item.learningValue,
            estimatedTimeMinutes: item.difficultyMetrics.timeToUnderstand,
            skillsAddressed: [item.primarySkillArea, ...(item.secondarySkillAreas || [])],
            whyRecommended,
            priorityLevel: this.calculatePriorityLevel(relevanceScore, item.learningValue),
          });
        }
      }
    }

    // Sort by relevance and learning value
    recommendations.sort((a, b) => {
      const scoreA = (a.relevanceScore * 0.6) + (a.learningValue / 10 * 0.4);
      const scoreB = (b.relevanceScore * 0.6) + (b.learningValue / 10 * 0.4);
      return scoreB - scoreA;
    });

    const result = recommendations.slice(0, limit);
    await this.cache.set(cacheKey, result, 60 * 30); // 30 minute cache
    return result;
  }

  /**
   * Track user learning activity and update their profile
   */
  async trackLearningActivity(
    userId: string,
    activityType: 'content_consumed' | 'challenge_completed' | 'insight_applied' | 'peer_helped',
    metadata: {
      contentId?: string;
      skillArea?: string;
      timeSpentMinutes?: number;
      completionRate?: number;
      difficultyLevel?: DifficultyLevel;
      [key: string]: any;
    }
  ): Promise<void> {
    const profile = await this.getUserLearningProfile(userId);
    
    // Update learning metrics
    profile.metrics = profile.metrics || {
      totalContentConsumed: 0,
      averageEngagementRate: 0,
      preferredLearningTimes: [],
      averageSessionDuration: 0,
      completionRate: 0,
      retentionScore: 0,
      applicationRate: 0,
    };

    // Update relevant metrics based on activity type
    switch (activityType) {
      case 'content_consumed':
        profile.metrics.totalContentConsumed += 1;
        if (metadata.timeSpentMinutes) {
          profile.metrics.averageSessionDuration = this.updateRunningAverage(
            profile.metrics.averageSessionDuration,
            metadata.timeSpentMinutes,
            profile.metrics.totalContentConsumed
          );
        }
        if (metadata.completionRate !== undefined) {
          profile.metrics.completionRate = this.updateRunningAverage(
            profile.metrics.completionRate,
            metadata.completionRate,
            profile.metrics.totalContentConsumed
          );
        }
        break;
      
      case 'insight_applied':
        profile.metrics.applicationRate = this.updateRunningAverage(
          profile.metrics.applicationRate,
          1,
          profile.metrics.totalContentConsumed
        );
        break;
    }

    // Update skill assessments if skill area is provided
    if (metadata.skillArea) {
      await this.updateSkillAssessment(profile, metadata.skillArea, metadata.difficultyLevel);
    }

    // Update learning streaks
    await this.updateLearningStreaks(profile, activityType);

    // Check for new achievements
    await this.checkAndAwardAchievements(userId, profile, activityType, metadata);

    // Save updated profile
    profile.lastLearningActivity = new Date();
    await this.profileRepo.save(profile);

    // Clear recommendation cache
    await this.clearUserRecommendationCache(userId);
  }

  /**
   * Generate learning progress insights and motivational content
   */
  async getLearningProgressInsights(userId: string): Promise<LearningProgressInsight> {
    const cacheKey = `learning:insights:${userId}`;
    const cached = await this.cache.get<LearningProgressInsight>(cacheKey);
    if (cached) return cached;

    const profile = await this.getUserLearningProfile(userId);
    const userSkills = profile.skills || {};

    // Calculate overall progress score
    const skillLevels = Object.values(userSkills).map(s => this.skillLevelToNumber(s.level));
    const overallProgressScore = skillLevels.length > 0 
      ? Math.round(skillLevels.reduce((a, b) => a + b, 0) / skillLevels.length * 20) // Convert to 0-100
      : 0;

    // Determine current level
    const averageLevel = this.numberToSkillLevel(Math.round(overallProgressScore / 20));

    // Identify skill gaps and strengths
    const skillGaps = Object.entries(userSkills)
      .filter(([_, skill]) => skill.experience < 500 || skill.confidence < 60)
      .map(([skillName]) => skillName);

    const strengths = Object.entries(userSkills)
      .filter(([_, skill]) => skill.level === 'advanced' || skill.level === 'expert')
      .map(([skillName]) => skillName);

    // Generate recommendations
    const recommendedActions = await this.generateLearningRecommendations(profile);

    // Identify next milestones
    const nextMilestones = Object.entries(userSkills)
      .map(([skillName, skill]) => ({
        skill: skillName,
        timeframe: this.estimateTimeToNextLevel(skill),
      }))
      .filter(m => m.timeframe !== 'Mastered')
      .slice(0, 3);

    // Generate motivational message
    const motivationalMessage = await this.generateMotivationalMessage(profile, overallProgressScore);

    const insights: LearningProgressInsight = {
      userId,
      overallProgressScore,
      currentLevel: averageLevel,
      skillGaps,
      strengths,
      recommendedActions,
      nextMilestones,
      motivationalMessage,
    };

    await this.cache.set(cacheKey, insights, 60 * 60); // 1 hour cache
    return insights;
  }

  /**
   * Get or create a user's learning profile
   */
  private async getUserLearningProfile(userId: string): Promise<UserLearningProfile> {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    
    if (!profile) {
      profile = this.profileRepo.create({
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
        goals: {
          shortTerm: [],
          longTerm: [],
          interests: [],
        },
        streaks: {},
        difficultyPreference: 50,
        adaptiveLearningRate: 0.7,
      });
      await this.profileRepo.save(profile);
    }
    
    return profile;
  }

  /**
   * Calculate optimal difficulty level for user based on their skill and preferences
   */
  private calculateOptimalDifficulty(skill: SkillAssessment | undefined, difficultyPreference: number): DifficultyLevel {
    if (!skill) return 'beginner';
    
    const baseLevel = skill.level;
    const confidenceAdjustment = (skill.confidence - 70) / 30; // -1 to 1 adjustment
    const preferenceAdjustment = (difficultyPreference - 50) / 50; // -1 to 1 adjustment
    
    let levelNumber = this.skillLevelToNumber(baseLevel);
    levelNumber += (confidenceAdjustment + preferenceAdjustment) * 0.3;
    
    const adjustedLevel = Math.max(1, Math.min(4, Math.round(levelNumber)));
    return this.numberToDifficultyLevel(adjustedLevel);
  }

  /**
   * Calculate relevance score for content based on user profile
   */
  private calculateRelevanceScore(
    content: ContentDifficultyAssessment,
    userSkill: SkillAssessment | undefined,
    profile: UserLearningProfile
  ): number {
    let score = 0.5; // Base score
    
    // Skill level match
    if (userSkill) {
      const levelDiff = Math.abs(
        this.skillLevelToNumber(userSkill.level) - 
        this.skillLevelToNumber(content.overallDifficulty)
      );
      score += Math.max(0, 0.3 - levelDiff * 0.1);
    }
    
    // Learning goals alignment
    const goals = [
      ...(profile.goals?.shortTerm || []), 
      ...(profile.goals?.longTerm || [])
    ];
    if (goals.some(g => g.skill === content.primarySkillArea)) {
      score += 0.2;
    }
    
    // Recent activity in this skill area
    if (userSkill?.lastAssessed && 
        new Date(userSkill.lastAssessed).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      score += 0.1;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  private generateRecommendationReason(
    content: ContentDifficultyAssessment,
    userSkill: SkillAssessment | undefined,
    profile: UserLearningProfile
  ): string {
    const reasons: string[] = [];
    
    if (!userSkill) {
      reasons.push(`Great introduction to ${content.primarySkillArea}`);
    } else {
      const levelMatch = this.calculateOptimalDifficulty(userSkill, profile.difficultyPreference);
      if (levelMatch === content.overallDifficulty) {
        reasons.push(`Perfect difficulty match for your ${content.primarySkillArea} level`);
      }
    }
    
    if (content.learningValue >= 8) {
      reasons.push('High learning value content');
    }
    
    if (profile.goals?.shortTerm?.some(g => g.skill === content.primarySkillArea)) {
      reasons.push('Aligned with your current learning goals');
    }
    
    return reasons.join('. ') || `Recommended for ${content.primarySkillArea} development`;
  }

  private calculatePriorityLevel(relevanceScore: number, learningValue: number): 'high' | 'medium' | 'low' {
    const combinedScore = (relevanceScore * 0.7) + (learningValue / 10 * 0.3);
    if (combinedScore >= 0.8) return 'high';
    if (combinedScore >= 0.6) return 'medium';
    return 'low';
  }

  private async updateSkillAssessment(
    profile: UserLearningProfile,
    skillArea: string,
    difficultyLevel?: DifficultyLevel
  ): Promise<void> {
    if (!profile.skills[skillArea]) {
      profile.skills[skillArea] = {
        level: 'beginner',
        experience: 0,
        confidence: 50,
        validated: false,
        lastAssessed: new Date(),
        assessmentHistory: [],
      };
    }
    
    const skill = profile.skills[skillArea];
    
    // Increment experience based on difficulty
    const experienceGain = difficultyLevel ? this.getExperienceGain(difficultyLevel) : 10;
    skill.experience += experienceGain;
    
    // Level up if experience threshold reached
    if (skill.experience >= 1000 && skill.level !== 'master') {
      skill.level = this.getNextSkillLevel(skill.level);
      skill.experience = skill.experience - 1000; // Carry over extra experience
    }
    
    skill.lastAssessed = new Date();
    
    // Record assessment history
    skill.assessmentHistory.push({
      date: new Date(),
      level: skill.level,
      experience: skill.experience,
      source: 'algorithm',
    });
    
    // Keep only last 10 assessments
    skill.assessmentHistory = skill.assessmentHistory.slice(-10);
  }

  private async updateLearningStreaks(
    profile: UserLearningProfile,
    activityType: string
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    if (!profile.streaks[activityType]) {
      profile.streaks[activityType] = { current: 0, longest: 0, lastActivity: new Date() };
    }
    
    const streak = profile.streaks[activityType];
    const lastActivityDate = streak.lastActivity.toISOString().slice(0, 10);
    
    if (lastActivityDate === today) {
      // Already counted today, no change
      return;
    } else if (lastActivityDate === yesterday) {
      // Continue streak
      streak.current += 1;
      streak.longest = Math.max(streak.longest, streak.current);
    } else {
      // Streak broken, restart
      streak.current = 1;
    }
    
    streak.lastActivity = new Date();
  }

  private async checkAndAwardAchievements(
    userId: string,
    profile: UserLearningProfile,
    activityType: string,
    metadata: any
  ): Promise<void> {
    // Get all active achievements user hasn't earned yet
    const userAchievements = await this.userAchievementRepo
      .createQueryBuilder('ua')
      .select('ua.achievementId')
      .where('ua.userId = :userId', { userId })
      .getRawMany();
    
    const earnedAchievementIds = userAchievements.map(ua => ua.achievementId);
    
    const availableAchievements = await this.achievementRepo
      .createQueryBuilder('a')
      .where('a.isActive = true')
      .andWhere('a.id NOT IN (:...earned)', { earned: earnedAchievementIds.length > 0 ? earnedAchievementIds : [''] })
      .getMany();
    
    // Check each achievement criteria
    for (const achievement of availableAchievements) {
      if (await this.checkAchievementCriteria(achievement, profile, activityType, metadata)) {
        await this.awardAchievement(userId, achievement.id, activityType, metadata);
      }
    }
  }

  private async checkAchievementCriteria(
    achievement: Achievement,
    profile: UserLearningProfile,
    activityType: string,
    metadata: any
  ): Promise<boolean> {
    const criteria = achievement.criteria;
    
    switch (criteria.type) {
      case 'learning_streak':
        return Object.values(profile.streaks).some(s => s.current >= criteria.threshold);
      
      case 'content_consumed':
        return profile.metrics.totalContentConsumed >= criteria.threshold;
      
      case 'skill_level':
        return Object.values(profile.skills).some(s => 
          criteria.skillArea ? 
          (s.level === 'expert' && profile.skills[criteria.skillArea]?.level === 'expert') :
          s.level === 'expert'
        );
      
      default:
        return false;
    }
  }

  private async awardAchievement(
    userId: string,
    achievementId: string,
    trigger: string,
    metadata: any
  ): Promise<void> {
    const userAchievement = this.userAchievementRepo.create({
      userId,
      achievementId,
      earnedAt: new Date(),
      earnedData: {
        trigger,
        metrics: metadata,
      },
    });
    
    await this.userAchievementRepo.save(userAchievement);
    
    this.logger.log(`🏆 User ${userId} earned achievement ${achievementId}`);
  }

  private async generateLearningRecommendations(profile: UserLearningProfile): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Based on learning metrics
    if (profile.metrics.completionRate < 0.6) {
      recommendations.push('Focus on completing started content to improve retention');
    }
    
    if (profile.metrics.applicationRate < 0.3) {
      recommendations.push('Try applying more insights to real situations');
    }
    
    // Based on goals
    if (profile.goals?.shortTerm?.length === 0) {
      recommendations.push('Set specific short-term learning goals to stay motivated');
    }
    
    // Based on streaks
    const maxStreak = Math.max(...Object.values(profile.streaks).map(s => s.current), 0);
    if (maxStreak < 7) {
      recommendations.push('Build a consistent daily learning habit');
    }
    
    return recommendations.slice(0, 3);
  }

  private async generateMotivationalMessage(
    profile: UserLearningProfile,
    progressScore: number
  ): Promise<string> {
    const messages = [
      `You're making excellent progress! Your learning score of ${progressScore} shows real growth.`,
      `Keep up the momentum! You've consumed ${profile.metrics.totalContentConsumed} pieces of content.`,
      `Your dedication is paying off. You're building valuable expertise every day.`,
      `Great job staying curious and committed to learning. You're on the right path!`,
    ];
    
    const maxStreak = Math.max(...Object.values(profile.streaks).map(s => s.current), 0);
    if (maxStreak >= 7) {
      messages.push(`Incredible ${maxStreak}-day learning streak! You're building an amazing habit.`);
    }
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private updateRunningAverage(current: number, newValue: number, count: number): number {
    return ((current * (count - 1)) + newValue) / count;
  }

  private skillLevelToNumber(level: SkillLevel): number {
    const map = { beginner: 1, intermediate: 2, advanced: 3, expert: 4, master: 5 };
    return map[level] || 1;
  }

  private numberToSkillLevel(num: number): SkillLevel {
    const map = ['', 'beginner', 'intermediate', 'advanced', 'expert', 'master'];
    return (map[Math.max(1, Math.min(5, Math.round(num)))] as SkillLevel) || 'beginner';
  }

  private numberToDifficultyLevel(num: number): DifficultyLevel {
    const map = ['', 'beginner', 'intermediate', 'advanced', 'expert'];
    return (map[Math.max(1, Math.min(4, Math.round(num)))] as DifficultyLevel) || 'beginner';
  }

  private getExperienceGain(difficulty: DifficultyLevel): number {
    const map = { beginner: 5, intermediate: 10, advanced: 20, expert: 30 };
    return map[difficulty] || 10;
  }

  private getNextSkillLevel(current: SkillLevel): SkillLevel {
    const progression: Record<SkillLevel, SkillLevel> = { 
      beginner: 'intermediate', 
      intermediate: 'advanced', 
      advanced: 'expert', 
      expert: 'master',
      master: 'master'
    };
    return progression[current] || current;
  }

  private estimateTimeToNextLevel(skill: SkillAssessment): string {
    const experienceNeeded = 1000 - skill.experience;
    const avgGainPerDay = 15; // estimated based on typical activity
    const daysNeeded = Math.ceil(experienceNeeded / avgGainPerDay);
    
    if (skill.level === 'master') return 'Mastered';
    if (daysNeeded <= 30) return `${daysNeeded} days`;
    if (daysNeeded <= 90) return `${Math.ceil(daysNeeded / 7)} weeks`;
    return `${Math.ceil(daysNeeded / 30)} months`;
  }

  private async clearUserRecommendationCache(userId: string): Promise<void> {
    // Clear all recommendation caches for this user
    const pattern = `learning:recommendations:${userId}:*`;
    await this.cache.del(pattern);
  }
}