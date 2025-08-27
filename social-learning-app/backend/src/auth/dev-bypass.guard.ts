import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DevBypassAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'development') {
      // Attach a mock user so downstream handlers can read req.user.id
      const req = context.switchToHttp().getRequest();
      if (!req.user) {
        req.user = { id: 'dev-user-123', username: 'DevUser', email: 'dev@example.com' };
      }
      return true;
    }
    return super.canActivate(context) as any;
  }
}
