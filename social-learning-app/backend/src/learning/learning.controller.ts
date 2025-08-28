import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LearningAlgorithmService, PersonalizedLearningRecommendation, LearningProgressInsight } from './learning-algorithm.service';
import { AchievementService } from './achievement.service';
import { LearningPathService } from './learning-path.service';
import { SkillChallengeService } from './skill-challenge.service';

@Controller('learning')
export class LearningController {
  constructor(
    private learningAlgorithm: LearningAlgorithmService,
    private achievementService: AchievementService,
    private learningPathService: LearningPathService,
    private skillChallengeService: SkillChallengeService,
  ) {}

  @Get('recommendations/:userId')
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('skillArea') skillArea?: string,
    @Query('limit') limit: number = 10,
  ): Promise<PersonalizedLearningRecommendation[]> {
    return this.learningAlgorithm.getPersonalizedRecommendations(userId, skillArea, limit);
  }

  @Post('track-activity/:userId')
  async trackActivity(
    @Param('userId') userId: string,
    @Body() activity: {
      type: 'content_consumed' | 'challenge_completed' | 'insight_applied' | 'peer_helped';
      metadata: Record<string, any>;
    }
  ): Promise<{ success: boolean }> {
    await this.learningAlgorithm.trackLearningActivity(userId, activity.type, activity.metadata);
    return { success: true };
  }

  @Get('progress/:userId')
  async getProgressInsights(@Param('userId') userId: string): Promise<LearningProgressInsight> {
    return this.learningAlgorithm.getLearningProgressInsights(userId);
  }

  @Get('achievements/:userId')
  async getUserAchievements(@Param('userId') userId: string) {
    return this.achievementService.getUserAchievements(userId);
  }

  @Get('learning-paths')
  async getLearningPaths(
    @Query('skillArea') skillArea?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.learningPathService.getActivePaths(skillArea, difficulty as any);
  }

  @Post('learning-paths/:pathId/enroll/:userId')
  async enrollInPath(
    @Param('pathId') pathId: string,
    @Param('userId') userId: string,
  ) {
    return this.learningPathService.enrollUser(userId, pathId);
  }

  @Get('challenges')
  async getChallenges(
    @Query('skillArea') skillArea?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return this.skillChallengeService.getActiveChallenges(skillArea, difficulty as any);
  }

  @Post('challenges/:challengeId/attempt/:userId')
  async startChallenge(
    @Param('challengeId') challengeId: string,
    @Param('userId') userId: string,
  ) {
    return this.skillChallengeService.startAttempt(userId, challengeId);
  }

  @Put('challenges/attempts/:attemptId/submit')
  async submitChallenge(
    @Param('attemptId') attemptId: string,
    @Body() submission: { answers: Record<string, any> }
  ) {
    return this.skillChallengeService.submitAttempt(attemptId, submission.answers);
  }

  @Get('leaderboard/:skillArea')
  async getLeaderboard(
    @Param('skillArea') skillArea: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.achievementService.getSkillLeaderboard(skillArea, limit);
  }
}