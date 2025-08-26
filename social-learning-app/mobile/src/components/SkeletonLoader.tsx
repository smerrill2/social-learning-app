import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width: skeletonWidth = 100,
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      shimmerAnimation.setValue(0);
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start(() => {
        shimmer();
      });
    };
    
    shimmer();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-skeletonWidth, skeletonWidth],
  });

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width: skeletonWidth,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      />
    </View>
  );
};

interface SkeletonFeedItemProps {
  style?: any;
}

export const SkeletonFeedItem: React.FC<SkeletonFeedItemProps> = ({ style }) => {
  return (
    <View style={[styles.feedItemContainer, style]}>
      <View style={styles.header}>
        <SkeletonLoader width={32} height={32} borderRadius={6} />
        <View style={styles.headerText}>
          <SkeletonLoader width={80} height={14} />
          <SkeletonLoader width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      <SkeletonLoader 
        width={width - 64} 
        height={16} 
        style={{ marginBottom: 8 }} 
      />
      <SkeletonLoader 
        width={width - 100} 
        height={16} 
        style={{ marginBottom: 12 }} 
      />
      
      <SkeletonLoader width={120} height={12} />
      
      <View style={styles.footer}>
        <SkeletonLoader width={150} height={12} />
      </View>
    </View>
  );
};

export const SkeletonFeedList: React.FC<{ itemCount?: number }> = ({ 
  itemCount = 5 
}) => {
  const fadeInAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeInAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeInAnimation]);

  return (
    <Animated.View style={[styles.listContainer, { opacity: fadeInAnimation }]}>
      {Array.from({ length: itemCount }, (_, index) => (
        <SkeletonFeedItem key={index} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  feedItemContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
});