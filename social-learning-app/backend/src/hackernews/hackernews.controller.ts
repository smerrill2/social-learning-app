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

  @Get('force-refresh')
  async forceRefresh() {
    try {
      console.log('🔄 Force refresh initiated...');
      
      // Clear all caches
      await (this.hackerNewsService as any).clearStoryCaches();
      
      // Sync latest stories 
      await this.hackerNewsService.syncTopStories();
      
      // Force retry of failed summaries
      await (this.hackerNewsService as any).summarizeMissingSummariesBatch(10);
      
      return { message: 'Force refresh completed successfully' };
    } catch (error) {
      return { message: 'Force refresh failed', error: error.message };
    }
  }

  @Get('test-summarize')
  async testSummarize() {
    try {
      console.log('🔍 Testing batch summarization...');
      await this.hackerNewsService.summarizeMissingSummariesBatch(5);
      return { message: 'Batch summarization completed' };
    } catch (error) {
      console.error('❌ Batch summarization error:', error);
      return { message: 'Batch summarization failed', error: error.message };
    }
  }

  @Get('clear-cache')
  async clearCache() {
    try {
      // Use the private method via any cast for debugging
      await (this.hackerNewsService as any).clearStoryCaches();
      return { message: 'Cache cleared successfully' };
    } catch (error) {
      return { message: 'Cache clear failed', error: error.message };
    }
  }

  @Get('test-single-summary')
  async testSingleSummary() {
    try {
      console.log('🔍 Testing single summary generation...');
      const result = await (this.hackerNewsService as any).generateUrlSummary(
        'https://news.ycombinator.com', 
        'Test Title'
      );
      return { message: 'Single summary completed', summary: result };
    } catch (error) {
      console.error('❌ Single summary error:', error);
      return { message: 'Single summary failed', error: error.message, stack: error.stack };
    }
  }

  @Get('clear-summaries')
  async clearSummaries() {
    try {
      const repository = (this.hackerNewsService as any).storyRepository;
      await repository
        .createQueryBuilder()
        .update()
        .set({ summary: null, summaryUpdatedAt: null })
        .where('summary IS NOT NULL')
        .execute();
      await (this.hackerNewsService as any).clearStoryCaches();
      return { message: 'All summaries cleared successfully' };
    } catch (error) {
      return { message: 'Failed to clear summaries', error: error.message };
    }
  }

  @Get('summary-stats')
  async getSummaryStats() {
    try {
      const repository = (this.hackerNewsService as any).storyRepository;
      const timeThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const total = await repository
        .createQueryBuilder('story')
        .where('story.time >= :timeThreshold', { timeThreshold })
        .getCount();
      
      const withUrls = await repository
        .createQueryBuilder('story')
        .where('story.time >= :timeThreshold', { timeThreshold })
        .andWhere('story.url IS NOT NULL')
        .getCount();
      
      const withSummaries = await repository
        .createQueryBuilder('story')
        .where('story.time >= :timeThreshold', { timeThreshold })
        .andWhere('story.summary IS NOT NULL')
        .getCount();
      
      const nullSummaries = await repository
        .createQueryBuilder('story')
        .where('story.time >= :timeThreshold', { timeThreshold })
        .andWhere('story.url IS NOT NULL')
        .andWhere('story.summary IS NULL')
        .getCount();

      const nullSummaryStories = await repository
        .createQueryBuilder('story')  
        .select(['story.id', 'story.title', 'story.url', 'story.score'])
        .where('story.time >= :timeThreshold', { timeThreshold })
        .andWhere('story.url IS NOT NULL')
        .andWhere('story.summary IS NULL')
        .orderBy('story.score', 'DESC')
        .limit(10)
        .getMany();

      return {
        stats: {
          total,
          withUrls,
          withSummaries,
          nullSummaries,
          summaryRate: withUrls > 0 ? (withSummaries / withUrls * 100).toFixed(1) + '%' : '0%'
        },
        topMissingSummaries: nullSummaryStories
      };
    } catch (error) {
      return { message: 'Failed to get summary stats', error: error.message };
    }
  }

  @Get('retry-failed-summaries')
  async retryFailedSummaries() {
    try {
      console.log('🔄 Retrying failed summaries...');
      await (this.hackerNewsService as any).summarizeMissingSummariesBatch(5);
      return { message: 'Retry completed' };
    } catch (error) {
      return { message: 'Retry failed', error: error.message };
    }
  }

  @Get('test-e2e-summary')
  async testEndToEndSummary() {
    try {
      console.log('🧪 Starting end-to-end summary test...');
      
      // Step 1: Create a test story with summary
      const testStoryId = 999999999; // Use a unique ID
      const testUrl = 'https://example.com';
      const testSummary = 'This is a test summary for end-to-end verification. It contains multiple sentences to simulate a real summary. The summary should appear in both the API response and the frontend feed component.';
      
      // Direct database insert for testing
      const repository = (this.hackerNewsService as any).storyRepository;
      
      // Remove existing test story if it exists
      await repository.delete({ id: testStoryId });
      
      // Create test story with summary
      const testStory = repository.create({
        id: testStoryId,
        title: 'E2E Test Story - URL Summarization',
        url: testUrl,
        by: 'test-user',
        score: 9999,
        descendants: 0,
        time: new Date(),
        kids: [],
        type: 'story',
        fetchedAt: new Date(),
        summary: testSummary,
        summaryUpdatedAt: new Date(),
      });
      
      await repository.save(testStory);
      console.log('✅ Test story created with summary');
      
      // Step 2: Clear cache to ensure fresh data
      await (this.hackerNewsService as any).clearStoryCaches();
      console.log('✅ Cache cleared');
      
      // Step 3: Verify story appears in API response with summary
      const apiResponse = await this.hackerNewsService.getTopStories(50, 0);
      const foundStory = apiResponse.stories.find(s => s.id === testStoryId);
      
      if (!foundStory) {
        console.log('❌ Test story not found. All story IDs:', apiResponse.stories.slice(0, 10).map(s => ({ id: s.id, score: s.score, title: s.title.substring(0, 30) + '...' })));
        console.log(`❌ Looking for story ID: ${testStoryId}`);
        throw new Error('Test story not found in API response');
      }
      
      if (!foundStory.summary) {
        throw new Error('Test story found but summary is missing from API response');
      }
      
      console.log('✅ Test story found in API with summary');
      
      return {
        success: true,
        message: 'End-to-end test completed successfully',
        testResults: {
          storyCreated: true,
          cacheCleared: true,
          foundInApi: true,
          summaryPresent: true,
          summaryContent: foundStory.summary.substring(0, 100) + '...',
        }
      };
      
    } catch (error) {
      console.error('❌ E2E test failed:', error);
      return { 
        success: false,
        message: 'End-to-end test failed', 
        error: error.message,
        stack: error.stack 
      };
    }
  }
}