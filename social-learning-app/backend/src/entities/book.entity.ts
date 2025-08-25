import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Insight } from './insight.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255 })
  author: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  isbn: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    genre?: string[];
    publishedYear?: number;
    pageCount?: number;
    categories?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Insight, insight => insight.book)
  insights: Insight[];
}