import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Insight } from './insight.entity';

export type InteractionType = 'like' | 'share' | 'save' | 'apply';

@Entity('interactions')
export class Interaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['like', 'share', 'save', 'apply'] })
  type: InteractionType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    shareTarget?: string;
    applicationNotes?: string;
    timestamp?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.interactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Insight, insight => insight.interactions)
  @JoinColumn({ name: 'insightId' })
  insight: Insight;

  @Column('uuid')
  insightId: string;
}