import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Book } from './book.entity';
import { Interaction } from './interaction.entity';

export interface EngagementMetrics {
  likeCount: number;
  shareCount: number;
  saveCount: number;
  applyCount: number;
  viewCount: number;
  engagementRate: number;
}

@Entity('insights')
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  engagement: EngagementMetrics;

  @Column({ nullable: true })
  pageReference: string;

  @Column({ nullable: true })
  chapterReference: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.insights)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => Book, book => book.insights)
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @Column('uuid')
  bookId: string;

  @OneToMany(() => Interaction, interaction => interaction.insight)
  interactions: Interaction[];
}