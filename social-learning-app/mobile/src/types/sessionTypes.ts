export interface ResearchSession {
  id: string;
  title: string; // Auto-generated or user-defined
  createdAt: number; // timestamp
  lastActiveAt: number; // timestamp
  screens: ScreenData[]; // Q&A result screens
  currentScreenIndex: number;
  
  // Session metadata
  questionCount: number;
  tags: string[]; // Auto-extracted topics
  preview: string; // First question or AI summary
  isPinned: boolean;
  isArchived: boolean;
  
  // AI-generated insights
  autoTitle?: string; // AI-generated title
  summary?: string; // AI session summary
  relatedSessions?: string[]; // IDs of related sessions
}

export interface SessionPreview {
  id: string;
  title: string;
  preview: string;
  questionCount: number;
  lastActiveAt: number;
  tags: string[];
  isPinned: boolean;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number; // Last 7 days
  totalQuestions: number;
  favoriteTopics: string[];
}

// Import ScreenData from existing types
export { ScreenData, Point } from './navigationTypes';