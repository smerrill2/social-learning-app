import { Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type AchievementCategory = 
  | 'learning_streak' 
  | 'skill_mastery' 
  | 'content_consumption' 
  | 'knowledge_sharing' 
  | 'peer_recognition' 
  | 'challenge_completion'
  | 'mentorship'
  | 'innovation';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementCriteria {
  type: string;
  threshold: number;
  timeframe?: string; // e.g., "30d", "1y", null for all-time
  skillArea?: string;
  additionalRequirements?: Record<string, any>;
}

@Entity('achievements')
export class Achievement {
  @PrimaryColumn()
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: ['learning_streak', 'skill_mastery', 'content_consumption', 'knowledge_sharing', 'peer_recognition', 'challenge_completion', 'mentorship', 'innovation'] })
  category: AchievementCategory;

  @Column({ type: 'enum', enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] })
  tier: AchievementTier;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ nullable: true })
  badgeUrl: string;

  // How to earn this achievement
  @Column({ type: 'jsonb' })
  criteria: AchievementCriteria;

  // Rewards for earning this achievement
  @Column({ type: 'int', default: 0 })
  statusPoints: number; // points toward overall status level

  @Column({ type: 'jsonb', nullable: true })
  rewards: {
    specialTitle?: string;
    profileBadge?: string;
    accessPerks?: string[]; // e.g., ["early_access", "exclusive_content"]
    mentorshipOpportunities?: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  rarityScore: number; // 0-100, how rare/prestigious this achievement is

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // username, not UUID

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @Column()
  achievementId: string;

  // When and how the achievement was earned
  @Column({ type: 'timestamp' })
  earnedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  earnedData: {
    trigger: string; // what action triggered earning this
    metrics?: Record<string, number>; // relevant metrics at time of earning
    evidence?: string[]; // links to content, peer validations, etc.
  };

  // Social aspects
  @Column({ default: true })
  isVisible: boolean; // user can choose to hide achievements

  @Column({ default: false })
  isPinned: boolean; // user can pin favorite achievements to profile

  @Column({ type: 'int', default: 0 })
  celebrationCount: number; // how many people congratulated them

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}