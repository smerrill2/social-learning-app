import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hackerNewsService, learningService } from '../services/api';
import { AlgorithmPreferences, HackerNewsStory } from '../types';

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
}

export const Feed: React.FC<Props> = ({ onOpenAlgorithmSettings, onScroll }) => {
  const [feedItems, setFeedItems] = useState<HackerNewsStory[]>([]);
  const [learningRecommendations, setLearningRecommendations] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<AlgorithmPreferences | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // For demo purposes, using our seeded novice-learner user
  const currentUserId = 'novice-learner';
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerProgress = scrollY.interpolate({
    inputRange: [200, 240],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadFeed();
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    try {
      console.log('📚 Loading learning data for user:', currentUserId);
      
      // Load learning recommendations, progress, and achievements in parallel
      const [recommendations, progress, userAchievements] = await Promise.all([
        learningService.getRecommendations(currentUserId),
        learningService.getProgress(currentUserId),
        learningService.getAchievements(currentUserId)
      ]);
      
      console.log('📈 Learning recommendations:', recommendations);
      console.log('📊 User progress:', progress);
      console.log('🏆 Achievements:', userAchievements);
      
      setLearningRecommendations(recommendations || []);
      setUserProgress(progress);
      setAchievements(userAchievements || []);
      
    } catch (error) {
      console.error('❌ Error loading learning data:', error);
    }
  };


  const loadFeed = async () => {
    console.log('📱 Feed: Starting to load HackerNews feed data');
    try {
      console.log('📡 Feed: Making API call for HackerNews stories');
      const feedData = await hackerNewsService.getTopStories(50);
      
      console.log('📊 Feed: Received HackerNews stories:', feedData?.stories?.length || 0, 'items');
      
      const stories = feedData.stories || [];
      setFeedItems(stories);
      
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
      
      // Then load the updated feed and learning data
      await loadFeed();
      await loadLearningData();
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

  const handleSearch = () => {
    // Handle search functionality here if needed
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
    setIsScrolled(offsetY > 250);
    onScroll?.();
  };

  // Learning content rendering functions
  const renderLearningProgress = () => {
    if (!userProgress) return null;
    
    return (
      <View style={styles.learningProgressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressIcon}>
            <Text style={styles.progressIconText}>🧠</Text>
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Learning Journey</Text>
            <Text style={styles.progressLevel}>Level: {userProgress.currentLevel}</Text>
          </View>
        </View>
        
        <Text style={styles.progressScore}>Overall Progress: {userProgress.overallProgressScore}%</Text>
        
        {userProgress.nextMilestones && userProgress.nextMilestones.length > 0 && (
          <View style={styles.milestonesContainer}>
            <Text style={styles.milestonesTitle}>Next Milestone:</Text>
            {userProgress.nextMilestones.map((milestone, index) => (
              <Text key={index} style={styles.milestoneText}>
                📍 {milestone.skill} - {milestone.timeframe}
              </Text>
            ))}
          </View>
        )}
        
        <Text style={styles.motivationalText}>{userProgress.motivationalMessage}</Text>
      </View>
    );
  };

  const renderAchievement = (achievement) => (
    <View style={styles.achievementCard} key={achievement.id}>
      <View style={styles.achievementHeader}>
        <View style={styles.achievementBadge}>
          <Text style={styles.badgeEmoji}>🏆</Text>
        </View>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementName}>{achievement.achievement.name}</Text>
          <Text style={styles.achievementTier}>{achievement.achievement.tier} • {achievement.achievement.statusPoints} pts</Text>
        </View>
      </View>
      
      <Text style={styles.achievementDescription}>{achievement.achievement.description}</Text>
      
      <View style={styles.achievementFooter}>
        <Text style={styles.achievementDate}>
          Earned {new Date(achievement.earnedAt).toLocaleDateString()}
        </Text>
        <Text style={styles.rarityScore}>Rarity: {achievement.achievement.rarityScore}%</Text>
      </View>
    </View>
  );

  const renderLearningRecommendation = (recommendation) => (
    <TouchableOpacity 
      style={styles.recommendationCard}
      key={`${recommendation.contentId}-${recommendation.contentType}`}
      onPress={() => handleRecommendationPress(recommendation)}
      activeOpacity={0.7}
    >
      <View style={styles.recommendationHeader}>
        <View style={styles.learningLogo}>
          <Text style={styles.learningLogoText}>📚</Text>
        </View>
        <View style={styles.recommendationMeta}>
          <Text style={styles.recommendationType}>{recommendation.contentType}</Text>
          <Text style={styles.recommendationDifficulty}>
            {recommendation.difficulty} • {recommendation.estimatedTimeMinutes}min
          </Text>
        </View>
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>{recommendation.priorityLevel}</Text>
        </View>
      </View>
      
      <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
      
      <Text style={styles.recommendationReason}>{recommendation.whyRecommended}</Text>
      
      <View style={styles.recommendationFooter}>
        <Text style={styles.learningValue}>
          Learning Value: {recommendation.learningValue}/10
        </Text>
        <Text style={styles.relevanceScore}>
          Relevance: {Math.round(recommendation.relevanceScore * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleRecommendationPress = async (recommendation) => {
    try {
      // Track the learning activity
      await learningService.trackActivity(currentUserId, {
        contentId: recommendation.contentId,
        contentType: recommendation.contentType,
        timeSpent: Math.floor(Math.random() * 10) + 5, // Simulate time spent
        completed: true,
        skillsApplied: recommendation.skillsAddressed || []
      });
      
      Alert.alert(
        'Learning Activity Tracked! 📈',
        `You've engaged with "${recommendation.title}". This will help improve your recommendations and track your learning progress.`,
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (error) {
      console.error('Error tracking learning activity:', error);
    }
  };

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

      {!!item.summary && (
        <Text style={styles.storySummary} numberOfLines={8}>
          {item.summary}
        </Text>
      )}
      
      <View style={styles.storyFooter}>
        <Text style={styles.storyStats}>
          ⬆️ {item.score} points • 💬 {item.descendants} comments
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Research paper rendering removed - showing only HackerNews stories

  const renderFeedItem = ({ item, index }: { item: HackerNewsStory; index: number }) => {
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
      {/* Fixed Header Container */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            opacity: headerProgress,
            transform: [{
              translateY: headerProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
                extrapolate: 'clamp',
              })
            }],
          }
        ]}
        pointerEvents={isScrolled ? 'auto' : 'none'}
      >
        {/* Hamburger Menu */}
        <TouchableOpacity style={styles.fixedHamburgerButton}>
          <Ionicons name="menu-outline" size={30} color="#6b7280" />
        </TouchableOpacity>
        
        {/* Search Bar */}
        <View style={styles.fixedSearchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ask Anything."
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

      {/* Floating Hamburger Menu (for initial state) */}
      <Animated.View 
        style={[
          styles.floatingHamburger,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: [0.8, 1],
              extrapolate: 'clamp',
            }),
          }
        ]}
      >
        <TouchableOpacity style={styles.hamburgerButton}>
          <Ionicons name="menu-outline" size={30} color="#6b7280" />
        </TouchableOpacity>
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
        {/* Search Header Section - Takes up full screen height initially */}
        <View style={styles.searchHeaderSection}>
          <Animated.Text 
            style={[
              styles.searchTitle,
              {
                opacity: scrollY.interpolate({
                  inputRange: [0, 150],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: scrollY.interpolate({
                    inputRange: [0, 150],
                    outputRange: [0, -50],
                    extrapolate: 'clamp',
                  })
                }],
              }
            ]}
          >
            Type to Create
          </Animated.Text>
          <Animated.Text 
            style={[
              styles.searchSubtitle,
              {
                opacity: scrollY.interpolate({
                  inputRange: [0, 150],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateY: scrollY.interpolate({
                    inputRange: [0, 150],
                    outputRange: [0, -50],
                    extrapolate: 'clamp',
                  })
                }],
              }
            ]}
          >
            Scroll to Generate
          </Animated.Text>
          <Animated.View 
            style={[
              styles.searchBar,
              {
                transform: [{
                  translateY: scrollY.interpolate({
                    inputRange: [0, 300],
                    outputRange: [0, -350],
                    extrapolate: 'clamp',
                  })
                }, {
                  translateX: scrollY.interpolate({
                    inputRange: [200, 300],
                    outputRange: [0, 64],
                    extrapolate: 'clamp',
                  })
                }],
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
              <Image 
                source={require('../../assets/Betterment.png')} 
                style={styles.searchIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Scroll indicator */}
          <Animated.View 
            style={[
              styles.scrollIndicator,
              {
                opacity: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              }
            ]}
          >
            <View style={styles.scrollCircle}>
              <Ionicons name="arrow-down" size={16} color="#9ca3af" />
            </View>
          </Animated.View>
        </View>

        {/* Feed Content Section */}
        <View style={styles.feedSection}>
          {/* Learning Progress Section */}
          {renderLearningProgress()}
          
          {/* Recent Achievements */}
          {achievements.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
              {achievements.slice(0, 2).map((achievement) => renderAchievement(achievement))}
              {achievements.length > 2 && (
                <Text style={styles.seeMoreText}>+ {achievements.length - 2} more achievements</Text>
              )}
            </View>
          )}
          
          {/* Learning Recommendations */}
          {learningRecommendations.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>📚 Recommended for You</Text>
              {learningRecommendations.map((recommendation) => renderLearningRecommendation(recommendation))}
            </View>
          )}
          
          {/* HackerNews Stories */}
          {feedItems.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🗞️ Latest from HackerNews</Text>
              {feedItems.map((item, index) => (
                <View key={item.id.toString()} style={styles.feedItemContainer}>
                  {renderHackerNewsStory(item)}
                </View>
              ))}
            </View>
          )}
          
          {!loading && feedItems.length === 0 && learningRecommendations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📚</Text>
              <Text style={styles.emptyStateTitle}>Welcome to your learning journey!</Text>
              <Text style={styles.emptyStateDescription}>
                Pull down to refresh and discover personalized content recommendations.
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  searchHeaderSection: {
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: -100,
  },
  feedSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  floatingHamburger: {
    position: 'absolute',
    top: 8,
    left: 20,
    zIndex: 200,
  },
  hamburgerButton: {
    width: 30,
    height: 44,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  storySummary: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginBottom: 10,
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
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -100,
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
    shadowRadius: 100,
    elevation: 12,
    width: '100%',
    maxWidth: 350,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
    height: 50,
    zIndex: 199,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  fixedHamburgerButton: {
    width: 30,
    height: 44,
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
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  // Learning component styles
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  seeMoreText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // Learning Progress Card
  learningProgressCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressIconText: {
    fontSize: 20,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressLevel: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  progressScore: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  milestonesContainer: {
    marginBottom: 12,
  },
  milestonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  milestoneText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  motivationalText: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Achievement Card
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  achievementTier: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  rarityScore: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  
  // Learning Recommendation Card
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  learningLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  learningLogoText: {
    fontSize: 16,
  },
  recommendationMeta: {
    flex: 1,
  },
  recommendationType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  recommendationDifficulty: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  priorityBadge: {
    backgroundColor: '#fecaca',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 22,
  },
  recommendationReason: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  learningValue: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  relevanceScore: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
});