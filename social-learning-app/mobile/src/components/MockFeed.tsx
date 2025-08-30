import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SimpleTile } from './SimpleTile';
import { DynamicFeedNavigator } from './navigation/DynamicFeedNavigator';

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
}

export const MockFeed: React.FC<Props> = ({ onOpenAlgorithmSettings, onScroll }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0 = tiles, 1 = AI answer
  const [initialQuestionIntent, setInitialQuestionIntent] = useState<{
    question: string;
    fromPageX: number;
    fromPageY: number;
  } | null>(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current; // Start at page 0 (tiles)
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const headerProgress = scrollY.interpolate({
    inputRange: [150, 250],  // Header appears after hero text is gone
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Hero overlay fade (reveals tiles beneath almost immediately)
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // Header slide-in animation (starts off-screen, slides down)
  const headerTranslateY = headerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],  // Header slides down from above
    extrapolate: 'clamp',
  });

  // Content appears after hero leaves, starting from header position
  // Content opacity: only show after hero text is mostly gone
  const tilesAppearOpacity = scrollY.interpolate({
    inputRange: [140, 160],  // Quick fade right after hero text (which ends at 150)
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Calculate when all tiles are done generating (last tile at index 9)
  const lastTileDelay = 9 * 30; // 9th tile (0-indexed) with 30ms delays
  const generationCompleteAt = 180 + lastTileDelay; // 180 + 270 = 450px scroll
  
  // Sticky behavior during generation, then release
  const tilesCounterScroll = scrollY.interpolate({
    inputRange: [0, 450, 550],  // Stick until 450px (all tiles done), then gradually release
    outputRange: [0, -450, -450],  // Stay at top during generation, then stop counter-scrolling
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const startBounce = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const stopBounce = () => {
      bounceAnim.stopAnimation();
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    const listener = scrollY.addListener(({ value }) => {
      if (value > 10) {
        stopBounce();
      } else {
        startBounce();
      }
    });

    startBounce(); // Start bouncing initially

    return () => {
      scrollY.removeListener(listener);
      bounceAnim.stopAnimation();
    };
  }, []);

  const handleQuestionClick = (question: string, e?: any) => {
    // Expand into dynamic navigator and forward the originating touch
    if (e?.nativeEvent) {
      setInitialQuestionIntent({
        question,
        fromPageX: e.nativeEvent.pageX,
        fromPageY: e.nativeEvent.pageY,
      });
    } else {
      setInitialQuestionIntent({ question, fromPageX: screenWidth / 2, fromPageY: 200 });
    }
    setIsExpanded(true);
  };

  const handlePageSwipe = (page: number) => {
    setCurrentPage(page);
    Animated.timing(slideAnim, {
      toValue: page === 0 ? 0 : -screenWidth, // page 0 = show tiles, page 1 = show AI answer
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: gestureX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const threshold = screenWidth * 0.25; // 25% of screen width
      
      let targetPage = currentPage;
      
      // Determine target page based on swipe distance and velocity
      if (translationX > threshold || velocityX > 500) {
        // Swipe right - go to previous page (tiles)
        targetPage = 0;
      } else if (translationX < -threshold || velocityX < -500) {
        // Swipe left - go to next page (AI answer)
        targetPage = 1;
      }
      
      // Reset gesture value
      gestureX.setValue(0);
      
      // Animate to target page
      if (targetPage !== currentPage) {
        handlePageSwipe(targetPage);
      } else {
        // Spring back to current page
        Animated.spring(slideAnim, {
          toValue: currentPage === 0 ? 0 : -screenWidth,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearch = () => {
    console.log('🔍 Search query:', searchQuery);
    // Add your search logic here
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
    setIsScrolled(offsetY > 10);
    onScroll?.();
  };

  return (
    <LinearGradient
      colors={[
        'rgba(139, 174, 211, 0.015)', // Extremely light center
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
      {/* Content Mask - prevents content from showing through header area */}
      <View style={styles.contentMask} pointerEvents="none" />
      
      {/* Fixed Header Container */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            opacity: headerProgress,
            transform: [{
              translateY: headerTranslateY
            }],
          }
        ]}
        pointerEvents={isScrolled ? 'auto' : 'none'}
      >
        {/* Search Bar */}
        <View style={styles.fixedSearchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ask Anything"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6b7280"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Image 
              source={require('../../assets/Betterment.png')} 
              style={styles.searchIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Always-visible floating hamburger (top-left) */}
      <Animated.View 
        style={[
          styles.floatingHamburger,
          { opacity: 1 }
        ]}
      >
        <TouchableOpacity style={styles.hamburgerButton} onPress={onOpenAlgorithmSettings}>
          <Ionicons name="menu-outline" size={30} color="#6b7280" />
        </TouchableOpacity>
      </Animated.View>


      {/* Hero Overlay (visual only, does not push content) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroOverlay,
          { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
        ]}
      >
        <View style={styles.searchHeaderSection}>
          <Animated.Text 
            style={[
              styles.searchTitle,
              {
                opacity: scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp' }),
                transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) }],
              }
            ]}
          >
            Type to Create
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.searchSubtitle,
              {
                opacity: scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp' }),
                transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) }],
              }
            ]}
          >
            Scroll to Generate
          </Animated.Text>
          <Animated.View 
            style={[
              styles.searchBar,
              {
                transform: [
                  { translateY: scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -300], extrapolate: 'clamp' }) },
                  { translateX: scrollY.interpolate({ inputRange: [200, 300], outputRange: [0, 64], extrapolate: 'clamp' }) },
                ],
              }
            ]}
          >
            <TextInput
              style={styles.searchInput}
              placeholder="Ask Anything."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#6b7280"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
              <Image source={require('../../assets/Betterment.png')} style={styles.searchIcon} resizeMode="contain" />
            </TouchableOpacity>
          </Animated.View>

          {/* Scroll indicator */}
          <Animated.View 
            style={[
              styles.scrollIndicator,
              { opacity: scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0], extrapolate: 'clamp' }) },
            ]}
          >
            <Animated.View 
              style={[
                styles.scrollCircle,
                { transform: [{ translateY: bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] },
              ]}
            >
              <Animated.View style={{ transform: [{ translateY: bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] }}>
                <Ionicons name="arrow-down" size={16} color="#9ca3af" />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: true,
            listener: handleScroll
          }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero moved to overlay above. Scroll content begins near top. */}

        {/* Dynamic Feed Navigator - Handles multiple screens and connections */}
        {isExpanded && (
          <View style={styles.dynamicNavigatorContainer}>
            <DynamicFeedNavigator initialQuestionIntent={initialQuestionIntent} />
          </View>
        )}

        {/* Removed fixed top tile overlay to make tiles fully scrollable */}


        {/* Content Area - Example feed list */}
        <View style={styles.contentSection}>
          {/* Example list of feed items */}
          {/* Tiles container with sticky behavior during generation */}
          <Animated.View 
            style={{
              transform: [{ translateY: tilesCounterScroll }],
              paddingBottom: 100, // Extra space so users see tiles aren't cut off
            }}
          >
            {/* Visual indicator that content is generating */}
            <Animated.View 
              style={{
                opacity: scrollY.interpolate({
                  inputRange: [140, 180, 450, 470],
                  outputRange: [0, 1, 1, 0], // Show during generation, hide after
                  extrapolate: 'clamp',
                }),
                marginBottom: 20,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>
                
              </Text>
            </Animated.View>
            
            {Array.from({ length: 10 }).map((_, i) => {
              // Create staggered opacity for each tile
              const tileDelay = i * 30; // 30ms delay between each tile
              const tileOpacity = scrollY.interpolate({
                inputRange: [140 + tileDelay, 180 + tileDelay],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View 
                  key={`feed-tile-${i}`}
                  style={{ 
                    opacity: Animated.multiply(tilesAppearOpacity, tileOpacity),
                    marginBottom: i === 9 ? 40 : 0, // Extra space after last tile
                  }}
                >
                  <SimpleTile onQuestionClick={handleQuestionClick as any} />
                </Animated.View>
              );
            })}
          </Animated.View>

          <View style={styles.experimentalArea}>
            <Text style={styles.placeholderTitle}>🚀 Experimental Content Area</Text>
            <Text style={styles.placeholderSubtitle}>
              This is your clean canvas to try new content loading approaches
            </Text>
            
            {/* Example experimental areas you can try */}
            <View style={styles.experimentZone}>
              <Text style={styles.zoneTitle}>💡 Try Different UX Patterns:</Text>
              <View style={styles.suggestionList}>
                <Text style={styles.suggestion}>• Floating action bubbles</Text>
                <Text style={styles.suggestion}>• Magnetic content clustering</Text>
                <Text style={styles.suggestion}>• Progressive disclosure cards</Text>
                <Text style={styles.suggestion}>• Gesture-based navigation</Text>
                <Text style={styles.suggestion}>• Dynamic content morphing</Text>
                <Text style={styles.suggestion}>• AI-guided content flow</Text>
              </View>
            </View>

            {/* Loading state for testing */}
            {loading && (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Generating extraordinary content...</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 150,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 510, // Increased to account for full sticky generation phase
  },
  searchHeaderSection: {
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: -100,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 100, // More space below header for generation
    position: 'relative',
    minHeight: Dimensions.get('window').height * 2, // Ensure scrollability
  },
  floatingHamburger: {
    position: 'absolute',
    top: 8,
    left: 10,
    zIndex: 220,
  },
  hamburgerButton: {
    width: 35,
    height: 35,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchTitle: {
    fontSize: 22,
    fontFamily: 'Devoid',
    fontWeight: 'bold',
    color: '#9ca3af',
    marginBottom: 5,
    textAlign: 'center',
  },
  searchSubtitle: {
    fontSize: 22,
    fontFamily: 'Devoid',
    fontWeight: 'bold',
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: 'rgb(4, 219, 235)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 90,
    elevation: 12,
    width: '100%',
    maxWidth: 350,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
    marginRight: 15,
  },
  searchButton: {
    width: 40,
    height: 33,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  searchIcon: {
    width: 24,
    height: 24,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scrollCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 45,
    zIndex: 199,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  contentMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'white',
    zIndex: 198,
  },
  fixedHamburgerButton: {
    width: 30,
    height: 30,
    borderRadius: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fixedSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 35,
  },
  fixedTopTile: {
    position: 'absolute',
    top: 0, // Will be controlled by translateY
    left: 16,
    right: 16,
    zIndex: 100,
  },
  
  // Dynamic Navigator Container
  dynamicNavigatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  // Experimental content area styles
  experimentalArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  experimentZone: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionList: {
    gap: 8,
  },
  suggestion: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  loadingArea: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default MockFeed;
