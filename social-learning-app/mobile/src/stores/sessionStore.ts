import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResearchSession, SessionPreview, SessionStats, ScreenData, Point } from '../types/sessionTypes';

interface SessionState {
  // Current session
  currentSession: ResearchSession | null;
  currentScreenIndex: number;
  
  // Session management  
  allSessions: ResearchSession[];
  isResearchDashboardOpen: boolean;
  
  // Session actions
  createNewSession: () => void;
  addQuestionToCurrentSession: (question: string, sourcePosition: Point) => void;
  setCurrentScreenIndex: (index: number) => void;
  
  // Session management
  saveCurrentSession: (customTitle?: string) => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  pinSession: (sessionId: string) => void;
  archiveSession: (sessionId: string) => void;
  
  // Dashboard
  openResearchDashboard: () => void;
  closeResearchDashboard: () => void;
  
  // Session queries
  getRecentSessions: () => SessionPreview[];
  getPinnedSessions: () => SessionPreview[];
  getArchivedSessions: () => SessionPreview[];
  getSessionStats: () => SessionStats;
  searchSessions: (query: string) => SessionPreview[];
  
  // Persistence
  loadPersistedSessions: () => Promise<void>;
  persistSessions: () => Promise<void>;
  clearOldSessions: (daysOld?: number) => Promise<void>;
  
  // Computed properties
  totalPages: () => number;
  isOnMockFeed: () => boolean;
  hasQAPages: () => boolean;
  canNavigateLeft: () => boolean;
  canNavigateRight: () => boolean;
  navigateLeft: () => void;
  navigateRight: () => void;
}

const STORAGE_KEY = 'research_sessions';
const DEFAULT_MAX_SESSIONS = 50;
const DEFAULT_SESSION_EXPIRY_DAYS = 30;

