export interface Point {
  x: number;
  y: number;
}

export interface ScreenData {
  id: string;
  type: 'tiles' | 'question-result';
  question?: string;
  sourcePosition?: Point;
  targetPosition?: Point;
  content?: any;
  connectionId?: string;
}

export interface ConnectionLine {
  id: string;
  // Coordinates are in container/world space (not viewport),
  // measured across all pages laid out horizontally.
  from: Point;
  to: Point;
  // Optional: indices of source/target screens for bookkeeping
  fromScreenIndex?: number;
  toScreenIndex?: number;
  question: string;
  progress: number;
  isActive: boolean;
}

export interface NavigationState {
  screens: ScreenData[];
  currentScreenIndex: number;
  activeConnections: ConnectionLine[];
  isTransitioning: boolean;
}
