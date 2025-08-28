import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type ChallengeType = 'quiz' | 'practical' | 'peer_review' | 'creative' | 'analysis' | 'synthesis';
export type ChallengeStatus = 'draft' | 'active' | 'archived' | 'under_review';

export interface ChallengeQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'practical_task' | 'peer_evaluation';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer?: string | number; // for auto-graded questions
  rubric?: {
    criteria: string;
    levels: Array<{ score: number; description: string }>;
  }[]; // for peer/expert graded questions
  weight: number; // importance of this question (1-10)
}

export interface ChallengeSubmission {
  questionId: string;
  answer: string | number | string[];
  evidence?: string[]; // links to work, projects, etc.
  submittedAt: Date;
}

export interface PeerReview {
  reviewerId: string;
  scores: Record<string, number>; // criteria -> score
  feedback: string;
  reviewedAt: Date;
  isValidated: boolean; // whether the reviewer is qualified to review this skill
}

@Entity('skill_challenges')
export class SkillChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  description: string;

  @Column()
  skillArea: string; // skill this challenge validates

  @Column({ type: 'enum', enum: ['quiz', 'practical', 'peer_review', 'creative', 'analysis', 'synthesis'] })
  type: ChallengeType;

  @Column({ type: 'enum', enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @Column({ type: 'jsonb' })
  questions: ChallengeQuestion[];

  @Column({ type: 'int' })
  timeLimit: number; // minutes, 0 for no limit

  @Column('int')
  passingScore: number; // minimum score to pass

  @Column({ type: 'int', default: 0 })
  statusPointsAwarded: number; // points for completing this challenge

  // Challenge settings
  @Column({ default: true })
  allowMultipleAttempts: boolean;

  @Column({ default: false })
  requiresPeerReview: boolean;

  @Column({ type: 'int', default: 1 })
  minPeerReviewers: number; // if peer review required

  @Column({ type: 'enum', enum: ['draft', 'active', 'archived', 'under_review'], default: 'draft' })
  status: ChallengeStatus;

  // Creation and curation
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column({ type: 'int', default: 0 })
  completionCount: number;

  @Column({ type: 'float', default: 0 })
  averageScore: number;

  @Column({ type: 'float', default: 0 })
  averageTimeMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('challenge_attempts')
export class ChallengeAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => SkillChallenge)
  @JoinColumn({ name: 'challengeId' })
  challenge: SkillChallenge;

  @Column('uuid')
  challengeId: string;

  // Attempt data
  @Column({ type: 'jsonb' })
  submissions: ChallengeSubmission[];

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'float', nullable: true })
  score: number; // 0-10 overall score

  @Column({ default: false })
  passed: boolean;

  @Column({ type: 'int', nullable: true })
  timeSpentMinutes: number;

  // Peer review data (if applicable)
  @Column({ type: 'jsonb', default: () => "'[]'" })
  peerReviews: PeerReview[];

  @Column({ default: false })
  isReviewComplete: boolean;

  // Self reflection and learning
  @Column('text', { nullable: true })
  selfReflection: string; // what they learned, what was difficult, etc.

  @Column('simple-array', { nullable: true })
  areasForImprovement: string[]; // skills to work on based on this attempt

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}