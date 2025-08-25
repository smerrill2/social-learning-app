import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { hackerNewsService } from '../services/api';
import { AlgorithmPreferences, HackerNewsStory } from '../types';

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
}

export const Feed: React.FC<Props> = ({ onOpenAlgorithmSettings, onScroll }) => {
  const [feedItems, setFeedItems] = useState<HackerNewsStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<AlgorithmPreferences | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    console.log('📱 Feed: Starting to load HackerNews feed data');
    try {
      console.log('📡 Feed: Making API call for HackerNews stories');
      const feedData = await hackerNewsService.getTopStories(50);
      
      console.log('📊 Feed: Received HackerNews stories:', feedData?.stories?.length || 0, 'items');
      
      setFeedItems(feedData.stories || []);
    } catch (error) {
      console.error('❌ Feed: Error loading HackerNews feed:', error);
      Alert.alert('Error', 'Failed to load HackerNews stories.');
      
      // Fallback to empty state
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // First sync HackerNews to get latest stories
      console.log('📱 Feed: Syncing HackerNews data...');
      await hackerNewsService.syncStories();
      console.log('📱 Feed: Sync complete, loading fresh stories...');
      
      // Then load the updated feed
      await loadFeed();
    } catch (error) {
      console.error('❌ Feed: Error during refresh:', error);
      // Still try to load feed even if sync fails
      await loadFeed();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePreferencesChanged = (newPreferences: AlgorithmPreferences) => {
    setPreferences(newPreferences);
    // Refresh feed with new preferences
    onRefresh();
  };

  const handleOpenSettings = () => {
    onOpenAlgorithmSettings?.();
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  // Insights rendering removed - showing only HackerNews stories

  const renderHackerNewsStory = (item: HackerNewsStory) => (
    <TouchableOpacity 
      style={styles.storyCard}
      onPress={() => item.url && openUrl(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.storyHeader}>
        <View style={styles.hnLogo}>
          <Text style={styles.hnLogoText}>HN</Text>
        </View>
        <View style={styles.storyMeta}>
          <Text style={styles.storyAuthor}>by {item.by}</Text>
          <Text style={styles.storyTime}>{item.timeAgo}</Text>
        </View>
      </View>
      
      <Text style={styles.storyTitle}>{item.title}</Text>
      
      {item.domain && (
        <Text style={styles.storyDomain}>{item.domain}</Text>
      )}
      
      <View style={styles.storyFooter}>
        <Text style={styles.storyStats}>
          ⬆️ {item.score} points • 💬 {item.descendants} comments
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Research paper rendering removed - showing only HackerNews stories

  const renderFeedItem = ({ item }: { item: HackerNewsStory }) => {
    return (
      <View style={styles.feedItemContainer}>
        {renderHackerNewsStory(item)}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading HackerNews stories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Algorithm controls disabled for now - showing raw HackerNews */}
      {/* <FeedQuickControls 
        onPreferencesChanged={handlePreferencesChanged}
        onOpenSettings={handleOpenSettings}
      /> */}
      
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📰</Text>
              <Text style={styles.emptyStateTitle}>No HackerNews stories available</Text>
              <Text style={styles.emptyStateDescription}>
                Pull down to refresh and load the latest stories from HackerNews.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  feedContainer: {
    padding: 16,
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  insightContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  bookInfo: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  pageReference: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  engagementBar: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  engagementText: {
    fontSize: 12,
    color: '#6b7280',
  },
  storyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#ff6600',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hnLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ff6600',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hnLogoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  storyMeta: {
    flex: 1,
  },
  storyAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  storyTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 8,
  },
  storyDomain: {
    fontSize: 12,
    color: '#3b82f6',
    marginBottom: 12,
  },
  storyFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  storyStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  researchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  researchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  researchLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  researchLogoText: {
    fontSize: 16,
  },
  researchMeta: {
    flex: 1,
  },
  researchSource: {
    fontSize: 12,
    color: '#6b7280',
  },
  relevanceScore: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  researchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 6,
  },
  researchAuthors: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  researchAbstract: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  researchCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  researchCategory: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  researchCategoryText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  feedItemContainer: {
    marginBottom: 8,
  },
  algorithmInsights: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
  },
  reasonText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  categoryTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  categoryTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#3730a3',
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
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
});