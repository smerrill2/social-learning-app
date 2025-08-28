import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type ContentType = 'research' | 'hackernews' | 'insight' | 'book' | 'challenge';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface DifficultyMetrics {
  conceptualComplexity: number; // 1-10 
  prerequisiteKnowledge: number; // 1-10
  technicalDepth: number; // 1-10
  readingLevel: number; // 1-10 (e.g., grade level equivalent)
  timeToUnderstand: number; // minutes estimated for comprehension
  applicationDifficulty: number; // 1-10 how hard to apply/implement
}

export interface LearningOutcomes {
  skills: string[]; // skills this content helps develop
  concepts: string[]; // key concepts covered
  prerequisites: string[]; // required prior knowledge
  followUpTopics: string[]; // natural next steps
  confidenceBoost: number; // 1-10 how much this builds confidence
}

@Entity('content_difficulty_assessments')
@Index('idx_content_type_id', ['contentType', 'contentId'])
@Index('idx_skill_area_difficulty', ['primarySkillArea', 'overallDifficulty'])
export class ContentDifficultyAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Content identification
  @Column()
  contentId: string; // ID in the source table (research_papers.id, hackernews_stories.id, etc.)

  @Column({ type: 'enum', enum: ['research', 'hackernews', 'insight', 'book', 'challenge'] })
  contentType: ContentType;

  @Column()
  primarySkillArea: string; // main topic/skill this content addresses

  @Column('simple-array', { nullable: true })
  secondarySkillAreas: string[]; // additional relevant skills

  // Difficulty assessment
  @Column({ type: 'enum', enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  overallDifficulty: DifficultyLevel;

  @Column({ type: 'jsonb' })
  difficultyMetrics: DifficultyMetrics;

  // Learning value assessment  
  @Column({ type: 'jsonb' })
  learningOutcomes: LearningOutcomes;

  @Column('int')
  learningValue: number; // overall educational value score

  // Assessment metadata
  @Column({ default: 'algorithm' })
  assessedBy: 'algorithm' | 'expert' | 'peer' | 'self';

  @Column('float')
  confidence: number; // confidence in this assessment

  @Column({ type: 'int', default: 0 })
  validationCount: number; // how many people have validated this assessment

  @Column({ type: 'timestamp', nullable: true })
  lastValidated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}