import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('research_papers')
export class ResearchPaper {
  @PrimaryColumn()
  id: string; // arXiv ID (e.g., "2301.07041")

  @Column()
  title: string;

  @Column('text')
  abstract: string;

  @Column('simple-array')
  authors: string[];

  @Column('simple-array')
  categories: string[]; // arXiv categories like "cs.AI", "q-bio.NC", etc.

  @Column('simple-array', { nullable: true })
  tags: string[]; // Our custom tags for categorization

  @Column()
  publishedDate: Date;

  @Column({ nullable: true })
  updatedDate: Date;

  @Column()
  pdfUrl: string;

  @Column()
  abstractUrl: string;

  @Column({ nullable: true })
  doi: string;

  @Column({ nullable: true })
  journal: string;

  @Column({ type: 'jsonb', nullable: true })
  engagement: {
    viewCount: number;
    saveCount: number;
    shareCount: number;
    citationCount?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  classification: {
    isPsychology: boolean;
    isBehavioralScience: boolean;
    isHealthScience: boolean;
    isNeuroscience: boolean;
    isCognitiveScience: boolean;
    isAI: boolean;
    isComputerScience: boolean;
    confidence: number; // 0-1 confidence score
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fetchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}