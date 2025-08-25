import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Book } from '../entities/book.entity';
import { CacheService } from '../cache/cache.service';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    private cacheService: CacheService,
  ) {}

  async createBook(createBookDto: CreateBookDto) {
    const { genre, publishedYear, pageCount, categories, ...bookData } = createBookDto;

    const book = this.bookRepository.create({
      ...bookData,
      metadata: {
        genre,
        publishedYear,
        pageCount,
        categories,
      },
    });

    return this.bookRepository.save(book);
  }

  async getBookById(id: string) {
    const cacheKey = `book:${id}`;
    const cachedBook = await this.cacheService.get(cacheKey);

    if (cachedBook) {
      return cachedBook;
    }

    const book = await this.bookRepository.findOne({ where: { id } });
    
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.cacheService.set(cacheKey, book, 3600); // Cache for 1 hour
    
    return book;
  }

  async searchBooks(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const books = await this.bookRepository.find({
      where: [
        { title: Like(`%${query}%`) },
        { author: Like(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      books,
      pagination: {
        limit,
        offset,
        hasMore: books.length === limit,
      },
    };
  }

  async getPopularBooks(limit: number = 20) {
    const cacheKey = `popular-books:${limit}`;
    const cachedBooks = await this.cacheService.get(cacheKey);

    if (cachedBooks) {
      return cachedBooks;
    }

    const books = await this.bookRepository
      .createQueryBuilder('book')
      .leftJoin('book.insights', 'insight')
      .select([
        'book.id',
        'book.title',
        'book.author',
        'book.coverImageUrl',
        'book.metadata',
      ])
      .addSelect('COUNT(insight.id)', 'insightCount')
      .groupBy('book.id')
      .orderBy('insightCount', 'DESC')
      .addOrderBy('book.createdAt', 'DESC')
      .limit(limit)
      .getRawAndEntities();

    const result = {
      books: books.entities.map((book, index) => ({
        ...book,
        insightCount: parseInt(books.raw[index].insightCount) || 0,
      })),
    };

    await this.cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes

    return result;
  }

  async getBooksByCategory(
    category: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    const books = await this.bookRepository
      .createQueryBuilder('book')
      .where("book.metadata->>'categories' @> :category", { 
        category: JSON.stringify([category]) 
      })
      .orderBy('book.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return {
      books,
      pagination: {
        limit,
        offset,
        hasMore: books.length === limit,
      },
    };
  }

  async deleteBook(id: string) {
    const book = await this.bookRepository.findOne({ where: { id } });
    
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.bookRepository.remove(book);
    await this.cacheService.del(`book:${id}`);

    return { message: 'Book deleted successfully' };
  }
}