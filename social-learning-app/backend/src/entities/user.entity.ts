import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Insight } from './insight.entity';
import { Interaction } from './interaction.entity';

export interface UserProfile {
  bio?: string;
  avatar?: string;
  preferences: {
    topics: string[];
    notificationSettings: {
      push: boolean;
      email: boolean;
      social: boolean;
    };
  };
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  privacy: {
    profileVisible: boolean;
    insightsVisible: boolean;
  };
}

export interface AlgorithmPreferences {
  contentTypes: {
    researchPapers: number;     // 0-100% weight
    hackernews: number;         // 0-100% weight  
    insights: number;           // 0-100% weight
    discussions: number;        // 0-100% weight
  };
  
  researchCategories: {
    psychology: number;         // 0-100% weight
    behavioralScience: number;  // 0-100% weight
    healthSciences: number;     // 0-100% weight
    neuroscience: number;       // 0-100% weight
    cognitiveScience: number;   // 0-100% weight
    aiMl: number;              // 0-100% weight
    computerScience: number;    // 0-100% weight
  };
  
  feedBehavior: {
    recencyWeight: number;      // 0-100: New vs older content
    popularityWeight: number;   // 0-100: High engagement vs niche
    diversityBoost: number;     // 0-100: Variety vs specialization
    serendipityFactor: number;  // 0-100: Unexpected vs predictable
  };
  
  sourcePreferences: {
    arxiv: boolean;
    pubmed: boolean;
    hackernews: boolean;
    userInsights: boolean;
    researchGate: boolean;
  };
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'jsonb', nullable: true })
  profile: UserProfile;

  @Column({ type: 'jsonb', nullable: true })
  settings: UserSettings;

  @Column({ type: 'jsonb', nullable: true })
  algorithmPreferences: AlgorithmPreferences;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActive: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Insight, insight => insight.author)
  insights: Insight[];

  @OneToMany(() => Interaction, interaction => interaction.user)
  interactions: Interaction[];
}