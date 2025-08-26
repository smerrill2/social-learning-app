import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { HackerNewsStory } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VISIBILITY_THRESHOLD = 0.3;

interface ScrollDiscoveryFeedItemProps {
  item: HackerNewsStory;
  index: number;
  scrollY: Animated.Value;
  itemOffset: number;
  itemHeight: number;
  discoveryMode?: 'typewriter' | 'wordReveal' | 'lineReveal' | 'sparkle';
}

export const ScrollDiscoveryFeedItem: React.FC<ScrollDiscoveryFeedItemProps> = ({
  item,
  index,
  scrollY,
  itemOffset,
  itemHeight,
  discoveryMode = 'typewriter',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedAuthor, setDisplayedAuthor] = useState('');
  const [displayedDomain, setDisplayedDomain] = useState('');
  const [showSparkles, setShowSparkles] = useState(false);

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;
  const sparkleAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const typewriterTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const scrollPosition = value;
      const itemTop = itemOffset;
      const itemBottom = itemOffset + itemHeight;
      const screenTop = scrollPosition;
      const screenBottom = scrollPosition + SCREEN_HEIGHT;

      const isItemVisible = 
        itemBottom >= screenTop + (SCREEN_HEIGHT * VISIBILITY_THRESHOLD) &&
        itemTop <= screenBottom - (SCREEN_HEIGHT * VISIBILITY_THRESHOLD);

      if (isItemVisible && !isVisible) {
        setIsVisible(true);
        if (!hasBeenVisible) {
          setHasBeenVisible(true);
          startDiscoveryAnimation();
        }
      } else if (!isItemVisible && isVisible) {
        setIsVisible(false);
      }
    });

    return () => {
      scrollY.removeListener(listener);
      typewriterTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [scrollY, itemOffset, itemHeight, isVisible, hasBeenVisible]);

  const startDiscoveryAnimation = () => {
    resetAnimations();

    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    switch (discoveryMode) {
      case 'typewriter':
        startTypewriterEffect();
        break;
      case 'wordReveal':
        startWordRevealEffect();
        break;
      case 'lineReveal':
        startLineRevealEffect();
        break;
      case 'sparkle':
        startSparkleEffect();
        break;
    }
  };

  const resetAnimations = () => {
    typewriterTimeouts.current.forEach(timeout => clearTimeout(timeout));
    typewriterTimeouts.current = [];
    setDisplayedTitle('');
    setDisplayedAuthor('');
    setDisplayedDomain('');
    setShowSparkles(false);
  };

  const startTypewriterEffect = () => {
    const title = item.title;
    const author = item.by;
    const domain = item.domain || '';

    let titleIndex = 0;
    const typeTitle = () => {
      if (titleIndex <= title.length) {
        setDisplayedTitle(title.substring(0, titleIndex));
        titleIndex++;
        const timeout = setTimeout(typeTitle, 25 + Math.random() * 15);
        typewriterTimeouts.current.push(timeout);
      } else {
        let authorIndex = 0;
        const typeAuthor = () => {
          if (authorIndex <= author.length) {
            setDisplayedAuthor(author.substring(0, authorIndex));
            authorIndex++;
            const timeout = setTimeout(typeAuthor, 30);
            typewriterTimeouts.current.push(timeout);
          } else if (domain) {
            let domainIndex = 0;
            const typeDomain = () => {
              if (domainIndex <= domain.length) {
                setDisplayedDomain(domain.substring(0, domainIndex));
                domainIndex++;
                const timeout = setTimeout(typeDomain, 20);
                typewriterTimeouts.current.push(timeout);
              }
            };
            typeDomain();
          }
        };
        setTimeout(typeAuthor, 200);
      }
    };

    setTimeout(typeTitle, 100);
  };

  const startWordRevealEffect = () => {
    const words = item.title.split(' ');
    let currentWordIndex = 0;

    const revealNextWord = () => {
      if (currentWordIndex < words.length) {
        const wordsToShow = words.slice(0, currentWordIndex + 1).join(' ');
        setDisplayedTitle(wordsToShow);
        currentWordIndex++;
        const timeout = setTimeout(revealNextWord, 80 + Math.random() * 40);
        typewriterTimeouts.current.push(timeout);
      } else {
        setDisplayedAuthor(item.by);
        setTimeout(() => setDisplayedDomain(item.domain || ''), 200);
      }
    };

    setTimeout(revealNextWord, 100);
  };

  const startLineRevealEffect = () => {
    const titleChunks = item.title.match(/.{1,30}(\s|$)/g) || [item.title];
    let chunkIndex = 0;

    const revealNextChunk = () => {
      if (chunkIndex < titleChunks.length) {
        const chunksToShow = titleChunks.slice(0, chunkIndex + 1).join('');
        setDisplayedTitle(chunksToShow);
        chunkIndex++;
        const timeout = setTimeout(revealNextChunk, 200);
        typewriterTimeouts.current.push(timeout);
      } else {
        setTimeout(() => {
          setDisplayedAuthor(item.by);
          setDisplayedDomain(item.domain || '');
        }, 100);
      }
    };

    setTimeout(revealNextChunk, 100);
  };

  const startSparkleEffect = () => {
    setShowSparkles(true);
    setDisplayedTitle(item.title);
    setDisplayedAuthor(item.by);
    setDisplayedDomain(item.domain || '');

    sparkleAnimations.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    });

    Animated.sequence([
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  const glowIntensity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
        discoveryMode === 'sparkle' && {
          shadowOpacity: glowIntensity,
          shadowColor: '#3b82f6',
          shadowRadius: 15,
          elevation: 8,
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
              discoveryMode === 'sparkle' && {
                shadowOpacity: glowIntensity,
                shadowColor: '#ff6600',
                shadowRadius: 10,
              },
            ]}
          >
            <Text style={styles.hnLogoText}>HN</Text>
          </Animated.View>
          <View style={styles.storyMeta}>
            <Text style={styles.storyAuthor}>
              by {displayedAuthor}
              {discoveryMode === 'typewriter' && displayedAuthor && displayedAuthor.length < item.by.length && (
                <Text style={styles.cursor}>|</Text>
              )}
            </Text>
            <Text style={styles.storyTime}>{item.timeAgo}</Text>
          </View>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.storyTitle}>
            {displayedTitle}
            {discoveryMode === 'typewriter' && displayedTitle && displayedTitle.length < item.title.length && (
              <Text style={styles.cursor}>|</Text>
            )}
          </Text>
          
          {showSparkles && sparkleAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.sparkle,
                {
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1.2],
                      }),
                    },
                  ],
                },
                {
                  right: 10 + (index * 15),
                  top: 5 + (index * 8),
                },
              ]}
            >
              <Text style={styles.sparkleText}>✨</Text>
            </Animated.View>
          ))}
        </View>
        
        {displayedDomain && (
          <Text style={styles.storyDomain}>
            {displayedDomain}
            {discoveryMode === 'typewriter' && item.domain && displayedDomain.length < item.domain.length && (
              <Text style={styles.cursor}>|</Text>
            )}
          </Text>
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
  titleContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22,
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
  cursor: {
    color: '#3b82f6',
    fontWeight: 'normal',
    opacity: 1,
  },
  sparkle: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleText: {
    fontSize: 12,
  },
});