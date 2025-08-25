import { Controller, Post, Body, UseGuards, Get, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`🚀 POST /auth/login endpoint hit`);
    this.logger.log(`📦 Request body keys: [${Object.keys(loginDto).join(', ')}]`);
    this.logger.log(`📧 Email in request: "${loginDto?.email}"`);
    
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`✅ Controller: Login successful, returning token and user data`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Controller: Login failed with error: ${error.message}`);
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    return req.user;
  }
}