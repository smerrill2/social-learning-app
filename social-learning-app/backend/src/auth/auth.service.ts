import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { username, email, password } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = this.userRepository.create({
      username,
      email,
      passwordHash,
      profile: {
        preferences: {
          topics: [],
          notificationSettings: {
            push: true,
            email: true,
            social: true,
          },
        },
      },
      settings: {
        theme: 'auto',
        language: 'en',
        privacy: {
          profileVisible: true,
          insightsVisible: true,
        },
      },
    });

    const user = await this.userRepository.save(newUser);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token: this.generateJwtToken(user.id, user.username),
    };
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`🔑 Login attempt for email: ${loginDto.email}`);
    
    const { email, password } = loginDto;
    
    // Log the incoming request data (without password)
    this.logger.log(`📧 Email received: "${email}"`);
    this.logger.log(`🔐 Password length: ${password?.length || 0} characters`);
    
    try {
      // Check if user exists
      this.logger.log(`🔍 Looking up user in database...`);
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`❌ No user found with email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`✅ User found: ${user.username} (ID: ${user.id})`);

      // Verify password
      this.logger.log(`🔐 Verifying password...`);
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        this.logger.warn(`❌ Invalid password for user: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`✅ Password verified successfully`);

      // Update last active
      this.logger.log(`📅 Updating last active timestamp...`);
      await this.userRepository.update(user.id, {
        lastActive: new Date(),
      });

      const { passwordHash: _, ...userWithoutPassword } = user;

      // Generate token
      this.logger.log(`🎫 Generating JWT token...`);
      const token = this.generateJwtToken(user.id, user.username);

      this.logger.log(`🎉 Login successful for user: ${user.username}`);
      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      this.logger.error(`💥 Login failed for email: ${email}`, error.stack);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'email', 'profile', 'settings', 'createdAt', 'lastActive'],
    });
  }

  private generateJwtToken(userId: string, username: string): string {
    const payload = {
      sub: userId,
      username,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload);
  }
}