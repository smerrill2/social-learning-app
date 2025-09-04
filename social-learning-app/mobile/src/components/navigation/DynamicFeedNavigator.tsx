import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  GestureResponderEvent,
  ScrollView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
// Optional haptics on page snap (gracefully degrades if unavailable)
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics');
} catch (_) {
  // Haptics not installed; continue without it
}
import { ScreenData, ConnectionLine, NavigationState, Point } from '../../types/navigationTypes';
import { ConnectionLineRenderer } from './ConnectionLineRenderer';
import { useSessionStore } from '../../stores/sessionStore';
import { MockFeedContent } from '../MockFeedContent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Subtle parallax for a hint of depth while swiping (closer to iOS home screen feel)
const PARALLAX = 8;

interface Props {
  onClose?: () => void;
  onOpenAlgorithmSettings?: () => void;
  onQuestionClick?: (question: string, e?: any) => void;
  onScroll?: () => void;
}

export const DynamicFeedNavigator: React.FC<Props> = ({ onClose, onOpenAlgorithmSettings, onQuestionClick, onScroll }) => {
  // Use SessionStore instead of local state
  const { 
    currentSession,
    currentScreenIndex, 
    setCurrentScreenIndex, 
    addQuestionToCurrentSession, 
    totalPages,
    isOnMockFeed
  } = useSessionStore();

  // Local animation state
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get screens from current session
  const screens = currentSession?.screens || [];

  // Sync slide animation with SessionStore currentScreenIndex
  React.useEffect(() => {
    slideAnim.setValue(-currentScreenIndex * SCREEN_WIDTH);
  }, [currentScreenIndex, slideAnim]);

  // Debug: log state changes
  React.useEffect(() => {
    try {
      console.log('[Navigator] screens:', screens.map(s => s.type), 'currentIndex:', currentScreenIndex);
    } catch {}
  }, [screens, currentScreenIndex]);

  const slideAnim = useRef(new Animated.Value(-currentScreenIndex * SCREEN_WIDTH)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Track refs to measure target UI (e.g., search bar) per screen
  const resultTargetRefs = useRef(new Map<string, any>());

  // Start shimmer animation for generating states
  const startShimmerAnimation = () => {
    shimmerLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    shimmerLoop.current.start();
  };

  const stopShimmerAnimation = () => {
    shimmerLoop.current?.stop();
  };

  // Handle question click with position capture (now uses PagerStore)
  const handleQuestionClick = useCallback((question: string, event?: GestureResponderEvent, overrideFromWorld?: Point) => {
    let fromWorld: Point = { x: SCREEN_WIDTH / 2, y: 200 }; // fallback
    
    if (overrideFromWorld) {
      fromWorld = overrideFromWorld;
    } else if (event) {
      // Convert touch (window coords) to container/world coords (add current page offset)
      fromWorld = {
        x: event.nativeEvent.pageX + currentScreenIndex * SCREEN_WIDTH,
        y: event.nativeEvent.pageY,
      };
    }

    // Add result via SessionStore
    addQuestionToCurrentSession(question, fromWorld);

    // Start generating animation
    startShimmerAnimation();

    // Animate to new screen with smooth easing from current position
    const targetIndex = screens.length; // This will be updated by the store
    const currentValue = slideAnim._value + gestureX._value;
    const targetValue = -targetIndex * SCREEN_WIDTH;
    
    setIsTransitioning(true);
    
    // Set to current position and animate to target
    slideAnim.setValue(currentValue);
    gestureX.setValue(0);
    
    const distance = Math.abs(currentValue - targetValue);
    const progress = distance / SCREEN_WIDTH;
    
    Animated.timing(slideAnim, {
      toValue: targetValue,
      duration: 320 + (progress * 180), // 320-500ms
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // iOS ease out
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);

      // Stop shimmer after 3 seconds (simulate generation)
      setTimeout(() => {
        stopShimmerAnimation();
      }, 3000);
    });
  }, [screens.length, currentScreenIndex, slideAnim, shimmerAnim, addQuestionToCurrentSession]);

  // On mount: no-op; we seed initial screens above

  // Handle page swipe navigation (for programmatic navigation like dots)
  const handlePageSwipe = (targetIndex: number) => {
    const currentValue = slideAnim._value + gestureX._value;
    const targetValue = -targetIndex * SCREEN_WIDTH;
    
    setCurrentScreenIndex(targetIndex);
    setIsTransitioning(true);
    
    // Set to current position and animate to target
    slideAnim.setValue(currentValue);
    gestureX.setValue(0);
    
    const distance = Math.abs(currentValue - targetValue);
    const progress = distance / SCREEN_WIDTH;
    
    Animated.timing(slideAnim, {
      toValue: targetValue,
      // Slightly snappier ease-out for manual page taps
      duration: 260 + (progress * 140),
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);
      if (Haptics?.selectionAsync) {
        try { Haptics.selectionAsync(); } catch {}
      }
    });
  };

  // Gesture handling with better state management
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: gestureX } }],
    { useNativeDriver: true }
  );

  // Handle gesture state changes for smoother interactions
  const onGestureStateChange = (event: any) => {
    const { state } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      // Stop any ongoing animations when user starts gesture
      slideAnim.stopAnimation();
    } else if (state === State.END || state === State.CANCELLED) {
      onHandlerStateChange(event);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // iPhone-style physics: lower distance threshold, higher velocity sensitivity
      const distanceThreshold = SCREEN_WIDTH * 0.15; // More sensitive to distance
      const velocityThreshold = 200; // More sensitive to velocity
      const strongVelocityThreshold = 800; // Fast flick = immediate commit
      
      let targetIndex = currentScreenIndex;
      
      // Strong velocity overrides distance (iPhone behavior)
      if (velocityX > strongVelocityThreshold) {
        targetIndex = Math.max(0, currentScreenIndex - 1);
      } else if (velocityX < -strongVelocityThreshold) {
        targetIndex = Math.min(totalPages() - 1, currentScreenIndex + 1);
      } else {
        // Normal threshold check with combined distance + velocity
        const rightward = translationX > distanceThreshold || (translationX > distanceThreshold * 0.5 && velocityX > velocityThreshold);
        const leftward = translationX < -distanceThreshold || (translationX < -distanceThreshold * 0.5 && velocityX < -velocityThreshold);
        
        if (rightward) {
          targetIndex = Math.max(0, currentScreenIndex - 1);
        } else if (leftward) {
          targetIndex = Math.min(totalPages() - 1, currentScreenIndex + 1);
        }
      }
      
      // Get current animated position to continue from where user left off
      const currentAnimatedValue = slideAnim._value + gestureX._value;
      const targetValue = -targetIndex * SCREEN_WIDTH;
      
      // Reset gesture value immediately
      gestureX.setValue(0);
      
      // Set slideAnim to current position and animate smoothly to target
      slideAnim.setValue(currentAnimatedValue);
      
      if (targetIndex !== currentScreenIndex) {
        // Update store state first
        setCurrentScreenIndex(targetIndex);
        setIsTransitioning(true);
        
        // iPhone-style animation: fast start, smooth deceleration
        const distance = Math.abs(currentAnimatedValue - targetValue);
        const progress = distance / SCREEN_WIDTH;
        
        Animated.timing(slideAnim, {
          toValue: targetValue,
          // Slightly snappier, iOS-like ease-out based on distance
          duration: 260 + (progress * 140),
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }).start(() => {
          setIsTransitioning(false);
          // Light haptic on page snap if available
          if (Haptics?.selectionAsync) {
            try { Haptics.selectionAsync(); } catch {}
          }
        });
      } else {
        // iPhone-style spring back: bouncy but controlled
        Animated.spring(slideAnim, {
          toValue: targetValue,
          tension: 140,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Render individual page (MockFeed at index 0, then Q&A results)
  const renderPage = (pageIndex: number) => {
    // Page 0 is MockFeed
    if (pageIndex === 0) {
      return (
        <View key="mockfeed-page" style={styles.page}>
          <Animated.View style={[
            styles.pageInner, 
            { 
              transform: [
                { translateX: getParallaxTranslate(pageIndex) },
                { scale: getPageScale(pageIndex) }
              ],
              opacity: getPageOpacity(pageIndex)
            }
          ]}>
            <MockFeedContent 
              onOpenAlgorithmSettings={onOpenAlgorithmSettings}
              onQuestionClick={onQuestionClick || handleQuestionClick}
              onScroll={onScroll}
            />
          </Animated.View>
        </View>
      );
    }

    // Pages 1+ are Q&A results
    const resultIndex = pageIndex - 1; // Convert page index to screens array index
    const screen = screens[resultIndex];
    if (!screen) return null;

    return renderQAResultPage(screen, pageIndex);
  };

  // Get parallax transform for a page with smoother interpolation
  const getParallaxTranslate = (pageIndex: number) => {
    const localOffset = Animated.add(slideAnim, gestureX);
    const progress = Animated.divide(Animated.multiply(localOffset, -1), SCREEN_WIDTH);
    const delta = Animated.add(progress, -pageIndex);
    return (delta as any).interpolate({
      inputRange: [-2, -1, 0, 1, 2],
      outputRange: [PARALLAX * 2, PARALLAX, 0, -PARALLAX, -PARALLAX * 2],
      extrapolate: 'clamp',
    });
  };

  // Get scale transform for smooth page transitions
  const getPageScale = (pageIndex: number) => {
    const localOffset = Animated.add(slideAnim, gestureX);
    const progress = Animated.divide(Animated.multiply(localOffset, -1), SCREEN_WIDTH);
    const delta = Animated.add(progress, -pageIndex);
    return (delta as any).interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0.99, 1, 0.99],
      extrapolate: 'clamp',
    });
  };

  // Get opacity for smooth fade transitions
  const getPageOpacity = (pageIndex: number) => {
    const localOffset = Animated.add(slideAnim, gestureX);
    const progress = Animated.divide(Animated.multiply(localOffset, -1), SCREEN_WIDTH);
    const delta = Animated.add(progress, -pageIndex);
    return (delta as any).interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
  };

  // Render Q&A result page
  const renderQAResultPage = (screen: ScreenData, pageIndex: number) => {
    return (
      <View key={screen.id} style={styles.page}>
        <Animated.View style={[
          styles.pageInner, 
          { 
            transform: [
              { translateX: getParallaxTranslate(pageIndex) },
              { scale: getPageScale(pageIndex) }
            ],
            opacity: getPageOpacity(pageIndex)
          }
        ]}>
          <ScrollView 
            style={styles.pageScrollView}
            contentContainerStyle={styles.pageScrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Question result page content */}
          <>
              {/* DEBUG: big black box to verify layout */}
              <View style={styles.debugBlackBox} />
              {/* Search Bar Header with spinning logo */}
              <View style={styles.resultHeader}>
                <View
                  ref={(node) => {
                    resultTargetRefs.current.set(screen.id, node);
                    if (node) {
                      // Measure in window and convert to world coords for precise line targets
                      requestAnimationFrame(() => {
                        try {
                          // @ts-ignore measureInWindow exists on native components
                          node.measureInWindow((x: number, y: number, _w: number, h: number) => {
                            const toWorld: Point = {
                              x: pageIndex * SCREEN_WIDTH + x + 20, // near left edge of search bar
                              y: y + h / 2, // vertically centered
                            };
                            // TODO: Update target position in PagerStore if needed
                            // For now, we'll skip this since connections are disabled
                          });
                        } catch {}
                      });
                    }
                  }}
                  style={styles.resultSearchBar}
                >
                  <TextInput
                    style={styles.resultSearchInput}
                    value={screen.question || ''}
                    editable={false}
                  />
                  <Animated.View 
                    style={[
                      styles.resultSearchButton,
                      {
                        transform: [{
                          rotate: shimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          })
                        }]
                      }
                    ]}
                  >
                    <Image 
                      source={require('../../../assets/Betterment.png')} 
                      style={styles.resultSearchIcon}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>
              </View>
              
              {/* AI Generated Content */}
              <View style={styles.aiContent}>
                <Text style={styles.aiAnswer}>
                  Current deep learning architectures include Transformers, CNNs, RNNs, and emerging models like Vision Transformers and BERT. The field is rapidly evolving with new attention mechanisms and architectural innovations.
                </Text>
                {/* Follow-up question */}
                <TouchableOpacity 
                  style={styles.followUpButton}
                  activeOpacity={0.7}
                  onPress={(event) => handleQuestionClick(`Follow-up on: ${screen.question}`, event)}
                >
                  <Image 
                    source={require('../../../assets/Betterment.png')} 
                    style={styles.questionIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.followUpText}>Ask a follow-up</Text>
                </TouchableOpacity>
              </View>
            </>
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  // Render page dots
  const renderPageDots = () => {
    const total = totalPages();
    // Show dots only when there are Q&A pages (MockFeed alone doesn't need dots)
    if (total <= 1) return null;

    return (
      <View style={styles.pageDotsContainer}>
        <View style={styles.pageDots}>
          {Array.from({ length: total }).map((_, pageIndex) => (
            <TouchableOpacity
              key={pageIndex}
              style={[
                styles.dot,
                currentScreenIndex === pageIndex && styles.activeDot,
                pageIndex === 0 ? styles.homeDot : styles.questionDot,
              ]}
              onPress={() => {
                console.log(`🏠 Navigating to page ${pageIndex}${pageIndex === 0 ? ' (MockFeed Home)' : ''}`);
                handlePageSwipe(pageIndex);
              }}
              activeOpacity={0.6}
            >
              {pageIndex === 0 && (
                <Ionicons 
                  name="home" 
                  size={10} 
                  color={currentScreenIndex === 0 ? "#3b82f6" : "#6b7280"} 
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const pageCount = totalPages();
  const containerWidth = pageCount * SCREEN_WIDTH;
  const screenOffset = Animated.add(slideAnim, gestureX);

  // Rubber band effect at edges like iOS home screen
  const maxOffset = 0; // leftmost (page 0)
  const minOffset = -((pageCount - 1) * SCREEN_WIDTH); // rightmost (last page)
  const screenOffsetRubber = (screenOffset as any).interpolate({
    inputRange: [minOffset - SCREEN_WIDTH, minOffset, maxOffset, maxOffset + SCREEN_WIDTH],
    outputRange: [minOffset - SCREEN_WIDTH * 0.3, minOffset, maxOffset, maxOffset + SCREEN_WIDTH * 0.3],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient
      colors={[
        'rgba(139, 174, 211, 0.015)',
        'rgba(185, 208, 235, 0.01)', 
        'rgba(240, 245, 250, 0.005)', 
        'rgba(255, 255, 255, 1)',
        'rgba(255, 255, 255, 1)',
      ]}
      locations={[0, 0.2, 0.4, 0.7, 1]}
      start={{ x: 0.5, y: 0.5 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Close button removed - unified pager system always active */}

      {/* Debug status overlay */}
      <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 9999, backgroundColor: 'rgba(4,219,235,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ fontSize: 10, color: '#0f172a' }}>total: {totalPages()} idx: {currentScreenIndex} {isOnMockFeed() ? '(MockFeed)' : '(Q&A)'}</Text>
      </View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureStateChange}
        enabled={!isTransitioning}
        // iPhone-style gesture recognition: quick horizontal activation
        activeOffsetX={[-8, 8]}
        failOffsetY={[-25, 25]}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View 
          style={[
            styles.screensContainer,
            {
              width: containerWidth,
              transform: [{ translateX: screenOffsetRubber }]
            }
          ]}
        >
          {Array.from({ length: pageCount }).map((_, pageIndex) => renderPage(pageIndex))}
        </Animated.View>
      </PanGestureHandler>

      {/* Connection Lines Overlay - Temporarily disabled */}
      {/* <ConnectionLineRenderer
        connections={[]} // No connections for now
        screenOffset={screenOffset}
        containerWidth={containerWidth}
      /> */}

      {/* Page Dots */}
      {renderPageDots()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screensContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  pageInner: {
    flex: 1,
  },
  pageScrollView: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  debugBlackBox: {
    height: 160,
    backgroundColor: 'black',
    borderRadius: 8,
    marginBottom: 16,
  },
  tilesListContent: {
    paddingBottom: 120,
  },
  resultHeader: {
    marginBottom: 20,
    marginTop: 80, // Increased for better spacing from top
  },
  resultSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: 'rgb(4, 219, 235)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 100,
    elevation: 12,
    marginBottom: 8,
  },
  resultSearchInput: {
    flex: 1,
    fontSize: 14,
    color: 'rgb(4, 219, 235)',
    fontWeight: '600',
    marginRight: 15,
  },
  resultSearchButton: {
    width: 40,
    height: 33,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  resultSearchIcon: {
    width: 24,
    height: 24,
  },
  aiContent: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.6, // Ensure content is scrollable
  },
  aiAnswer: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
  },
  followUpButton: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgb(4, 219, 235)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  followUpText: {
    color: 'rgb(4, 219, 235)',
    fontSize: 12,
    fontWeight: '600',
  },
  pageDotsContainer: {
    position: 'absolute',
    bottom: 40, // Moved up for better visibility
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 201,
  },
  pageDots: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeDot: {
    backgroundColor: 'rgba(4, 219, 235, 0.3)',
  },
  questionDot: {
    backgroundColor: 'rgba(4, 219, 235, 0.2)',
  },
  homeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
});

export default DynamicFeedNavigator;
