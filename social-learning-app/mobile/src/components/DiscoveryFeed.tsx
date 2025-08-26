import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  ViewToken,
} from 'react-native';
import { hackerNewsService } from '../services/api';
import { AlgorithmPreferences, HackerNewsStory } from '../types';
import { SkeletonFeedList } from './SkeletonLoader';
import { ScrollDiscoveryFeedItem } from './ScrollDiscoveryFeedItem';
import { GenerativeRefreshControl, GenerationIndicator } from './GenerativeRefreshControl';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 150;

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
  discoveryMode?: 'typewriter' | 'wordReveal' | 'lineReveal' | 'sparkle';
}

export const DiscoveryFeed: React.FC<Props> = ({ 
  onOpenAlgorithmSettings, 
  onScroll,
  discoveryMode = 'typewriter' 
}) => {
  const [feedItems, setFeedItems] = useState<HackerNewsStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGenerationIndicator, setShowGenerationIndicator] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    console.log('📱 DiscoveryFeed: Starting to load HackerNews feed data');
    setShowGenerationIndicator(true);
    
    try {
      console.log('📡 DiscoveryFeed: Making API call for HackerNews stories');
      const feedData = await hackerNewsService.getTopStories(50);
      
      console.log('📊 DiscoveryFeed: Received HackerNews stories:', feedData?.stories?.length || 0, 'items');
      
      const stories = feedData.stories || [];
      setFeedItems(stories);
      
    } catch (error) {
      console.error('❌ DiscoveryFeed: Error loading HackerNews feed:', error);
      Alert.alert('Error', 'Failed to load HackerNews stories.');
      setFeedItems([]);
    } finally {
      setLoading(false);
      setTimeout(() => setShowGenerationIndicator(false), 1500);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setShowGenerationIndicator(true);
    
    try {
      console.log('📱 DiscoveryFeed: Syncing HackerNews data...');
      await hackerNewsService.syncStories();
      console.log('📱 DiscoveryFeed: Sync complete, loading fresh stories...');
      
      const feedData = await hackerNewsService.getTopStories(50);
      const stories = feedData.stories || [];
      
      setFeedItems(stories);
      setVisibleItems(new Set());
      
    } catch (error) {
      console.error('❌ DiscoveryFeed: Error during refresh:', error);
      await loadFeed();
    } finally {
      setRefreshing(false);
      setTimeout(() => setShowGenerationIndicator(false), 800);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const newVisibleItems = new Set<string>();
    viewableItems.forEach(item => {
      if (item.isViewable && item.item) {
        newVisibleItems.add(item.item.id.toString());
      }
    });
    setVisibleItems(newVisibleItems);
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 100,
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        onScroll?.();
      },
    }
  );

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderFeedItem = ({ item, index }: { item: HackerNewsStory; index: number }) => {
    return (
      <ScrollDiscoveryFeedItem
        item={item}
        index={index}
        scrollY={scrollY}
        itemOffset={index * ITEM_HEIGHT}
        itemHeight={ITEM_HEIGHT}
        discoveryMode={discoveryMode}
      />
    );
  };

  const keyExtractor = useCallback((item: HackerNewsStory) => `discovery-${item.id}`, []);

  if (loading) {
    return (
      <View style={styles.container}>
        {showGenerationIndicator && (
          <GenerationIndicator 
            visible={true} 
            text="🔍 Discovering personalized content..." 
          />
        )}
        <SkeletonFeedList itemCount={8} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GenerationIndicator 
        visible={showGenerationIndicator}
        text={refreshing ? "🌟 Generating fresh discoveries..." : "🔍 AI is discovering content for you..."}
      />
      
      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <GenerativeRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            generatingText="🔍 Discovering fresh content..."
          />
        }
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>No discoveries yet</Text>
              <Text style={styles.emptyStateDescription}>
                Pull down to refresh and discover fresh content!
              </Text>
            </View>
          ) : null
        }
      />

      {/* Discovery Mode Indicator */}
      <View style={styles.discoveryModeIndicator}>
        <Text style={styles.discoveryModeText}>
          {discoveryMode === 'typewriter' && '⌨️ Typewriter Mode'}
          {discoveryMode === 'wordReveal' && '📝 Word Reveal'}
          {discoveryMode === 'lineReveal' && '📄 Line Reveal'}
          {discoveryMode === 'sparkle' && '✨ Sparkle Mode'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  feedContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  discoveryModeIndicator: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discoveryModeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});