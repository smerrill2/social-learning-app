import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insight } from '../entities/insight.entity';
import { Book } from '../entities/book.entity';
import { User } from '../entities/user.entity';
import { Interaction } from '../entities/interaction.entity';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insight, Book, User, Interaction]),
    CacheModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}