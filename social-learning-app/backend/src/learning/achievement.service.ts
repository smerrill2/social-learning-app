import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement, UserAchievement } from '../entities/achievement.entity';
import { UserLearningProfile } from '../entities/user-learning-profile.entity';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(UserLearningProfile)
    private profileRepo: Repository<UserLearningProfile>,
  ) {}

  async getUserAchievements(userId: string) {
    return this.userAchievementRepo.find({
      where: { userId },
      relations: ['achievement'],
      order: { earnedAt: 'DESC' }
    });
  }

  async getSkillLeaderboard(skillArea: string, limit: number = 10) {
    return this.profileRepo
      .createQueryBuilder('profile')
      .select(['profile.userId', 'profile.skills'])
      .where('profile.skills->:skill IS NOT NULL', { skill: skillArea })
      .orderBy(`(profile.skills->>'${skillArea}')::jsonb->>'experience'`, 'DESC')
      .limit(limit)
      .getMany();
  }
}