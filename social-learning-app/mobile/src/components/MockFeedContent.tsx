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
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { SimpleTile } from './SimpleTile';
import { useSessionStore } from '../stores/sessionStore';
import { ResearchDashboard } from './ResearchDashboard';

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
  onQuestionClick: (question: string, e?: any) => void;
}

export const MockFeedContent: React.FC<Props> = ({ onOpenAlgorithmSettings, onScroll, onQuestionClick }) => {
  const { isResearchDashboardOpen, openResearchDashboard, closeResearchDashboard } = useSessionStore();
  const [loading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroLocked, setHeroLocked] = useState(false);
  const [hasEngagedWithContent, setHasEngagedWithContent] = useState(false);
  const heroLockedRef = useRef(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Slow drifting glow around the hero search bar
  const glowX = useRef(new Animated.Value(0)).current;
  const glowY = useRef(new Animated.Value(0)).current;
  // Fade-in animation for tiles after refresh completes
  const NUM_TILES = 10;
  const fadeInAnims = useRef(Array.from({ length: NUM_TILES }, () => new Animated.Value(1))).current;
  const scrollViewRef = useRef<any>(null);
  const screenWidth = Dimensions.get('window').width;
  const CONTENT_ENGAGEMENT_THRESHOLD = 400;
  const TILES_START_POSITION = 350;
  const HEADER_HEIGHT = 45;
  const REFRESH_OFFSET = HEADER_HEIGHT;

  const headerProgress = scrollY.interpolate({
    inputRange: [150, 250],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  const headerTranslateY = headerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
    extrapolate: 'clamp',
  });

  const tilesAppearOpacity = scrollY.interpolate({
    inputRange: [140, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const tilesTranslateY = scrollY.interpolate({
    inputRange: [0, 150, 250],
    outputRange: [100, 50, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    console.log('🚀 MockFeedContent mounted - Initial state:');
    console.log('  Hero locked:', heroLocked);
    console.log('  Tiles start position:', TILES_START_POSITION);
    console.log('  Engagement threshold:', CONTENT_ENGAGEMENT_THRESHOLD);
    
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

    startBounce();

    return () => {
      scrollY.removeListener(listener);
      bounceAnim.stopAnimation();
    };
  }, []);

  // Start/stop slow drifting glow when hero overlay is visible
  useEffect(() => {
    let loopX: Animated.CompositeAnimation | null = null;
    let loopY: Animated.CompositeAnimation | null = null;
    const start = () => {
      loopX = Animated.loop(
        Animated.sequence([
          Animated.timing(glowX, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glowX, { toValue: -1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loopY = Animated.loop(
        Animated.sequence([
          Animated.timing(glowY, { toValue: -1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glowY, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loopX.start();
      loopY.start();
    };
    const stop = () => {
      loopX?.stop();
      loopY?.stop();
    };
    if (!heroLocked && !refreshing) start(); else stop();
    return stop;
  }, [heroLocked, refreshing, glowX, glowY]);

  // Trigger staggered fade-in when a refresh completes
  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !refreshing) {
      fadeInAnims.forEach(v => v.setValue(0));
      Animated.stagger(
        40,
        fadeInAnims.map(v =>
          Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true })
        )
      ).start();
    }
    prevRefreshing.current = refreshing;
  }, [refreshing]);

  // Maintain visual position when hero locks by compensating removed top padding
  useEffect(() => {
    if (heroLocked) {
      requestAnimationFrame(() => {
        const currentY = (scrollY as any)?._value ?? 0;
        // When we remove the hero gap (top padding), shift scroll up by that amount
        const targetY = Math.max(0, currentY - TILES_START_POSITION);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
      });
    }
  }, [heroLocked]);

  const onRefresh = async () => {
    console.log('🔄 REFRESH TRIGGERED!');
    console.log('📍 Hero locked state:', heroLocked);
    console.log('📊 Current scroll position:', (scrollY as any)._value || 'unknown');
    
    setRefreshing(true);
    
    if (heroLocked) {
      console.log('🔒 Refreshing in LOCKED mode - Loading new content...');
      setTimeout(() => {
        console.log('✅ New content loaded! Positioning at tiles...');
        setRefreshing(false);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 1500);
    } else {
      console.log('🔓 Refreshing in HERO mode - Standard refresh...');
      setTimeout(() => {
        console.log('✅ Standard refresh complete!');
        setRefreshing(false);
      }, 1500);
    }
  };

  const handleSearch = () => {
    console.log('🔍 Search query:', searchQuery);
  };

  // Smooth hero lock detection without per-frame React state churn
  useEffect(() => {
    const sub = scrollY.addListener(({ value }) => {
      if (!heroLockedRef.current && value > CONTENT_ENGAGEMENT_THRESHOLD) {
        heroLockedRef.current = true;
        setHeroLocked(true);
        setHasEngagedWithContent(true);
      }
    });
    return () => {
      scrollY.removeListener(sub);
    };
  }, [scrollY]);

  return (
    <>
      {/* Fixed Header Container */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            opacity: heroLocked ? 1 : headerProgress,
            transform: [{
              translateY: heroLocked ? 0 : headerTranslateY
            }],
          }
        ]}
        pointerEvents={heroLocked ? 'auto' : 'none'}
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

      {/* Always-visible floating hamburger */}
      <Animated.View 
        style={[
          styles.floatingHamburger,
          { opacity: 1 }
        ]}
      >
        <TouchableOpacity 
          style={styles.hamburgerButton} 
          onPress={() => {
            console.log('🍔 Opening Research Dashboard');
            openResearchDashboard();
          }}
        >
          <Ionicons name="menu-outline" size={30} color="#6b7280" />
        </TouchableOpacity>
      </Animated.View>

      {/* Hero Overlay - Hidden when hero is locked or refreshing */}
      {(!heroLocked && !refreshing) && (
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
          {/* Wrapper that moves with the search bar; contains a local glow gradient */}
          <Animated.View 
            style={[
              styles.searchBarWrapper,
              {
                transform: [
                  { translateY: scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -300], extrapolate: 'clamp' }) },
                  { translateX: scrollY.interpolate({ inputRange: [200, 300], outputRange: [0, 64], extrapolate: 'clamp' }) },
                ],
              }
            ]}
          >
            {/* Localized glow behind the search bar only, slowly drifting */}
            <AnimatedLinearGradient
              pointerEvents="none"
              colors={[
                'rgba(4, 219, 235, 0.00)',
                'rgba(4, 219, 235, 0.18)',
                'rgba(4, 219, 235, 0.00)'
              ]}
              locations={[0.1, 0.5, 0.9]}
              start={{ x: 0.5, y: 0.0 }}
              end={{ x: 0.5, y: 1 }}
              style={[
                styles.searchBarGlow,
                {
                  transform: [
                    // Favor vertical drift; keep horizontal subtle
                    { translateX: glowX.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
                    { translateY: glowY.interpolate({ inputRange: [-1, 1], outputRange: [-22, 22] }) },
                  ],
                },
              ]}
            />
            <View style={styles.searchBar}>
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
            </View>
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
      )}

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (!heroLocked && !refreshing) ? TILES_START_POSITION : 0 }
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        bounces={true}
        removeClippedSubviews={true}
        contentInsetAdjustmentBehavior="never"
        // Trim noisy logs to reduce JS load during scroll
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="rgb(4, 219, 235)"
            progressViewOffset={REFRESH_OFFSET}
          />
        }
      >
        {/* Content Area */}
        <View style={styles.contentSection}>
          {/* Tiles container with appearance animation */}
          <Animated.View 
            style={{
              transform: [{ translateY: (heroLocked || refreshing) ? 0 : tilesTranslateY }],
              opacity: (heroLocked || refreshing) ? 1 : tilesAppearOpacity,
              paddingBottom: 100,
            }}
          >
            {/* Content status indicator */}
            <View style={{ marginBottom: 20, paddingHorizontal: 16 }}>
              <Text style={{ color: '#6b7280', fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                {refreshing 
                  ? '🔄 Loading fresh content...' 
                  : hasEngagedWithContent 
                    ? '✨ Your personalized feed' 
                    : '👇 Scroll to discover'}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                Hero: {heroLocked ? 'Locked' : 'Visible'} | Refreshing: {refreshing ? 'Yes' : 'No'}
              </Text>
            </View>
            
            {Array.from({ length: 10 }).map((_, i) => {
              const tileDelay = i * 30;
              const tileOpacity = scrollY.interpolate({
                inputRange: [140 + tileDelay, 180 + tileDelay],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View 
                  key={`feed-tile-${i}`}
                  style={{ 
                    opacity: (heroLocked || refreshing)
                      ? fadeInAnims[i]
                      : Animated.multiply(
                          Animated.multiply(tilesAppearOpacity, tileOpacity),
                          fadeInAnims[i]
                        ),
                    marginBottom: i === 9 ? 40 : 0,
                  }}
                >
                  <SimpleTile loading={refreshing} onQuestionClick={onQuestionClick as any} />
                </Animated.View>
              );
            })}
          </Animated.View>

          <View style={styles.experimentalArea}>
            <Text style={styles.placeholderTitle}>🚀 Experimental Content Area</Text>
            <Text style={styles.placeholderSubtitle}>
              This is your clean canvas to try new content loading approaches
            </Text>
            
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

            {loading && (
              <View style={styles.loadingArea}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Generating extraordinary content...</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Research Dashboard */}
      <ResearchDashboard
        isVisible={isResearchDashboardOpen}
        onClose={closeResearchDashboard}
      />
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 350,
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
    paddingTop: 20,
    position: 'relative',
    minHeight: Dimensions.get('window').height * 1.5,
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
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 150,
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
    // Bring back the brand glow softly for the intro
    shadowColor: 'rgb(4, 219, 235)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 44,
    elevation: 8,
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
  // Wrapper to host the search bar and its animated glow
  searchBarWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 350,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  // Localized gradient glow that drifts around the search bar
  searchBarGlow: {
    position: 'absolute',
    top: -28,
    left: -28,
    right: -28,
    bottom: -28,
    borderRadius: 32,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 45,
    zIndex: 199,
    backgroundColor: 'white',
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

export default MockFeedContent;
