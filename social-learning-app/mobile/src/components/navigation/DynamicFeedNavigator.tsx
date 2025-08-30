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
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenData, ConnectionLine, NavigationState, Point } from '../../types/navigationTypes';
import { ConnectionLineRenderer } from './ConnectionLineRenderer';
import { SimpleTile } from '../SimpleTile';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARALLAX = 30; // px parallax offset for in-between pages

interface Props {
  initialTileContent?: any;
  initialQuestionIntent?: {
    question: string;
    fromPageX: number;
    fromPageY: number;
  } | null;
  onClose?: () => void;
}

export const DynamicFeedNavigator: React.FC<Props> = ({ initialTileContent, initialQuestionIntent, onClose }) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    screens: [],
    currentScreenIndex: 0,
    activeConnections: [],
    isTransitioning: false,
  });

  const slideAnim = useRef(new Animated.Value(0)).current; // pager position in px (negative to move left)
  const overlaySlide = useRef(new Animated.Value(0)).current; // one-time entrance from right
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

  // Handle question click with position capture
  const handleQuestionClick = useCallback((question: string, event?: GestureResponderEvent, overrideFromWorld?: Point) => {
    let fromWorld: Point = { x: SCREEN_WIDTH / 2, y: 200 }; // fallback
    const currentIndex = navigationState.currentScreenIndex;
    if (overrideFromWorld) {
      fromWorld = overrideFromWorld;
    } else if (event) {
      // Convert touch (window coords) to container/world coords (add current page offset)
      fromWorld = {
        x: event.nativeEvent.pageX + currentIndex * SCREEN_WIDTH,
        y: event.nativeEvent.pageY,
      };
    }

    // Create new result screen
    const newScreenId = `result-${Date.now()}`;
    const targetIndex = navigationState.screens.length; // new screen index (starts at 0 since no Page 0)
    const toWorld: Point = {
      x: targetIndex * SCREEN_WIDTH + 20, // will be corrected after measuring
      y: 80,
    };

    const newScreen: ScreenData = {
      id: newScreenId,
      type: 'question-result',
      question,
      sourcePosition: fromWorld,
      targetPosition: toWorld,
      connectionId: `connection-${newScreenId}`,
    };

    // Create connection line - temporarily disabled
    // const newConnection: ConnectionLine = {
    //   id: `connection-${newScreenId}`,
    //   from: fromWorld,
    //   to: toWorld,
    //   question,
    //   progress: 0,
    //   isActive: true,
    //   fromScreenIndex: -1, // -1 represents MockFeed (Page 0)
    //   toScreenIndex: targetIndex,
    // };

    // Update navigation state
    setNavigationState(prev => ({
      ...prev,
      screens: [...prev.screens, newScreen],
      activeConnections: [], // No connections for now
      isTransitioning: true,
    }));

    // Start generating animation
    startShimmerAnimation();

    // Animate to new screen
    Animated.timing(slideAnim, {
      toValue: -targetIndex * SCREEN_WIDTH,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setNavigationState(prev => ({
        ...prev,
        currentScreenIndex: targetIndex,
        isTransitioning: false,
      }));

      // Stop shimmer after 3 seconds (simulate generation)
      setTimeout(() => {
        stopShimmerAnimation();
      }, 3000);
    });
  }, [navigationState.screens.length, navigationState.currentScreenIndex, slideAnim, shimmerAnim]);

  // On mount: if we received an initial question intent (from MockFeed), open immediately
  React.useEffect(() => {
    // Start overlay off-screen to the right so the first page slides in
    overlaySlide.setValue(SCREEN_WIDTH);
    if (initialQuestionIntent) {
      const fromWorld: Point = {
        x: initialQuestionIntent.fromPageX, // MockFeed coordinates
        y: initialQuestionIntent.fromPageY,
      };
      handleQuestionClick(initialQuestionIntent.question, undefined, fromWorld);
    }
    // Animate overlay entrance once
    Animated.timing(overlaySlide, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle page swipe navigation
  const handlePageSwipe = (targetIndex: number) => {
    setNavigationState(prev => ({ ...prev, currentScreenIndex: targetIndex }));
    
    Animated.timing(slideAnim, {
      toValue: -targetIndex * SCREEN_WIDTH,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // Gesture handling
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: gestureX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const threshold = SCREEN_WIDTH * 0.25;
      
      let targetIndex = navigationState.currentScreenIndex;
      
      if (translationX > threshold || velocityX > 500) {
        // Swipe right - go to previous screen (or back to MockFeed if on first result page)
        if (navigationState.currentScreenIndex === 0) {
          // Back to MockFeed - close the navigator
          onClose?.();
          return;
        } else {
          targetIndex = Math.max(0, navigationState.currentScreenIndex - 1);
        }
      } else if (translationX < -threshold || velocityX < -500) {
        // Swipe left - go to next screen
        targetIndex = Math.min(navigationState.screens.length - 1, navigationState.currentScreenIndex + 1);
      }
      
      // Reset gesture value
      gestureX.setValue(0);
      
      // Animate to target screen
      if (targetIndex !== navigationState.currentScreenIndex) {
        handlePageSwipe(targetIndex);
      } else {
        // Spring back to current screen
        Animated.spring(slideAnim, {
          toValue: -navigationState.currentScreenIndex * SCREEN_WIDTH,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Render individual screen
  const renderScreen = (screen: ScreenData, index: number) => {
    // Compute parallax based on horizontal pager progress relative to this index
    const localOffset = Animated.add(Animated.add(overlaySlide, slideAnim), gestureX);
    const progress = Animated.divide(Animated.multiply(localOffset, -1), SCREEN_WIDTH);
    const delta = Animated.add(progress, -index);
    const parallaxTranslate = (delta as any).interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [PARALLAX, 0, -PARALLAX],
      extrapolate: 'clamp',
    });
    return (
      <View key={screen.id} style={styles.page}>
        <Animated.View style={{ transform: [{ translateX: parallaxTranslate }] }}>
          <ScrollView 
            style={styles.pageScrollView}
            contentContainerStyle={styles.pageScrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Only question result pages - no tiles page */}
          <>
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
                          node.measureInWindow((x: number, y: number, w: number, h: number) => {
                            const toWorld: Point = {
                              x: index * SCREEN_WIDTH + x + 20, // near left edge of search bar
                              y: y + h / 2, // vertically centered
                            };
                            setNavigationState(prev => ({
                              ...prev,
                              activeConnections: prev.activeConnections.map(c =>
                                c.id === screen.connectionId
                                  ? { ...c, to: toWorld }
                                  : c
                              ),
                              screens: prev.screens.map(s =>
                                s.id === screen.id
                                  ? { ...s, targetPosition: toWorld }
                                  : s
                              ),
                            }));
                          });
                        } catch {}
                      });
                    }
                  }}
                  style={styles.resultSearchBar}
                >
                  <TextInput
                    style={styles.resultSearchInput}
                    value={screen.question}
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
    if (navigationState.screens.length <= 1) return null;

    return (
      <View style={styles.pageDotsContainer}>
        <View style={styles.pageDots}>
          {navigationState.screens.map((screen, index) => (
            <TouchableOpacity
              key={screen.id}
              style={[
                styles.dot,
                navigationState.currentScreenIndex === index && styles.activeDot,
                screen.type === 'question-result' && styles.questionDot,
              ]}
              onPress={() => handlePageSwipe(index)}
              activeOpacity={0.6}
            />
          ))}
        </View>
      </View>
    );
  };

  const containerWidth = navigationState.screens.length * SCREEN_WIDTH;
  const screenOffset = Animated.add(Animated.add(overlaySlide, slideAnim), gestureX);

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
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!navigationState.isTransitioning}
      >
        <Animated.View 
          style={[
            styles.screensContainer,
            {
              width: containerWidth,
              transform: [{ translateX: screenOffset }]
            }
          ]}
        >
          {navigationState.screens.map(renderScreen)}
        </Animated.View>
      </PanGestureHandler>

      {/* Connection Lines Overlay - Temporarily disabled */}
      {/* <ConnectionLineRenderer
        connections={navigationState.activeConnections}
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
  pageScrollView: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
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
});

export default DynamicFeedNavigator;
