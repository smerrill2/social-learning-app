import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  estimatedTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  contentIds: Array<{
    id: string;
    type: 'research' | 'hackernews' | 'insight' | 'challenge';
    isRequired: boolean;
  }>;
  completionCriteria: {
    readContent: boolean;
    passChallenge?: boolean;
    peerValidation?: boolean;
    practicalApplication?: boolean;
  };
  prerequisites: string[]; // IDs of steps that must be completed first
}

export interface PathMetrics {
  enrollmentCount: number;
  completionCount: number;
  averageCompletionTime: number; // days
  satisfactionRating: number; // 1-5 average
  dropoffPoints: string[]; // step IDs where people commonly quit
}

@Entity('learning_paths')
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  description: string;

  @Column()
  skillArea: string; // primary skill this path develops

  @Column('simple-array', { nullable: true })
  tags: string[]; // additional categorization

  // Path structure and content
  @Column({ type: 'jsonb' })
  steps: LearningStep[];

  @Column({ type: 'int' })
  estimatedDurationDays: number;

  @Column({ type: 'enum', enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @Column('simple-array', { nullable: true })
  prerequisites: string[]; // skills needed before starting this path

  // Path quality and engagement
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metrics: PathMetrics;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  // Creation and curation
  @Column({ nullable: true })
  createdBy: string; // username, not UUID

  @Column({ type: 'enum', enum: ['community', 'expert', 'algorithm'], default: 'algorithm' })
  curatedBy: 'community' | 'expert' | 'algorithm';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_learning_path_enrollments')
export class UserLearningPathEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // username, not UUID

  @ManyToOne(() => LearningPath)
  @JoinColumn({ name: 'pathId' })
  path: LearningPath;

  @Column()
  pathId: string;

  // Progress tracking
  @Column('simple-array', { default: () => "'{}'" })
  completedSteps: string[];

  @Column({ nullable: true })
  currentStep: string;

  @Column({ type: 'timestamp' })
  enrolledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivity: Date;

  // Personalization and feedback
  @Column({ type: 'jsonb', nullable: true })
  personalNotes: Record<string, string>; // step ID -> user notes

  @Column({ type: 'int', nullable: true })
  rating: number; // user's rating of the path

  @Column('text', { nullable: true })
  feedback: string; // user's detailed feedback

  @Column({ default: false })
  isAbandoned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}