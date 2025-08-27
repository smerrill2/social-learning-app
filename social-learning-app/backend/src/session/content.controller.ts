import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevBypassAuthGuard } from '../auth/dev-bypass.guard';
import { SessionService } from './session.service';

@Controller('content')
@UseGuards(DevBypassAuthGuard)
export class ContentController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('feedback')
  async recordFeedback(
    @Request() req,
    @Body() body: { itemId: string | number; source: 'hackernews' | 'research' | 'insight'; action: 'save' | 'more' | 'less' | 'skip' },
  ) {
    return this.sessionService.recordFeedback(req.user.id, body);
  }
}
