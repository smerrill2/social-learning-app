import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InsightsService } from './insights.service';
import { CreateInsightDto } from './dto/create-insight.dto';

@Controller('insights')
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createInsight(
    @Body(ValidationPipe) createInsightDto: CreateInsightDto,
    @Request() req,
  ) {
    return this.insightsService.createInsight(createInsightDto, req.user.id);
  }

  @Get('feed')
  @UseGuards(AuthGuard('jwt'))
  async getFeed(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    @Request() req,
  ) {
    return this.insightsService.getFeed(req.user.id, limit, offset);
  }

  @Get('book/:bookId')
  async getInsightsByBook(
    @Param('bookId') bookId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
  ) {
    return this.insightsService.getInsightsByBook(bookId, limit, offset);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getInsight(@Param('id') id: string, @Request() req) {
    return this.insightsService.getInsightById(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteInsight(@Param('id') id: string, @Request() req) {
    return this.insightsService.deleteInsight(id, req.user.id);
  }
}