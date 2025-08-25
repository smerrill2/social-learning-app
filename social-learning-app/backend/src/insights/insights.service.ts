import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight } from '../entities/insight.entity';
import { Book } from '../entities/book.entity';
import { User } from '../entities/user.entity';
import { Interaction } from '../entities/interaction.entity';
import { CacheService } from '../cache/cache.service';
import { CreateInsightDto } from './dto/create-insight.dto';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private insightRepository: Repository<Insight>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Interaction)
    private interactionRepository: Repository<Interaction>,
    private cacheService: CacheService,
  ) {}

  async createInsight(createInsightDto: CreateInsightDto, userId: string) {
    const { bookId, content, tags, pageReference, chapterReference } = createInsightDto;

    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const insight = this.insightRepository.create({
      content,
      bookId,
      authorId: userId,
      tags: tags || [],
      pageReference,
      chapterReference,
      engagement: {
        likeCount: 0,
        shareCount: 0,
        saveCount: 0,
        applyCount: 0,
        viewCount: 0,
        engagementRate: 0,
      },
    });

    const savedInsight = await this.insightRepository.save(insight);
    
    await this.cacheService.invalidateFeedCache(userId);

    return this.getInsightWithDetails(savedInsight.id);
  }

  async getInsightById(id: string, viewerId?: string) {
    const insight = await this.getInsightWithDetails(id);
    
    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    if (viewerId && viewerId !== insight.author.id) {
      await this.incrementViewCount(id);
    }

    return insight;
  }

  async getFeed(userId: string, limit: number = 20, offset: number = 0) {
    const cacheKey = `feed:${userId}:${limit}:${offset}`;
    const cachedFeed = await this.cacheService.get(cacheKey);

    if (cachedFeed) {
      return cachedFeed;
    }

    const insights = await this.insightRepository
      .createQueryBuilder('insight')
      .leftJoinAndSelect('insight.author', 'author')
      .leftJoinAndSelect('insight.book', 'book')
      .select([
        'insight.id',
        'insight.content',
        'insight.tags',
        'insight.engagement',
        'insight.pageReference',
        'insight.chapterReference',
        'insight.createdAt',
        'author.id',
        'author.username',
        'author.profile',
        'book.id',
        'book.title',
        'book.author',
        'book.coverImageUrl',
      ])
      .orderBy('insight.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    const feedData = {
      insights,
      pagination: {
        limit,
        offset,
        hasMore: insights.length === limit,
      },
    };

    await this.cacheService.set(cacheKey, feedData, 300);

    return feedData;
  }

  async getInsightsByBook(bookId: string, limit: number = 20, offset: number = 0) {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const insights = await this.insightRepository
      .createQueryBuilder('insight')
      .leftJoinAndSelect('insight.author', 'author')
      .leftJoinAndSelect('insight.book', 'book')
      .where('insight.bookId = :bookId', { bookId })
      .select([
        'insight.id',
        'insight.content',
        'insight.tags',
        'insight.engagement',
        'insight.pageReference',
        'insight.chapterReference',
        'insight.createdAt',
        'author.id',
        'author.username',
        'author.profile',
        'book.id',
        'book.title',
        'book.author',
        'book.coverImageUrl',
      ])
      .orderBy('insight.engagement.likeCount', 'DESC')
      .addOrderBy('insight.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return {
      book,
      insights,
      pagination: {
        limit,
        offset,
        hasMore: insights.length === limit,
      },
    };
  }

  async deleteInsight(id: string, userId: string) {
    const insight = await this.insightRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    if (insight.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own insights');
    }

    await this.interactionRepository.delete({ insightId: id });
    await this.insightRepository.remove(insight);
    
    await this.cacheService.invalidateFeedCache(userId);

    return { message: 'Insight deleted successfully' };
  }

  private async getInsightWithDetails(id: string) {
    return this.insightRepository
      .createQueryBuilder('insight')
      .leftJoinAndSelect('insight.author', 'author')
      .leftJoinAndSelect('insight.book', 'book')
      .where('insight.id = :id', { id })
      .select([
        'insight.id',
        'insight.content',
        'insight.tags',
        'insight.engagement',
        'insight.pageReference',
        'insight.chapterReference',
        'insight.createdAt',
        'insight.updatedAt',
        'author.id',
        'author.username',
        'author.profile',
        'book.id',
        'book.title',
        'book.author',
        'book.coverImageUrl',
      ])
      .getOne();
  }

  private async incrementViewCount(insightId: string) {
    await this.insightRepository
      .createQueryBuilder()
      .update(Insight)
      .set({
        engagement: () => `jsonb_set(engagement, '{viewCount}', (COALESCE(engagement->>'viewCount', '0')::int + 1)::text::jsonb)`
      })
      .where('id = :id', { id: insightId })
      .execute();
  }
}