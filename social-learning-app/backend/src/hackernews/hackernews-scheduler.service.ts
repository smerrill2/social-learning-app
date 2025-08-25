import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HackerNewsService } from './hackernews.service';

@Injectable()
export class HackerNewsSchedulerService {
  private readonly logger = new Logger(HackerNewsSchedulerService.name);

  constructor(private readonly hackerNewsService: HackerNewsService) {}

  @Cron('0 */15 * * * *') // Every 15 minutes
  async syncTopStories() {
    this.logger.log('Starting scheduled HackerNews sync...');
    try {
      await this.hackerNewsService.syncTopStories();
      this.logger.log('Scheduled HackerNews sync completed successfully');
    } catch (error) {
      this.logger.error('Scheduled HackerNews sync failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR) // Every hour
  async syncNewStories() {
    this.logger.log('Starting hourly HackerNews sync...');
    try {
      await this.hackerNewsService.syncTopStories();
      this.logger.log('Hourly HackerNews sync completed successfully');
    } catch (error) {
      this.logger.error('Hourly HackerNews sync failed:', error);
    }
  }
}