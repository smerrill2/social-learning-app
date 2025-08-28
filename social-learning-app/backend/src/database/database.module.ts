import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Book } from '../entities/book.entity';
import { Insight } from '../entities/insight.entity';
import { Interaction } from '../entities/interaction.entity';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { UserLearningProfile } from '../entities/user-learning-profile.entity';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { ContentDifficultyAssessment } from '../entities/content-difficulty.entity';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'social_learning'),
        entities: [
          User, 
          Book, 
          Insight, 
          Interaction, 
          HackerNewsStory, 
          ResearchPaper,
          UserLearningProfile,
          Achievement,
          UserAchievement,
          ContentDifficultyAssessment,
          LearningPath,
          UserLearningPathEnrollment,
          SkillChallenge,
          ChallengeAttempt,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([
      User, 
      Book, 
      Insight, 
      Interaction, 
      HackerNewsStory, 
      ResearchPaper,
      UserLearningProfile,
      Achievement,
      UserAchievement,
      ContentDifficultyAssessment,
      LearningPath,
      UserLearningPathEnrollment,
      SkillChallenge,
      ChallengeAttempt,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}