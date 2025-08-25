import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';

@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createBook(@Body(ValidationPipe) createBookDto: CreateBookDto) {
    return this.booksService.createBook(createBookDto);
  }

  @Get('search')
  async searchBooks(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.booksService.searchBooks(query, limit, offset);
  }

  @Get('popular')
  async getPopularBooks(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return this.booksService.getPopularBooks(limit);
  }

  @Get('category/:category')
  async getBooksByCategory(
    @Param('category') category: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.booksService.getBooksByCategory(category, limit, offset);
  }

  @Get(':id')
  async getBook(@Param('id') id: string) {
    return this.booksService.getBookById(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteBook(@Param('id') id: string) {
    return this.booksService.deleteBook(id);
  }
}