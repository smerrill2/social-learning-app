import { create } from 'zustand';
import { ScreenData, Point } from '../types/navigationTypes';

interface PagerState {
  // Core state
  screens: ScreenData[]; // Q&A result screens only (MockFeed is conceptually page 0)
  currentScreenIndex: number; // 0 = MockFeed, 1+ = Q&A results
  maxStoredPages: number;

  // Actions
  goToMockFeed: () => void;
  addResult: (question: string, sourcePosition: Point) => void;
  setCurrentIndex: (index: number) => void;
  clearAllPages: () => void;
  
  // Navigation helpers
  canNavigateLeft: () => boolean;
  canNavigateRight: () => boolean;
  navigateLeft: () => void;
  navigateRight: () => void;
  
  // Computed properties
  totalPages: () => number; // MockFeed + Q&A results
  isOnMockFeed: () => boolean;
  hasQAPages: () => boolean;
}

export const usePagerStore = create<PagerState>((set, get) => ({
  // Initial state - always start on MockFeed (page 0)
  screens: [], // Q&A result screens
  currentScreenIndex: 0, // 0 = MockFeed, 1+ = Q&A results
  maxStoredPages: 8,

  // Navigate back to MockFeed (page 0)
  goToMockFeed: () => {
    set({ currentScreenIndex: 0 });
  },

  // Add a new Q&A result page
  addResult: (question: string, sourcePosition: Point) => {
    const state = get();
    const resultIndex = state.screens.length; // Index in screens array
    const pageIndex = resultIndex + 1; // Page index (MockFeed is 0, so results start at 1)
    
    const newScreen: ScreenData = {
      id: `result-${Date.now()}`,
      type: 'question-result',
      question,
      sourcePosition,
      targetPosition: { x: pageIndex * 375 + 20, y: 80 }, // Page index for positioning
      connectionId: `connection-${Date.now()}`,
    };

    // Enforce max pages limit (FIFO eviction)
    let updatedScreens = [...state.screens, newScreen];
    if (updatedScreens.length > state.maxStoredPages) {
      updatedScreens = updatedScreens.slice(1); // Remove oldest
    }

    set({
      screens: updatedScreens,
      currentScreenIndex: updatedScreens.length, // Navigate to new Q&A page (screens.length = page index)
    });
  },

  // Set current page index
  setCurrentIndex: (index: number) => {
    const state = get();
    const totalPages = state.totalPages();
    const clampedIndex = Math.max(0, Math.min(totalPages - 1, index));
    set({ currentScreenIndex: clampedIndex });
  },

  // Clear all stored pages
  clearAllPages: () => {
    set({
      screens: [],
      currentScreenIndex: 0,
    });
  },

  // Navigation helpers
  canNavigateLeft: () => {
    const state = get();
    return state.currentScreenIndex > 0;
  },

  canNavigateRight: () => {
    const state = get();
    return state.currentScreenIndex < state.totalPages() - 1;
  },

  navigateLeft: () => {
    const state = get();
    if (state.canNavigateLeft()) {
      state.setCurrentIndex(state.currentScreenIndex - 1);
    }
  },

  navigateRight: () => {
    const state = get();
    if (state.canNavigateRight()) {
      state.setCurrentIndex(state.currentScreenIndex + 1);
    }
  },

  // Computed properties
  totalPages: () => {
    const state = get();
    return 1 + state.screens.length; // MockFeed (1) + Q&A results
  },

  isOnMockFeed: () => {
    const state = get();
    return state.currentScreenIndex === 0;
  },

  hasQAPages: () => {
    const state = get();
    return state.screens.length > 0;
  },
}));

export default usePagerStore;