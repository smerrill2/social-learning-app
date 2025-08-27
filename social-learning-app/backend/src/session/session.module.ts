import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { ContentController } from './content.controller';
import { HackerNewsStory } from '../entities/hackernews-story.entity';
import { ResearchPaper } from '../entities/research-paper.entity';
import { Insight } from '../entities/insight.entity';
import { CacheModule } from '../cache/cache.module';
import { LlmModule } from '../llm/llm.module';
import { DevBypassAuthGuard } from '../auth/dev-bypass.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([HackerNewsStory, ResearchPaper, Insight]),
    CacheModule,
    LlmModule,
  ],
  controllers: [SessionController, ContentController],
  providers: [SessionService, DevBypassAuthGuard],
  exports: [SessionService],
})
export class SessionModule {}
