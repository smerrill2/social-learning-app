import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  Insight, 
  HackerNewsResponse,
  AlgorithmPreferences,
  AlgorithmFeedResponse
} from '../types';

// Dynamic API base URL configuration
// This will automatically detect and use the correct IP address
const getApiBaseUrl = () => {
  // In development, try to auto-detect the host IP
  if (__DEV__) {
    // For Expo development, we can use the development server's host
    const expoHost = process.env.EXPO_PUBLIC_API_HOST;
    if (expoHost) {
      return `http://${expoHost}:3000`;
    }
    
    // Fallback to localhost for simulators (iOS simulator can access localhost)
    // For physical devices, you'll need to set EXPO_PUBLIC_API_HOST
    return 'http://localhost:3000';
  }
  
  // Production URL (you can set this via environment variables)
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🌐 API Configuration:');
console.log('  - Base URL:', API_BASE_URL);
console.log('  - Environment:', __DEV__ ? 'Development' : 'Production');
console.log('  - EXPO_PUBLIC_API_HOST:', process.env.EXPO_PUBLIC_API_HOST);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('authToken');
  },

  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const insightsService = {
  async getFeed(limit = 20, offset = 0): Promise<Insight[]> {
    const response = await api.get('/insights/feed', {
      params: { limit, offset },
    });
    return response.data;
  },

  async createInsight(insight: {
    content: string;
    tags?: string[];
    pageReference?: string;
    bookId: string;
  }): Promise<Insight> {
    const response = await api.post('/insights', insight);
    return response.data;
  },

  async deleteInsight(id: string): Promise<void> {
    await api.delete(`/insights/${id}`);
  },
};

export const booksService = {
  async searchBooks(query: string, limit = 20, offset = 0) {
    const response = await api.get('/books/search', {
      params: { q: query, limit, offset },
    });
    return response.data;
  },

  async getPopularBooks(limit = 20) {
    const response = await api.get('/books/popular', {
      params: { limit },
    });
    return response.data;
  },

  async getBook(id: string) {
    const response = await api.get(`/books/${id}`);
    return response.data;
  },
};

export const hackerNewsService = {
  async getTopStories(limit = 50, offset = 0): Promise<HackerNewsResponse> {
    const response = await api.get('/hackernews/stories', {
      params: { limit, offset },
    });
    return response.data;
  },

  async syncStories() {
    const response = await api.get('/hackernews/sync');
    return response.data;
  },
};

export const sessionService = {
  async getPack(topic?: string): Promise<any> {
    const response = await api.get('/session/pack', {
      params: topic ? { topic } : {},
    });
    return response.data;
  },
};

export const contentService = {
  async sendFeedback(itemId: string | number, source: 'hackernews' | 'research' | 'insight', action: 'save' | 'more' | 'less' | 'skip'): Promise<{ ok: boolean }> {
    const response = await api.post('/content/feedback', { itemId, source, action });
    return response.data;
  },
};

