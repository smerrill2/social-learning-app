import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { HackerNewsStory } from '../types';

interface AnimatedFeedItemProps {
  item: HackerNewsStory;
  index: number;
  animationType?: 'staggered' | 'pulse' | 'typewriter' | 'glow';
  onLayout?: () => void;
}

export const AnimatedFeedItem: React.FC<AnimatedFeedItemProps> = ({
  item,
  index,
  animationType = 'staggered',
  onLayout,
}) => {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [showContent, setShowContent] = useState(false);
  
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(40)).current;
  const scaleAnimation = useRef(new Animated.Value(0.95)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;

    switch (animationType) {
      case 'staggered':
        animateStaggered(delay);
        break;
      case 'pulse':
        animatePulse(delay);
        break;
      case 'typewriter':
        animateTypewriter(delay);
        break;
      case 'glow':
        animateGlow(delay);
        break;
    }
  }, [animationType, index]);

  const animateStaggered = (delay: number) => {
    const animations = [
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ];

    Animated.parallel(animations).start(() => {
      onLayout?.();
    });
  };

  const animatePulse = (delay: number) => {
    setTimeout(() => {
      setShowContent(true);
      
      const pulseSequence = Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]);

      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        pulseSequence,
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.98,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
  };

  const animateTypewriter = (delay: number) => {
    setTimeout(() => {
      setShowContent(true);
      
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const title = item.title;
      let currentIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (currentIndex <= title.length) {
          setDisplayedTitle(title.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 30);
    }, delay);
  };

  const animateGlow = (delay: number) => {
    setTimeout(() => {
      setShowContent(true);
      
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  const getGlowIntensity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const getRotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!showContent && animationType !== 'staggered') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [
            { translateY: slideAnimation },
            { scale: animationType === 'pulse' ? pulseAnimation : scaleAnimation },
          ],
        },
        animationType === 'glow' && {
          shadowOpacity: getGlowIntensity,
          shadowColor: '#3b82f6',
          shadowRadius: 10,
          elevation: 5,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.storyCard}
        onPress={() => item.url && openUrl(item.url)}
        activeOpacity={0.7}
      >
        <View style={styles.storyHeader}>
          <Animated.View 
            style={[
              styles.hnLogo,
              animationType === 'glow' && {
                shadowOpacity: getGlowIntensity,
                shadowColor: '#ff6600',
                shadowRadius: 8,
              },
            ]}
          >
            <Text style={styles.hnLogoText}>HN</Text>
          </Animated.View>
          <View style={styles.storyMeta}>
            <Text style={styles.storyAuthor}>by {item.by}</Text>
            <Text style={styles.storyTime}>{item.timeAgo}</Text>
          </View>
          {animationType === 'glow' && (
            <Animated.View
              style={[
                styles.glowIndicator,
                {
                  opacity: glowAnimation,
                  transform: [{ rotate: getRotation }],
                },
              ]}
            >
              <Text style={styles.glowIcon}>✨</Text>
            </Animated.View>
          )}
        </View>
        
        <Text style={styles.storyTitle}>
          {animationType === 'typewriter' ? displayedTitle : item.title}
        </Text>
        
        {item.domain && (
          <Text style={styles.storyDomain}>{item.domain}</Text>
        )}
        
        <View style={styles.storyFooter}>
          <Text style={styles.storyStats}>
            ⬆️ {item.score} points • 💬 {item.descendants} comments
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
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
    minHeight: 22,
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
  glowIndicator: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowIcon: {
    fontSize: 12,
  },
});