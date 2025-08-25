import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlgorithmService } from './algorithm.service';
import { AlgorithmController } from './algorithm.controller';
import { User } from '../entities/user.entity';
import { Insight } from '../entities/insight.entity';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Insight, HackerNewsStory, ResearchPaper]),
    CacheModule,
  ],
  providers: [AlgorithmService],
  controllers: [AlgorithmController],
  exports: [AlgorithmService],
})
export class AlgorithmModule {}