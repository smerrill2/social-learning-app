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
import { InteractionsService } from './interactions.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import type { InteractionType } from '../entities/interaction.entity';

@Controller('interactions')
@UseGuards(AuthGuard('jwt'))
export class InteractionsController {
  constructor(private interactionsService: InteractionsService) {}

  @Post()
  async createInteraction(
    @Body(ValidationPipe) createInteractionDto: CreateInteractionDto,
    @Request() req,
  ) {
    return this.interactionsService.createInteraction(createInteractionDto, req.user.id);
  }

  @Delete(':id')
  async removeInteraction(@Param('id') id: string, @Request() req) {
    return this.interactionsService.removeInteraction(id, req.user.id);
  }

  @Get('user')
  async getUserInteractions(
    @Query('type') type: InteractionType,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('offset', new ParseIntPipe({ optional: true })) offset: number = 0,
    @Request() req,
  ) {
    return this.interactionsService.getUserInteractions(req.user.id, type, limit, offset);
  }

  @Get('insight/:insightId')
  async getInsightInteractions(
    @Param('insightId') insightId: string,
    @Query('type') type: InteractionType,
  ) {
    return this.interactionsService.getInsightInteractions(insightId, type);
  }

  @Get('status/:insightId')
  async getUserInteractionStatus(
    @Param('insightId') insightId: string,
    @Request() req,
  ) {
    return this.interactionsService.getUserInteractionStatus(req.user.id, insightId);
  }
}