import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  RefreshControlProps,
} from 'react-native';

interface GenerativeRefreshControlProps extends RefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  generatingText?: string;
}

export const GenerativeRefreshControl: React.FC<GenerativeRefreshControlProps> = ({
  refreshing,
  onRefresh,
  generatingText = "Generating fresh content...",
  ...props
}) => {
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const dotsAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(spinAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(dotsAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      ).start();
    } else {
      spinAnimation.setValue(0);
      pulseAnimation.setValue(1);
      dotsAnimation.setValue(0);
    }
  }, [refreshing]);

  const rotation = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dotsOpacity = dotsAnimation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.3, 1, 0.3, 1, 0.3],
  });

  return (
    <RefreshControl
      {...props}
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="transparent"
      colors={['transparent']}
      style={{ backgroundColor: 'transparent' }}
    >
      {refreshing && (
        <View style={styles.customRefreshContainer}>
          <View style={styles.refreshContent}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { rotate: rotation },
                    { scale: pulseAnimation },
                  ],
                },
              ]}
            >
              <Text style={styles.refreshIcon}>🤖</Text>
            </Animated.View>
            
            <View style={styles.textContainer}>
              <Text style={styles.refreshText}>{generatingText}</Text>
              <View style={styles.dotsContainer}>
                <Animated.Text style={[styles.dot, { opacity: dotsOpacity }]}>
                  •
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.dot, 
                    { 
                      opacity: dotsAnimation.interpolate({
                        inputRange: [0, 0.33, 0.66, 1],
                        outputRange: [0.3, 1, 0.3, 0.3],
                      })
                    }
                  ]}
                >
                  •
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.dot, 
                    { 
                      opacity: dotsAnimation.interpolate({
                        inputRange: [0, 0.66, 1],
                        outputRange: [0.3, 0.3, 1],
                      })
                    }
                  ]}
                >
                  •
                </Animated.Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </RefreshControl>
  );
};

interface GenerationIndicatorProps {
  visible: boolean;
  text?: string;
  style?: any;
}

export const GenerationIndicator: React.FC<GenerationIndicatorProps> = ({
  visible,
  text = "AI is generating your personalized feed",
  style,
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(-20)).current;
  const sparkleAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      sparkleAnimations.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.generationIndicator,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
        style,
      ]}
    >
      <View style={styles.sparkleContainer}>
        {sparkleAnimations.map((anim, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.sparkle,
              {
                opacity: anim,
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
              { left: 10 + index * 15 },
            ]}
          >
            ✨
          </Animated.Text>
        ))}
      </View>
      <Text style={styles.generationText}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  customRefreshContainer: {
    position: 'absolute',
    top: -80,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    zIndex: 1000,
  },
  refreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginRight: 12,
  },
  refreshIcon: {
    fontSize: 24,
  },
  textContainer: {
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    fontSize: 16,
    color: '#3b82f6',
  },
  generationIndicator: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  sparkleContainer: {
    position: 'relative',
    width: 60,
    height: 20,
    marginRight: 8,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 12,
  },
  generationText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    textAlign: 'center',
  },
});