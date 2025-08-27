import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { contentService, sessionService } from '../services/api';

type PackItem = {
  id: string | number;
  source: 'research' | 'hackernews' | 'insight';
  title: string;
  tldr?: string;
  whyItMatters?: string;
  readingMinutes?: number;
  url?: string;
  domain?: string | null;
  author?: string | string[];
  publishedAt?: string;
};

export const DailyPack: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pack, setPack] = useState<{ date: string; topic: string; items: PackItem[] } | null>(null);

  // Header animation state (mirrors Feed.tsx)
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerProgress = scrollY.interpolate({ inputRange: [200, 240], outputRange: [0, 1], extrapolate: 'clamp' });
  
  // Logo spin animation
  const logoSpin = useRef(new Animated.Value(0)).current;
  const tileAnimations = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    loadPack();
    startLogoAnimations();
  }, []);

  useEffect(() => {
    if (pack?.items && tileAnimations.length === 0) {
      // Initialize tile animations
      for (let i = 0; i < pack.items.length; i++) {
        tileAnimations[i] = new Animated.Value(0);
      }
    }
  }, [pack]);

  const startLogoAnimations = () => {
    // Continuous gentle rotation like a slow loading spinner
    Animated.loop(
      Animated.timing(logoSpin, {
        toValue: 1,
        duration: 8000, // 8 seconds for one full rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const animateTileOnScroll = (index: number, scrollY: Animated.Value) => {
    // Slower, more natural reveal animation
    const baseOffset = 300; 
    const staggerDelay = 40; // Slower stagger
    const animationDuration = 200; // Longer animation window
    
    return {
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [0, baseOffset + (index * staggerDelay), baseOffset + (index * staggerDelay) + animationDuration, 9999],
            outputRange: [30, 30, 0, 0], // Gentle reveal from below
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollY.interpolate({
            inputRange: [0, baseOffset + (index * staggerDelay), baseOffset + (index * staggerDelay) + animationDuration, 9999],
            outputRange: [0.95, 0.95, 1, 1], // Subtle scale up
            extrapolate: 'clamp',
          }),
        },
      ],
      opacity: scrollY.interpolate({
        inputRange: [0, baseOffset + (index * staggerDelay), baseOffset + (index * staggerDelay) + animationDuration, 9999],
        outputRange: [0, 0, 1, 1],
        extrapolate: 'clamp',
      }),
    };
  };

  const loadPack = async () => {
    try {
      const res = await sessionService.getPack();
      setPack(res);
    } catch (e) {
      console.error('Failed to load daily pack', e);
      Alert.alert('Error', 'Failed to load your daily pack.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPack();
    } finally {
      setRefreshing(false);
    }
  };

  const openUrl = async (url?: string) => {
    if (!url) return;
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
  };

  const sendFeedback = async (item: PackItem, action: 'save' | 'more' | 'less' | 'skip') => {
    try {
      await contentService.sendFeedback(item.id, item.source, action);
    } catch (e) {
      // non-blocking
    }
  };

  const renderTile = (item: PackItem, index: number) => {
    return (
      <Animated.View 
        key={`${item.source}-${item.id}-${index}`} 
        style={[
          styles.card,
          animateTileOnScroll(index, scrollY),
        ]}
      >
        {/* Header meta */}
        <View style={styles.cardHeader}>
          <View style={[styles.logo, item.source === 'hackernews' ? styles.hn : item.source === 'research' ? styles.research : styles.insight]}>
            <Text style={styles.logoText}>
              {item.source === 'hackernews' ? 'HN' : item.source === 'research' ? 'RX' : '💡'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {!!item.domain && <Text style={styles.domain}>{item.domain}</Text>}
            {!!item.readingMinutes && <Text style={styles.metaSm}>{item.readingMinutes} min</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* TL;DR */}
        {!!item.tldr && <Text style={styles.tldr} numberOfLines={6}>{item.tldr}</Text>}

        {/* Why it matters */}
        {!!item.whyItMatters && <Text style={styles.why}>{item.whyItMatters}</Text>}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => sendFeedback(item, 'save')} style={styles.actionBtn}>
            <Ionicons name="bookmark-outline" size={18} color="#3b82f6" />
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => sendFeedback(item, 'more')} style={styles.actionBtn}>
            <Ionicons name="add-outline" size={18} color="#10b981" />
            <Text style={styles.actionText}>More</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => sendFeedback(item, 'less')} style={styles.actionBtn}>
            <Ionicons name="remove-outline" size={18} color="#ef4444" />
            <Text style={styles.actionText}>Less</Text>
          </TouchableOpacity>
          {!!item.url && (
            <TouchableOpacity onPress={() => openUrl(item.url)} style={styles.actionBtn}>
              <Image source={require('../../assets/Betterment.png')} style={styles.linkIcon} />
              <Text style={styles.actionText}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your daily pack…</Text>
      </View>
    );
  }

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
      {/* Fixed Header (mirrors Feed fixed header) */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            opacity: headerProgress,
            transform: [{ translateY: headerProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0], extrapolate: 'clamp' }) }],
          },
        ]}
        pointerEvents={'auto'}
      >
        {/* Menu */}
        <TouchableOpacity style={styles.fixedHamburgerButton}>
          <Ionicons name="menu-outline" size={30} color="#6b7280" />
        </TouchableOpacity>
        {/* Fixed search bar shell to match look */}
        <View style={styles.fixedSearchBar}>
          <Text style={styles.fixedSearchText}>Ask Anything.</Text>
          <Image source={require('../../assets/Betterment.png')} style={styles.searchIcon} />
        </View>
      </Animated.View>

      {/* Scroll content with hero header first, then tiles */}
      <Animated.ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero header - Daily Picks */}
        <View style={styles.heroSection}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp' }),
                transform: [
                  { translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) },
                ],
              },
            ]}
          >
            <Animated.Image 
              source={require('../../assets/Betterment.png')} 
              style={[
                styles.heroLogo,
                {
                  transform: [
                    {
                      rotate: logoSpin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>

          <Animated.Text
            style={[
              styles.dailyPicksTitle,
              {
                opacity: scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp' }),
                transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) }],
              },
            ]}
          >
            Your Daily Picks
          </Animated.Text>
          <Animated.Text
            style={[
              styles.scrollHint,
              {
                opacity: scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp' }),
                transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -50], extrapolate: 'clamp' }) }],
              },
            ]}
          >
            Scroll to Generate
          </Animated.Text>
        </View>

        {/* Tiles container; sits right under the fixed header once locked */}
        <View style={styles.tilesContainer}>
          {pack?.items?.map(renderTile)}
          {(!pack || pack.items.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>No items today</Text>
              <Text style={styles.emptyStateDescription}>Pull to refresh and try again.</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Fixed header to match Feed feel
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 199,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  fixedHamburgerButton: { width: 30, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fixedSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fixedSearchText: { flex: 1, fontSize: 14, color: '#6b7280' },
  searchIcon: { width: 18, height: 18 },

  // Hero section for Daily Picks
  heroSection: { 
    height: 575, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    marginTop: 90,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLogo: { 
    width: 100, 
    height: 100,
    marginBottom: 5,
  },
  dailyPicksTitle: { 
    fontSize: 30, 
    fontFamily: 'Devoid', 
    fontWeight: 'bold', 
    color: '#1f2937', 
    marginBottom: 10, 
    textAlign: 'center',
  },
  scrollHint: { 
    fontSize: 12, 
    fontFamily: 'Devoid', 
    fontWeight: '600', 
    color: '#9ca3af', 
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Tiles
  tilesContainer: { 
    paddingHorizontal: 16, 
    paddingTop: 8,
    marginTop: -30, // Pull tiles up slightly
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  hn: { backgroundColor: '#ff6600' },
  research: { backgroundColor: '#10b981' },
  insight: { backgroundColor: '#3b82f6' },
  logoText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  domain: { fontSize: 12, color: '#3b82f6' },
  metaSm: { fontSize: 11, color: '#6b7280' },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', lineHeight: 22, marginBottom: 8 },
  tldr: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 10 },
  why: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  actionText: { marginLeft: 4, color: '#6b7280', fontSize: 12, fontWeight: '600' },
  linkIcon: { width: 18, height: 18 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  emptyStateDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});

export default DailyPack;

