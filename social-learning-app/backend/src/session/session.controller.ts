import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevBypassAuthGuard } from '../auth/dev-bypass.guard';
import { SessionService } from './session.service';

@Controller('session')
@UseGuards(DevBypassAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('pack')
  async getPack(@Request() req, @Query('topic') topic?: string) {
    return this.sessionService.getDailyPack(req.user.id, topic);
  }
}
