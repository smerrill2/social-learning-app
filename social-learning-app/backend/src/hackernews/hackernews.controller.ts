import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { HackerNewsService } from './hackernews.service';

@Controller('hackernews')
export class HackerNewsController {
  constructor(private hackerNewsService: HackerNewsService) {}

  @Get('stories')
  async getTopStories(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.hackerNewsService.getTopStories(limit, offset);
  }

  @Get('sync')
  async syncStories() {
    await this.hackerNewsService.syncTopStories();
    return { message: 'Sync initiated' };
  }
}