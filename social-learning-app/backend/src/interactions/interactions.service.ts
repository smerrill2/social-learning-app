import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interaction, InteractionType } from '../entities/interaction.entity';
import { Insight } from '../entities/insight.entity';
import { User } from '../entities/user.entity';
import { CacheService } from '../cache/cache.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(Interaction)
    private interactionRepository: Repository<Interaction>,
    @InjectRepository(Insight)
    private insightRepository: Repository<Insight>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
  ) {}

  async createInteraction(createInteractionDto: CreateInteractionDto, userId: string) {
    const { type, insightId, metadata } = createInteractionDto;

    const insight = await this.insightRepository.findOne({ where: { id: insightId } });
    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    const existingInteraction = await this.interactionRepository.findOne({
      where: {
        userId,
        insightId,
        type,
      },
    });

    if (existingInteraction) {
      if (type === 'like') {
        await this.removeInteraction(existingInteraction.id, userId);
        return { action: 'unliked' };
      } else {
        throw new ConflictException(`You have already ${type}d this insight`);
      }
    }

    const interaction = this.interactionRepository.create({
      type,
      insightId,
      userId,
      metadata: {
        ...metadata,
        timestamp: new Date(),
      },
    });

    await this.interactionRepository.save(interaction);
    await this.updateInsightEngagementCount(insightId, type, 1);
    
    await this.cacheService.invalidateFeedCache(userId);

    return { action: `${type}d` };
  }

  async removeInteraction(interactionId: string, userId: string) {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId, userId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    await this.interactionRepository.remove(interaction);
    await this.updateInsightEngagementCount(interaction.insightId, interaction.type, -1);
    
    await this.cacheService.invalidateFeedCache(userId);

    return { message: 'Interaction removed successfully' };
  }

  async getUserInteractions(
    userId: string,
    type?: InteractionType,
    limit: number = 20,
    offset: number = 0,
  ) {
    const queryBuilder = this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.insight', 'insight')
      .leftJoinAndSelect('insight.book', 'book')
      .leftJoinAndSelect('insight.author', 'author')
      .where('interaction.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('interaction.type = :type', { type });
    }

    const interactions = await queryBuilder
      .orderBy('interaction.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return {
      interactions,
      pagination: {
        limit,
        offset,
        hasMore: interactions.length === limit,
      },
    };
  }

  async getInsightInteractions(insightId: string, type?: InteractionType) {
    const insight = await this.insightRepository.findOne({ where: { id: insightId } });
    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    const queryBuilder = this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.user', 'user')
      .where('interaction.insightId = :insightId', { insightId });

    if (type) {
      queryBuilder.andWhere('interaction.type = :type', { type });
    }

    const interactions = await queryBuilder
      .select([
        'interaction.id',
        'interaction.type',
        'interaction.createdAt',
        'user.id',
        'user.username',
        'user.profile',
      ])
      .orderBy('interaction.createdAt', 'DESC')
      .getMany();

    return interactions;
  }

  async getUserInteractionStatus(userId: string, insightId: string) {
    const interactions = await this.interactionRepository.find({
      where: {
        userId,
        insightId,
      },
      select: ['type'],
    });

    return interactions.reduce((acc, interaction) => {
      acc[interaction.type] = true;
      return acc;
    }, {} as Record<InteractionType, boolean>);
  }

  private async updateInsightEngagementCount(
    insightId: string,
    type: InteractionType,
    delta: number,
  ) {
    const fieldMap = {
      like: 'likeCount',
      share: 'shareCount',
      save: 'saveCount',
      apply: 'applyCount',
    };

    const field = fieldMap[type];
    
    await this.insightRepository
      .createQueryBuilder()
      .update(Insight)
      .set({
        engagement: () => `jsonb_set(engagement, '{${field}}', (COALESCE(engagement->>'${field}', '0')::int + ${delta})::text::jsonb)`
      })
      .where('id = :id', { id: insightId })
      .execute();

    await this.recalculateEngagementRate(insightId);
  }

  private async recalculateEngagementRate(insightId: string) {
    const insight = await this.insightRepository.findOne({
      where: { id: insightId },
      select: ['engagement'],
    });

    if (!insight) return;

    const { likeCount, shareCount, saveCount, applyCount, viewCount } = insight.engagement;
    const totalInteractions = likeCount + shareCount + saveCount + applyCount;
    const engagementRate = viewCount > 0 ? (totalInteractions / viewCount) * 100 : 0;

    await this.insightRepository
      .createQueryBuilder()
      .update(Insight)
      .set({
        engagement: () => `jsonb_set(engagement, '{engagementRate}', '${Math.round(engagementRate * 100) / 100}'::jsonb)`
      })
      .where('id = :id', { id: insightId })
      .execute();
  }
}