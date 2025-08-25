import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArxivController } from './arxiv.controller';
import { ArxivService } from './arxiv.service';
import { ResearchPaper } from '../entities/research-paper.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResearchPaper]),
    CacheModule,
  ],
  controllers: [ArxivController],
  providers: [ArxivService],
  exports: [ArxivService],
})
export class ArxivModule {}