import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HackerNewsController } from './hackernews.controller';
import { HackerNewsService } from './hackernews.service';
import { HackerNewsSchedulerService } from './hackernews-scheduler.service';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HackerNewsStory]),
    CacheModule,
  ],
  controllers: [HackerNewsController],
  providers: [HackerNewsService, HackerNewsSchedulerService],
  exports: [HackerNewsService],
})
export class HackerNewsModule {}