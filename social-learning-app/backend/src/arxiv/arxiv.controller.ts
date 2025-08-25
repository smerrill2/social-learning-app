import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArxivService } from './arxiv.service';

@Controller('arxiv')
export class ArxivController {
  constructor(private arxivService: ArxivService) {}

  @Get('papers')
  @UseGuards(AuthGuard('jwt'))
  async searchPapers(
    @Request() req,
    @Query('categories') categories?: string,
    @Query('query') query?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    const categoryList = categories ? categories.split(',') : [];
    return this.arxivService.searchPapers(categoryList, query, limit, offset);
  }

  @Get('sync')
  @UseGuards(AuthGuard('jwt'))
  async syncPapers() {
    await this.arxivService.syncBehavioralSciencePapers();
    return { message: 'Papers sync started' };
  }
}