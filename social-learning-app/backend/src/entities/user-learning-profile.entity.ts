import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
export type LearningStreak = { current: number; longest: number; lastActivity: Date };

export interface SkillAssessment {
  level: SkillLevel;
  experience: number; // 0-1000 per level
  confidence: number; // 0-100 self-reported confidence
  validated: boolean; // whether skill has been peer-validated
  lastAssessed: Date;
  assessmentHistory: Array<{
    date: Date;
    level: SkillLevel;
    experience: number;
    source: 'self' | 'peer' | 'challenge' | 'algorithm';
  }>;
}

export interface LearningMetrics {
  totalContentConsumed: number;
  averageEngagementRate: number;
  preferredLearningTimes: string[]; // hour ranges like "09-12", "19-22"
  averageSessionDuration: number; // minutes
  completionRate: number; // percentage of started content that gets finished
  retentionScore: number; // 0-100 based on follow-up assessments
  applicationRate: number; // percentage of insights marked as "applied"
}

export interface LearningGoals {
  shortTerm: Array<{
    skill: string;
    targetLevel: SkillLevel;
    deadline?: Date;
    priority: 'high' | 'medium' | 'low';
    progress: number; // 0-100%
  }>;
  longTerm: Array<{
    skill: string;
    targetLevel: SkillLevel;
    deadline?: Date;
    milestones: string[];
    progress: number;
  }>;
  interests: string[]; // topics user wants to explore
}

@Entity('user_learning_profiles')
export class UserLearningProfile {
  @PrimaryColumn()
  userId: string;

  // Core skill assessments for different domains
  @Column({ type: 'jsonb', default: () => "'{}'" })
  skills: Record<string, SkillAssessment>; // key: skill name, value: assessment

  // Learning behavior and performance metrics
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metrics: LearningMetrics;

  // Current learning goals and aspirations
  @Column({ type: 'jsonb', default: () => "'{}'" })
  goals: LearningGoals;

  // Learning streaks and habits
  @Column({ type: 'jsonb', default: () => "'{}'" })
  streaks: Record<string, LearningStreak>; // key: activity type (reading, applying, etc.)

  // Current learning path and progress
  @Column({ nullable: true })
  currentLearningPathId: string;

  @Column({ type: 'jsonb', nullable: true })
  pathProgress: {
    completedSteps: string[];
    currentStep: string;
    estimatedCompletion: Date;
  };

  // Difficulty preference and adaptive parameters
  @Column({ type: 'int', default: 50 })
  difficultyPreference: number; // 0-100: comfort zone vs challenge zone

  @Column({ type: 'float', default: 0.7 })
  adaptiveLearningRate: number; // how quickly to adjust difficulty based on performance

  @Column({ type: 'timestamp', nullable: true })
  lastLearningActivity: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Note: userId is a string identifier (username), not a foreign key to User table
}