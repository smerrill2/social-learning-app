import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('hackernews_stories')
@Index('idx_hackernews_time_score', ['time', 'score'])
export class HackerNewsStory {
  @PrimaryColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column()
  by: string;

  @Column()
  score: number;

  @Column()
  descendants: number;

  @Column({ type: 'timestamp' })
  time: Date;

  @Column('simple-array', { nullable: true })
  kids: number[];

  @Column({ default: 'story' })
  type: string;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fetchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}