import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { HackerNewsStory } from '../types';

interface ScrollDiscoveryFeedItemProps {
  item: HackerNewsStory;
  index: number;
  itemOffset: number;
  itemHeight: number;
}

export const ScrollDiscoveryFeedItem: React.FC<ScrollDiscoveryFeedItemProps> = ({
  item,
  index,
  itemOffset,
  itemHeight,
}) => {
  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.storyCard, { minHeight: itemHeight }]}
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
};

const styles = StyleSheet.create({
  storyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
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
});