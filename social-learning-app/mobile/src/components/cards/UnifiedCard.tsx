import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { contentService } from '../../services/api';

export type UnifiedCardItem = {
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
  timeAgo?: string;
  score?: number;
  descendants?: number;
  summary?: string;
  meta?: Record<string, any>;
};

interface Props {
  item: UnifiedCardItem;
  onFeedback?: (action: 'save' | 'more' | 'less' | 'skip') => void;
  showActions?: boolean;
  style?: any;
}

export const UnifiedCard: React.FC<Props> = ({ 
  item, 
  onFeedback, 
  showActions = true, 
  style 
}) => {
  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleFeedback = async (action: 'save' | 'more' | 'less' | 'skip') => {
    try {
      // Optimistic UI feedback
      onFeedback?.(action);
      
      // Send to backend
      await contentService.sendFeedback(item.id, item.source, action);
    } catch (error) {
      console.error('Failed to send feedback:', error);
      // Could add toast notification here
    }
  };

  const getSourceConfig = () => {
    switch (item.source) {
      case 'hackernews':
        return {
          pill: 'HN',
          color: '#ff6600',
          backgroundColor: '#fff5f0',
          borderColor: '#ff6600',
        };
      case 'research':
        return {
          pill: 'RX',
          color: '#10b981',
          backgroundColor: '#f0fdf4',
          borderColor: '#10b981',
        };
      case 'insight':
        return {
          pill: '💡',
          color: '#3b82f6',
          backgroundColor: '#eff6ff',
          borderColor: '#3b82f6',
        };
      default:
        return {
          pill: '?',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderColor: '#6b7280',
        };
    }
  };

  const sourceConfig = getSourceConfig();

  // Use tldr if available, otherwise fallback to summary for HackerNews
  const displaySummary = item.tldr || item.summary;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: sourceConfig.borderColor }, style]}
      onPress={() => openUrl(item.url)}
      activeOpacity={0.7}
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={[styles.sourcePill, { backgroundColor: sourceConfig.backgroundColor }]}>
          <Text style={[styles.sourcePillText, { color: sourceConfig.color }]}>
            {sourceConfig.pill}
          </Text>
        </View>
        
        <View style={styles.headerMeta}>
          {item.domain && (
            <Text style={[styles.domain, { color: sourceConfig.color }]}>{item.domain}</Text>
          )}
          {item.timeAgo && (
            <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          )}
        </View>
        
        {item.readingMinutes && (
          <View style={styles.readingTime}>
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text style={styles.readingTimeText}>{item.readingMinutes} min</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      {/* TL;DR / Summary */}
      {displaySummary && (
        <Text style={styles.summary} numberOfLines={4}>
          {displaySummary}
        </Text>
      )}

      {/* Why It Matters */}
      {item.whyItMatters && (
        <View style={styles.whyItMattersContainer}>
          <Text style={styles.whyItMattersLabel}>Why it matters:</Text>
          <Text style={styles.whyItMatters}>{item.whyItMatters}</Text>
        </View>
      )}

      {/* Author info for research papers */}
      {item.author && item.source === 'research' && (
        <Text style={styles.author} numberOfLines={1}>
          by {Array.isArray(item.author) ? item.author.join(', ') : item.author}
        </Text>
      )}

      {/* HackerNews specific stats */}
      {item.source === 'hackernews' && (item.score || item.descendants) && (
        <View style={styles.hnStats}>
          {item.score && (
            <Text style={styles.statText}>⬆️ {item.score} points</Text>
          )}
          {item.descendants && (
            <Text style={styles.statText}>💬 {item.descendants} comments</Text>
          )}
        </View>
      )}

      {/* Footer Actions */}
      {showActions && (
        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={() => handleFeedback('save')} 
            style={styles.actionButton}
          >
            <Ionicons name="bookmark-outline" size={18} color="#3b82f6" />
            <Text style={styles.actionText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleFeedback('more')} 
            style={styles.actionButton}
          >
            <Ionicons name="thumbs-up-outline" size={18} color="#10b981" />
            <Text style={styles.actionText}>More</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => handleFeedback('less')} 
            style={styles.actionButton}
          >
            <Ionicons name="thumbs-down-outline" size={18} color="#ef4444" />
            <Text style={styles.actionText}>Less</Text>
          </TouchableOpacity>
          
          {item.url && (
            <TouchableOpacity 
              onPress={() => openUrl(item.url)} 
              style={styles.actionButton}
            >
              <Ionicons name="open-outline" size={18} color="#6b7280" />
              <Text style={styles.actionText}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  sourcePillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domain: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 11,
    color: '#6b7280',
  },
  readingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readingTimeText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  whyItMattersContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
  },
  whyItMattersLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  whyItMatters: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  author: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  hnStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default UnifiedCard;