import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

const demoFeedItems = [
  { id: 1, title: "Breaking: New AI Model Achieves Human-Level Performance", score: 245 },
  { id: 2, title: "The Future of React Native Development in 2025", score: 189 },
  { id: 3, title: "Why TypeScript is Essential for Large Projects", score: 167 },
  { id: 4, title: "Understanding Modern JavaScript Frameworks", score: 134 },
  { id: 5, title: "Mobile Development Best Practices", score: 112 },
];

export const AnimatedFeedDemo: React.FC = () => {
  const [showItems, setShowItems] = useState(false);
  const animatedValues = useRef<Map<number, Animated.Value>>(new Map());

  const getAnimatedValue = (itemId: number) => {
    if (!animatedValues.current.has(itemId)) {
      animatedValues.current.set(itemId, new Animated.Value(0));
    }
    return animatedValues.current.get(itemId)!;
  };

  const animateItemsSequentially = () => {
    animatedValues.current.clear();
    
    const animations = demoFeedItems.map((item, index) => {
      const animValue = getAnimatedValue(item.id);
      return Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        delay: index * 35,
        useNativeDriver: true,
      });
    });

    Animated.stagger(20, animations).start();
  };

  const handleRefresh = () => {
    setShowItems(true);
    setTimeout(() => animateItemsSequentially(), 100);
  };

  const handleReset = () => {
    setShowItems(false);
    animatedValues.current.forEach(value => value.setValue(0));
  };

  const renderFeedItem = (item: typeof demoFeedItems[0]) => {
    const animatedValue = getAnimatedValue(item.id);
    
    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [40, 0],
    });
    
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    });

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.feedItem,
          {
            transform: [{ translateY }, { scale }],
            opacity,
          }
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.hnLogo}>
            <Text style={styles.hnLogoText}>HN</Text>
          </View>
          <Text style={styles.score}>⬆️ {item.score}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed Animation Demo</Text>
        <Text style={styles.headerSubtitle}>
          Watch items slide up and fade in line-by-line
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.buttonText}>🔄 Refresh Feed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.feedContainer}>
        {showItems && demoFeedItems.map(renderFeedItem)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
  },
  feedItem: {
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
    borderLeftColor: '#ff6600',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hnLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#ff6600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hnLogoText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
  },
});