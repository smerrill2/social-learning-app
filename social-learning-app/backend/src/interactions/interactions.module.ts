import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from '../entities/interaction.entity';
import { Insight } from '../entities/insight.entity';
import { User } from '../entities/user.entity';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interaction, Insight, User]),
    CacheModule,
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}