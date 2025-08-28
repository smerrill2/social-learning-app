import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningAlgorithmService } from './learning-algorithm.service';
import { LearningController } from './learning.controller';
import { AchievementService } from './achievement.service';
import { ContentDifficultyService } from './content-difficulty.service';
import { LearningPathService } from './learning-path.service';
import { SkillChallengeService } from './skill-challenge.service';

// Entities
import { UserLearningProfile } from '../entities/user-learning-profile.entity';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { ContentDifficultyAssessment } from '../entities/content-difficulty.entity';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';
import { User } from '../entities/user.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { Insight } from '../entities/insight.entity';

// External modules
import { CacheModule } from '../cache/cache.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserLearningProfile,
      Achievement,
      UserAchievement,
      ContentDifficultyAssessment,
      LearningPath,
      UserLearningPathEnrollment,
      SkillChallenge,
      ChallengeAttempt,
      User,
      ResearchPaper,
      HackerNewsStory,
      Insight,
    ]),
    CacheModule,
    LlmModule,
  ],
  providers: [
    LearningAlgorithmService,
    AchievementService,
    ContentDifficultyService,
    LearningPathService,
    SkillChallengeService,
  ],
  controllers: [LearningController],
  exports: [
    LearningAlgorithmService,
    AchievementService,
    ContentDifficultyService,
    LearningPathService,
    SkillChallengeService,
  ],
})
export class LearningModule {}