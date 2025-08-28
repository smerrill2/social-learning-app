import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillChallenge, ChallengeAttempt } from '../entities/skill-challenge.entity';

@Injectable()
export class SkillChallengeService {
  constructor(
    @InjectRepository(SkillChallenge)
    private challengeRepo: Repository<SkillChallenge>,
    @InjectRepository(ChallengeAttempt)
    private attemptRepo: Repository<ChallengeAttempt>,
  ) {}

  async getActiveChallenges(skillArea?: string, difficulty?: string) {
    const qb = this.challengeRepo
      .createQueryBuilder('challenge')
      .where('challenge.status = :status', { status: 'active' });
    
    if (skillArea) {
      qb.andWhere('challenge.skillArea = :skillArea', { skillArea });
    }
    
    if (difficulty) {
      qb.andWhere('challenge.difficultyLevel = :difficulty', { difficulty });
    }
    
    return qb.getMany();
  }

  async startAttempt(userId: string, challengeId: string) {
    const attempt = this.attemptRepo.create({
      userId,
      challengeId,
      startedAt: new Date(),
      submissions: [],
    });
    
    return this.attemptRepo.save(attempt);
  }

  async submitAttempt(attemptId: string, answers: Record<string, any>) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: ['challenge']
    });
    
    if (!attempt) throw new Error('Attempt not found');
    
    // Calculate score (simplified)
    const score = Math.random() * 10; // Placeholder scoring
    const passed = score >= attempt.challenge.passingScore;
    
    attempt.submittedAt = new Date();
    attempt.score = score;
    attempt.passed = passed;
    
    return this.attemptRepo.save(attempt);
  }
}