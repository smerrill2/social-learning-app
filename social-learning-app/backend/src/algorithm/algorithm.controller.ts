import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlgorithmService } from './algorithm.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('algorithm')
export class AlgorithmController {
  constructor(
    private algorithmService: AlgorithmService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('feed')
  @UseGuards(AuthGuard('jwt'))
  async getPersonalizedFeed(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.algorithmService.generatePersonalizedFeed(req.user.id, limit, offset);
  }

  @Post('preferences')
  @UseGuards(AuthGuard('jwt'))
  async updateAlgorithmPreferences(
    @Request() req,
    @Body() preferences: any,
  ) {
    await this.userRepository.update(req.user.id, {
      algorithmPreferences: preferences,
    });

    return { 
      message: 'Algorithm preferences updated successfully',
      preferences,
    };
  }

  @Get('preferences')
  @UseGuards(AuthGuard('jwt'))
  async getAlgorithmPreferences(@Request() req) {
    const user = await this.userRepository.findOne({ 
      where: { id: req.user.id },
      select: ['algorithmPreferences'],
    });

    return {
      preferences: user?.algorithmPreferences || this.getDefaultPreferences(),
    };
  }

  @Get('insights')
  @UseGuards(AuthGuard('jwt'))
  async getFeedInsights(@Request() req) {
    const user = await this.userRepository.findOne({ 
      where: { id: req.user.id },
      select: ['algorithmPreferences'],
    });

    const preferences = user?.algorithmPreferences;
    if (!preferences) {
      return {
        insights: {
          totalContentTypes: 3,
          researchCategoriesEnabled: 0,
          feedBehaviorScore: 0.5,
        },
      };
    }

    // Analyze user's algorithm settings to provide insights
    const researchCategoriesEnabled = Object.values(preferences.researchCategories || {})
      .filter(weight => (weight as number) > 50).length;

    const totalContentWeight = Object.values(preferences.contentTypes || {})
      .reduce((sum, weight) => sum + (weight as number), 0);

    const feedBehaviorScore = (
      (preferences.feedBehavior?.recencyWeight || 50) +
      (preferences.feedBehavior?.popularityWeight || 50) +
      (preferences.feedBehavior?.diversityBoost || 50)
    ) / 300;

    return {
      insights: {
        totalContentTypes: Object.keys(preferences.contentTypes || {}).length,
        researchCategoriesEnabled,
        feedBehaviorScore,
        totalContentWeight,
        isPersonalized: researchCategoriesEnabled > 0 || totalContentWeight !== 200, // 4 types * 50% default
      },
    };
  }

  private getDefaultPreferences() {
    return {
      contentTypes: {
        researchPapers: 25,
        hackernews: 35, 
        insights: 40,
        discussions: 0,
      },
      researchCategories: {
        psychology: 50,
        behavioralScience: 50,
        healthSciences: 30,
        neuroscience: 40,
        cognitiveScience: 45,
        artificialIntelligence: 60,
        computerScience: 40,
        socialSciences: 30,
        economics: 20,
        philosophy: 20,
      },
      feedBehavior: {
        recencyWeight: 60,
        popularityWeight: 40,
        diversityImportance: 70,
        explorationVsExploitation: 30,
        socialSignalsWeight: 50,
      },
      sourcePreferences: {
        arxiv: 80,
        hackernews: 70,
        pubmed: 60,
        researchgate: 40,
        personalInsights: 90,
      },
      contentFilters: {
        minReadingTime: 2,
        maxReadingTime: 30,
        languagePreference: 'en',
        contentQualityThreshold: 60,
      },
    };
  }
}