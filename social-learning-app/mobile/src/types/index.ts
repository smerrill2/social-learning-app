export interface User {
  id: string;
  username: string;
  email: string;
  profile?: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  };
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  metadata?: {
    genre?: string[];
    categories?: string[];
    publishedYear?: number;
    pageCount?: number;
  };
}

export interface Insight {
  id: string;
  content: string;
  tags?: string[];
  pageReference?: string;
  chapterReference?: string;
  authorId: string;
  bookId: string;
  book?: Book;
  author?: User;
  engagement: {
    likeCount: number;
    shareCount: number;
    saveCount: number;
    applyCount: number;
    viewCount: number;
    engagementRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface HackerNewsStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants: number;
  time: Date;
  kids?: number[];
  type: string;
  timeAgo: string;
  domain?: string;
  summary?: string | null;
}

export interface HackerNewsResponse {
  stories: HackerNewsStory[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  publishedDate: string;
  arxivId: string;
  pdfUrl?: string;
  citationCount?: number;
  relevanceScore?: number;
}

export interface AlgorithmPreferences {
  contentTypes: {
    researchPapers: number;    // 0-100% weight
    hackernews: number;        // 0-100% weight  
    insights: number;          // 0-100% weight
    discussions: number;       // 0-100% weight
  };
  researchCategories: {
    psychology: number;        // 0-100% weight
    behavioralScience: number;
    healthSciences: number;
    neuroscience: number;
    cognitiveScience: number;
    artificialIntelligence: number;
    computerScience: number;
    socialSciences: number;
    economics: number;
    philosophy: number;
  };
  feedBehavior: {
    recencyWeight: number;     // 0-100: New vs older content
    popularityWeight: number;  // 0-100: High engagement vs niche  
    diversityImportance: number; // 0-100: Variety vs focused
    explorationVsExploitation: number; // 0-100: Discovery vs familiarity
    socialSignalsWeight: number; // 0-100: Social validation importance
  };
  sourcePreferences: {
    arxiv: number;
    hackernews: number;
    pubmed: number;
    researchgate: number;
    personalInsights: number;
  };
  contentFilters: {
    minReadingTime: number;    // Minutes
    maxReadingTime: number;    // Minutes  
    languagePreference: string; // 'en', etc
    contentQualityThreshold: number; // 0-100
  };
}

export interface AlgorithmFeedItem {
  id: string;
  type: 'insight' | 'hackernews' | 'research_paper' | 'discussion';
  content: Insight | HackerNewsStory | ResearchPaper;
  algorithmScore: number;
  reason?: string; // "Why am I seeing this?"
  categoryTags?: string[];
}

export interface AlgorithmFeedResponse {
  items: AlgorithmFeedItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  insights?: {
    totalItems: number;
    contentTypeDistribution: Record<string, number>;
    averageRelevanceScore: number;
  };
}

export interface QuickControlPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  changes: any; // Temporarily bypass strict typing
}