export const algorithmService = {
  async getFeed(limit = 20, offset = 0): Promise<AlgorithmFeedResponse> {
    // Development mode mock data
    const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🚀 DEV MODE: Returning mock algorithm feed data');
      
      // Mock feed data
      const mockFeedData: AlgorithmFeedResponse = {
        items: [
          {
            id: 'mock-1',
            type: 'insight',
            content: {
              id: 'insight-1',
              content: 'The key to building habits is making them so small that you can\'t say no. Start with just 2 minutes a day.',
              tags: ['habits', 'motivation', 'productivity'],
              pageReference: 'p. 127',
              authorId: 'dev-user-123',
              bookId: 'book-1',
              book: {
                id: 'book-1',
                title: 'Atomic Habits',
                author: 'James Clear',
                coverImageUrl: 'https://m.media-amazon.com/images/I/81wgcld4wxL.jpg'
              },
              author: {
                id: 'dev-user-123',
                username: 'DevUser',
                email: 'dev@example.com'
              },
              engagement: {
                likeCount: 15,
                shareCount: 3,
                saveCount: 8,
                applyCount: 5,
                viewCount: 45,
                engagementRate: 0.82
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as any,
            algorithmScore: 0.87,
            reason: 'Matches your interest in productivity and habit formation',
            categoryTags: ['productivity', 'habits']
          },
          {
            id: 'mock-2',
            type: 'hackernews',
            content: {
              id: 2,
              title: 'Show HN: I built an AI-powered learning app',
              url: 'https://news.ycombinator.com/item?id=123456',
              by: 'developer123',
              score: 156,
              descendants: 42,
              time: new Date(),
              timeAgo: '2 hours ago',
              domain: 'news.ycombinator.com',
              type: 'story'
            } as any,
            algorithmScore: 0.75,
            reason: 'Popular in tech community',
            categoryTags: ['tech', 'AI', 'startup']
          }
        ],
        pagination: {
          limit,
          offset,
          hasMore: false
        },
        insights: {
          totalItems: 2,
          contentTypeDistribution: {
            insights: 50,
            hackernews: 50,
            research_papers: 0,
            discussions: 0
          },
          averageRelevanceScore: 0.81
        }
      };
      
      return mockFeedData;
    }
    
    // Production API call
    const response = await api.get('/algorithm/feed', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getPreferences(): Promise<AlgorithmPreferences> {
    // Development mode mock preferences
    const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🚀 DEV MODE: Returning mock algorithm preferences');
      
      const mockPreferences: AlgorithmPreferences = {
        contentTypes: {
          researchPapers: 40,
          hackernews: 30,
          insights: 25,
          discussions: 5
        },
        researchCategories: {
          psychology: 70,
          behavioralScience: 60,
          healthSciences: 30,
          neuroscience: 40,
          cognitiveScience: 50,
          artificialIntelligence: 80,
          computerScience: 60,
          socialSciences: 20,
          economics: 15,
          philosophy: 25
        },
        feedBehavior: {
          recencyWeight: 60,
          popularityWeight: 50,
          diversityImportance: 70,
          explorationVsExploitation: 65,
          socialSignalsWeight: 40
        },
        sourcePreferences: {
          arxiv: 70,
          hackernews: 80,
          pubmed: 40,
          researchgate: 30,
          personalInsights: 90
        },
        contentFilters: {
          minReadingTime: 3,
          maxReadingTime: 30,
          languagePreference: 'en',
          contentQualityThreshold: 70
        }
      };
      
      return mockPreferences;
    }
    
    // Production API call
    const response = await api.get('/algorithm/preferences');
    return response.data;
  },

  async updatePreferences(preferences: Partial<AlgorithmPreferences>): Promise<AlgorithmPreferences> {
    // Development mode mock update
    const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🚀 DEV MODE: Mock updating algorithm preferences', preferences);
      
      // Get current mock preferences and merge with updates
      const currentPrefs = await this.getPreferences();
      const updatedPrefs = { ...currentPrefs, ...preferences };
      
      // In real app, this would be stored somewhere persistent
      console.log('✅ DEV MODE: Preferences updated successfully');
      return updatedPrefs;
    }
    
    // Production API call
    const response = await api.post('/algorithm/preferences', preferences);
    return response.data;
  },

  async getInsights(): Promise<any> {
    const response = await api.get('/algorithm/insights');
    return response.data;
  },

  async applyQuickPreset(presetId: string): Promise<AlgorithmPreferences> {
    const response = await api.post('/algorithm/quick-preset', { presetId });
    return response.data;
  },

  async resetToDefaults(): Promise<AlgorithmPreferences> {
    const response = await api.post('/algorithm/reset');
    return response.data;
  },
};

// Learning API Service
export const learningService = {
  async getRecommendations(userId: string): Promise<any[]> {
    try {
      const response = await api.get(`/learning/recommendations/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching learning recommendations:', error);
      return [];
    }
  },

  async getProgress(userId: string): Promise<any> {
    try {
      const response = await api.get(`/learning/progress/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching learning progress:', error);
      return null;
    }
  },

  async getAchievements(userId: string): Promise<any[]> {
    try {
      const response = await api.get(`/learning/achievements/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  },

  async trackActivity(userId: string, activity: {
    contentId: string;
    contentType: string;
    timeSpent: number;
    completed: boolean;
    skillsApplied: string[];
  }): Promise<void> {
    try {
      await api.post(`/learning/track-activity/${userId}`, activity);
    } catch (error) {
      console.error('Error tracking learning activity:', error);
    }
  },

  async getLeaderboard(skillArea: string): Promise<any[]> {
    try {
      const response = await api.get(`/learning/leaderboard/${skillArea}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }
};

export default api;
