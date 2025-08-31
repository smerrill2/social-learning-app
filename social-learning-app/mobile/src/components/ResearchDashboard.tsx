import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../stores/sessionStore';
import { SessionPreview, SessionStats } from '../types/sessionTypes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export const ResearchDashboard: React.FC<Props> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'pinned' | 'archived' | 'profile'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = React.useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  
  const {
    getRecentSessions,
    getPinnedSessions, 
    getArchivedSessions,
    getSessionStats,
    searchSessions,
    loadSession,
    deleteSession,
    pinSession,
    archiveSession,
    currentSession,
    createNewSession,
  } = useSessionStore();

  // Animation - slide from left
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Get sessions based on active tab
  const getSessions = (): SessionPreview[] => {
    if (searchQuery.trim()) {
      return searchSessions(searchQuery);
    }
    
    switch (activeTab) {
      case 'recent':
        return getRecentSessions();
      case 'pinned':
        return getPinnedSessions();
      case 'archived':
        return getArchivedSessions();
      default:
        return [];
    }
  };

  const sessions = getSessions();
  const stats = getSessionStats();

  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  // Handle session selection
  const handleSessionSelect = (sessionId: string) => {
    loadSession(sessionId);
    onClose();
  };

  // Render session card (Reddit-style)
  const renderSessionCard = (session: SessionPreview) => {
    const isCurrentSession = currentSession?.id === session.id;
    
    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.sessionCard, isCurrentSession && styles.currentSessionCard]}
        onPress={() => handleSessionSelect(session.id)}
        activeOpacity={0.8}
      >
        {/* Session header */}
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleRow}>
            <Text style={[styles.sessionTitle, isCurrentSession && styles.currentSessionTitle]}>
              {session.title}
            </Text>
            {session.isPinned && (
              <Ionicons name="bookmark" size={16} color="#f59e0b" style={styles.pinnedIcon} />
            )}
            {isCurrentSession && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionMetaText}>
              {formatTimeAgo(session.lastActiveAt)} • {session.questionCount} questions
            </Text>
          </View>
        </View>

        {/* Session preview */}
        <Text style={styles.sessionPreview} numberOfLines={2}>
          {session.preview}
        </Text>

        {/* Tags */}
        {session.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {session.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {session.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{session.tags.length - 3} more</Text>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              pinSession(session.id);
            }}
          >
            <Ionicons 
              name={session.isPinned ? "bookmark" : "bookmark-outline"} 
              size={18} 
              color={session.isPinned ? "#f59e0b" : "#6b7280"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              archiveSession(session.id);
            }}
          >
            <Ionicons name="archive-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render profile tab
  const renderProfileTab = () => (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>Research Profile</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalQuestions}</Text>
          <Text style={styles.statLabel}>Questions Asked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeSessions}</Text>
          <Text style={styles.statLabel}>Active Sessions</Text>
        </View>
      </View>

      {stats.favoriteTopics.length > 0 && (
        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>Favorite Topics</Text>
          <View style={styles.topicsList}>
            {stats.favoriteTopics.map((topic, index) => (
              <View key={index} style={styles.topicChip}>
                <Text style={styles.topicChipText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.profileAction}>
          <Ionicons name="download-outline" size={24} color="#3b82f6" />
          <Text style={styles.profileActionText}>Export All Sessions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileAction}>
          <Ionicons name="settings-outline" size={24} color="#3b82f6" />
          <Text style={styles.profileActionText}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.profileAction, styles.dangerAction]}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
          <Text style={[styles.profileActionText, styles.dangerActionText]}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isVisible) return null;

  return (
    <>
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
      
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Dashboard */}
      <Animated.View
        style={[
          styles.dashboard,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.dashboardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Research Sessions</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Search bar and New button */}
            {activeTab !== 'profile' && (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                      <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* New Research Session Button */}
                <TouchableOpacity 
                  style={styles.newSessionButton}
                  onPress={() => {
                    console.log('🆕 Starting new research session');
                    createNewSession();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.newSessionButtonText}>New Research Session</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Tab bar */}
            <View style={styles.tabBar}>
              {[
                { key: 'recent', label: 'Recent', icon: 'time-outline' },
                { key: 'pinned', label: 'Pinned', icon: 'bookmark-outline' },
                { key: 'archived', label: 'Archive', icon: 'archive-outline' },
                { key: 'profile', label: 'Profile', icon: 'person-outline' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    activeTab === tab.key && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? '#3b82f6' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'profile' ? (
              renderProfileTab()
            ) : (
              <>
                {sessions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name={
                        activeTab === 'recent' ? 'time-outline' :
                        activeTab === 'pinned' ? 'bookmark-outline' :
                        'archive-outline'
                      }
                      size={48}
                      color="#d1d5db"
                    />
                    <Text style={styles.emptyStateTitle}>
                      {searchQuery ? 'No matching sessions' : 
                       activeTab === 'recent' ? 'No recent sessions' :
                       activeTab === 'pinned' ? 'No pinned sessions' :
                       'No archived sessions'}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery ? 'Try a different search term' :
                       activeTab === 'recent' ? 'Start asking questions to create your first session' :
                       activeTab === 'pinned' ? 'Pin important sessions to find them here' :
                       'Archived sessions will appear here'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.sessionsList}>
                    {sessions.map(renderSessionCard)}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  dashboard: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT,
    zIndex: 1001,
  },
  dashboardGradient: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  clearSearch: {
    padding: 4,
  },
  newSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newSessionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sessionsList: {
    paddingBottom: 20,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  currentSessionCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  sessionHeader: {
    marginBottom: 8,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  currentSessionTitle: {
    color: '#3b82f6',
  },
  pinnedIcon: {
    marginLeft: 8,
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  profileContainer: {
    paddingBottom: 40,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  topicsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicChipText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionsSection: {
    gap: 16,
  },
  profileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  profileActionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  dangerAction: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerActionText: {
    color: '#ef4444',
  },
});

export default ResearchDashboard;