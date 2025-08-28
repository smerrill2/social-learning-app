import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath, UserLearningPathEnrollment } from '../entities/learning-path.entity';

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(LearningPath)
    private pathRepo: Repository<LearningPath>,
    @InjectRepository(UserLearningPathEnrollment)
    private enrollmentRepo: Repository<UserLearningPathEnrollment>,
  ) {}

  async getActivePaths(skillArea?: string, difficulty?: string) {
    const qb = this.pathRepo
      .createQueryBuilder('path')
      .where('path.isActive = true');
    
    if (skillArea) {
      qb.andWhere('path.skillArea = :skillArea', { skillArea });
    }
    
    if (difficulty) {
      qb.andWhere('path.targetLevel = :difficulty', { difficulty });
    }
    
    return qb.getMany();
  }

  async enrollUser(userId: string, pathId: string) {
    const enrollment = this.enrollmentRepo.create({
      userId,
      pathId,
      enrolledAt: new Date(),
      completedSteps: [],
    });
    
    return this.enrollmentRepo.save(enrollment);
  }
}