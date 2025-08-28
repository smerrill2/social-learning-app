import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { InsightsModule } from './insights/insights.module';
import { InteractionsModule } from './interactions/interactions.module';
import { HackerNewsModule } from './hackernews/hackernews.module';
import { ArxivModule } from './arxiv/arxiv.module';
import { AlgorithmModule } from './algorithm/algorithm.module';
import { SessionModule } from './session/session.module';
import { LearningModule } from './learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env, .env.example',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    AuthModule,
    BooksModule,
    InsightsModule,
    InteractionsModule,
    HackerNewsModule,
    ArxivModule,
    AlgorithmModule,
    SessionModule,
    LearningModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