// Generate auto-title from first question
const generateAutoTitle = (firstQuestion: string): string => {
  // Simple heuristic - can be enhanced with AI later
  const cleaned = firstQuestion.replace(/[?!.]/g, '').trim();
  const words = cleaned.split(' ').slice(0, 4); // First 4 words
  return words.join(' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Extract tags from question text
const extractTags = (text: string): string[] => {
  // Simple keyword extraction - can be enhanced with NLP
  const commonWords = new Set(['what', 'how', 'why', 'when', 'where', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const tags = words
    .filter(word => word.length > 3 && !commonWords.has(word))
    .slice(0, 5); // Max 5 tags
  return [...new Set(tags)]; // Remove duplicates
};

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentSession: null,
    currentScreenIndex: 0,
    allSessions: [],
    isResearchDashboardOpen: false,
    
    // Create new session
    createNewSession: () => {
      const newSession: ResearchSession = {
        id: `session-${Date.now()}`,
        title: 'New Research Session',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        screens: [],
        currentScreenIndex: 0,
        questionCount: 0,
        tags: [],
        preview: '',
        isPinned: false,
        isArchived: false,
      };
      
      set({
        currentSession: newSession,
        currentScreenIndex: 0,
      });
    },
    
    // Add question to current session
    addQuestionToCurrentSession: (question: string, sourcePosition: Point) => {
      const state = get();
      let session = state.currentSession;
      
      // Create new session if none exists
      if (!session) {
        session = {
          id: `session-${Date.now()}`,
          title: 'New Research Session',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          screens: [],
          currentScreenIndex: 0,
          questionCount: 0,
          tags: [],
          preview: '',
          isPinned: false,
          isArchived: false,
        };
      }
      
      // Create new Q&A screen
      const resultIndex = session.screens.length;
      const pageIndex = resultIndex + 1; // MockFeed is page 0
      
      const newScreen: ScreenData = {
        id: `result-${Date.now()}`,
        type: 'question-result',
        question,
        sourcePosition,
        targetPosition: { x: pageIndex * 375 + 20, y: 80 },
        connectionId: `connection-${Date.now()}`,
      };
      
      const updatedScreens = [...session.screens, newScreen];
      const newQuestionCount = updatedScreens.length;
      
      // Auto-generate title from first question
      const autoTitle = newQuestionCount === 1 ? generateAutoTitle(question) : session.autoTitle;
      const title = session.title === 'New Research Session' ? autoTitle || session.title : session.title;
      
      // Extract tags and update preview
      const allQuestions = updatedScreens.map(s => s.question || '').join(' ');
      const tags = [...new Set([...session.tags, ...extractTags(question)])];
      const preview = updatedScreens[0]?.question || '';
      
      const updatedSession: ResearchSession = {
        ...session,
        screens: updatedScreens,
        currentScreenIndex: newQuestionCount, // Navigate to new Q&A page
        questionCount: newQuestionCount,
        title,
        autoTitle,
        preview: preview.slice(0, 100) + (preview.length > 100 ? '...' : ''),
        tags,
        lastActiveAt: Date.now(),
      };
      
      set({
        currentSession: updatedSession,
        currentScreenIndex: updatedSession.currentScreenIndex,
      });
      
      // Auto-save session to allSessions array and persist
      setTimeout(() => {
        get().saveCurrentSession();
      }, 50);
    },
    
    // Set current screen index
    setCurrentScreenIndex: (index: number) => {
      const state = get();
      const session = state.currentSession;
      if (!session) return;
      
      const totalPages = 1 + session.screens.length;
      const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
      
      const updatedSession = {
        ...session,
        currentScreenIndex: clampedIndex,
        lastActiveAt: Date.now(),
      };
      
      set({
        currentSession: updatedSession,
        currentScreenIndex: clampedIndex,
      });
    },
    
    // Save current session
    saveCurrentSession: (customTitle?: string) => {
      const state = get();
      const session = state.currentSession;
      if (!session || session.screens.length === 0) return;
      
      const updatedSession = {
        ...session,
        title: customTitle || session.title,
        lastActiveAt: Date.now(),
      };
      
      const existingIndex = state.allSessions.findIndex(s => s.id === session.id);
      const allSessions = existingIndex >= 0 
        ? state.allSessions.map(s => s.id === session.id ? updatedSession : s)
        : [...state.allSessions, updatedSession];
      
      set({
        currentSession: updatedSession,
        allSessions,
      });
      
      get().persistSessions();
    },
    
    // Load session
    loadSession: (sessionId: string) => {
      const state = get();
      const session = state.allSessions.find(s => s.id === sessionId);
      if (!session) return;
      
      const updatedSession = {
        ...session,
        lastActiveAt: Date.now(),
      };
      
      set({
        currentSession: updatedSession,
        currentScreenIndex: updatedSession.currentScreenIndex,
        isResearchDashboardOpen: false,
      });
    },
    
    // Delete session
    deleteSession: (sessionId: string) => {
      const state = get();
      const allSessions = state.allSessions.filter(s => s.id !== sessionId);
      
      // If deleting current session, create new one
      const currentSession = state.currentSession?.id === sessionId ? null : state.currentSession;
      
      set({
        allSessions,
        currentSession,
        currentScreenIndex: 0,
      });
      
      get().persistSessions();
    },
    
    // Pin/unpin session
    pinSession: (sessionId: string) => {
      const state = get();
      const allSessions = state.allSessions.map(s => 
        s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
      );
      
      set({ allSessions });
      get().persistSessions();
    },
    
    // Archive session
    archiveSession: (sessionId: string) => {
      const state = get();
      const allSessions = state.allSessions.map(s => 
        s.id === sessionId ? { ...s, isArchived: !s.isArchived } : s
      );
      
      set({ allSessions });
      get().persistSessions();
    },
    
    // Dashboard controls
    openResearchDashboard: () => set({ isResearchDashboardOpen: true }),
    closeResearchDashboard: () => set({ isResearchDashboardOpen: false }),
    
    // Session queries
    getRecentSessions: () => {
      const state = get();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return state.allSessions
        .filter(s => !s.isArchived && s.lastActiveAt > sevenDaysAgo)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
        .map(s => ({
          id: s.id,
          title: s.title,
          preview: s.preview,
          questionCount: s.questionCount,
          lastActiveAt: s.lastActiveAt,
          tags: s.tags,
          isPinned: s.isPinned,
        }));
    },
    
    getPinnedSessions: () => {
      const state = get();
      return state.allSessions
        .filter(s => s.isPinned && !s.isArchived)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
        .map(s => ({
          id: s.id,
          title: s.title,
          preview: s.preview,
          questionCount: s.questionCount,
          lastActiveAt: s.lastActiveAt,
          tags: s.tags,
          isPinned: s.isPinned,
        }));
    },
    
    getArchivedSessions: () => {
      const state = get();
      return state.allSessions
        .filter(s => s.isArchived)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
        .map(s => ({
          id: s.id,
          title: s.title,
          preview: s.preview,
          questionCount: s.questionCount,
          lastActiveAt: s.lastActiveAt,
          tags: s.tags,
          isPinned: s.isPinned,
        }));
    },
    
    getSessionStats: () => {
      const state = get();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const activeSessions = state.allSessions.filter(s => s.lastActiveAt > sevenDaysAgo);
      const totalQuestions = state.allSessions.reduce((sum, s) => sum + s.questionCount, 0);
      
      // Get top tags
      const tagCounts = new Map<string, number>();
      state.allSessions.forEach(s => {
        s.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
      const favoriteTopics = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
      
      return {
        totalSessions: state.allSessions.length,
        activeSessions: activeSessions.length,
        totalQuestions,
        favoriteTopics,
      };
    },
    
    searchSessions: (query: string) => {
      const state = get();
      const lowercaseQuery = query.toLowerCase();
      return state.allSessions
        .filter(s => 
          s.title.toLowerCase().includes(lowercaseQuery) ||
          s.preview.toLowerCase().includes(lowercaseQuery) ||
          s.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        )
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
        .map(s => ({
          id: s.id,
          title: s.title,
          preview: s.preview,
          questionCount: s.questionCount,
          lastActiveAt: s.lastActiveAt,
          tags: s.tags,
          isPinned: s.isPinned,
        }));
    },
    
    // Persistence
    loadPersistedSessions: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sessions: ResearchSession[] = JSON.parse(stored);
          set({ allSessions: sessions });
        }
      } catch (error) {
        console.error('Failed to load persisted sessions:', error);
      }
    },
    
    persistSessions: async () => {
      try {
        const state = get();
        const sessionsToSave = state.allSessions.slice(-DEFAULT_MAX_SESSIONS); // Keep last N sessions
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToSave));
      } catch (error) {
        console.error('Failed to persist sessions:', error);
      }
    },
    
    clearOldSessions: async (daysOld = DEFAULT_SESSION_EXPIRY_DAYS) => {
      const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const state = get();
      const validSessions = state.allSessions.filter(s => 
        s.lastActiveAt > cutoff || s.isPinned // Keep pinned sessions regardless of age
      );
      
      set({ allSessions: validSessions });
      await get().persistSessions();
    },
    
    // Computed properties (compatible with old PagerStore)
    totalPages: () => {
      const state = get();
      const session = state.currentSession;
      return session ? 1 + session.screens.length : 1; // MockFeed + Q&A results
    },
    
    isOnMockFeed: () => {
      const state = get();
      return state.currentScreenIndex === 0;
    },
    
    hasQAPages: () => {
      const state = get();
      const session = state.currentSession;
      return session ? session.screens.length > 0 : false;
    },
    
    canNavigateLeft: () => {
      const state = get();
      return state.currentScreenIndex > 0;
    },
    
    canNavigateRight: () => {
      const state = get();
      return state.currentScreenIndex < get().totalPages() - 1;
    },
    
    navigateLeft: () => {
      const state = get();
      if (state.canNavigateLeft()) {
        get().setCurrentScreenIndex(state.currentScreenIndex - 1);
      }
    },
    
    navigateRight: () => {
      const state = get();
      if (state.canNavigateRight()) {
        get().setCurrentScreenIndex(state.currentScreenIndex + 1);
      }
    },
  }))
);

// Note: Auto-persistence happens in addQuestionToCurrentSession() 
// No need for subscription-based auto-save to avoid infinite loops

export default useSessionStore;