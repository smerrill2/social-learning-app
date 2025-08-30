import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  loading?: boolean;
  animatedOpacity?: Animated.AnimatedInterpolation<number>;
  onQuestionClick?: (question: string, event?: GestureResponderEvent) => void;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const SimpleTile: React.FC<Props> = ({ onQuestionClick, loading = false }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [tileWidth, setTileWidth] = useState(0);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    if (loading) {
      shimmerAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [loading]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTileWidth(e.nativeEvent.layout.width);
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-Math.max(200, tileWidth), Math.max(200, tileWidth)],
  });

  const gradientWidth = Math.max(160, Math.floor(tileWidth * 0.5));

  return (
    <View>
      <TouchableOpacity style={styles.tile} activeOpacity={0.7} onLayout={handleLayout}>
        <Text style={styles.source}>Source: ArXiv Research</Text>
        <Text style={styles.title}>
          Attention Mechanisms in Deep Learning: A Comprehensive Survey of Modern Architectures
        </Text>
        <Text style={styles.body}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </Text>

        {loading && (
          <AnimatedLinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.6)',
              'rgba(255,255,255,0)'
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.shimmerOverlay,
              {
                width: gradientWidth,
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.questionButton} 
        activeOpacity={0.7}
        onPress={(event) => onQuestionClick?.('What are the current Deep Learning Architectures?', event)}
      >
        <Image 
          source={require('../../assets/Betterment.png')} 
          style={styles.questionIcon}
          resizeMode="contain"
        />
        <Text style={styles.questionText}>What are the current Deep Learning Architectures?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  source: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  questionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgb(4, 219, 235)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 1,
    marginBottom: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionText: {
    color: 'rgb(4, 219, 235)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'left',
    flex: 1,
  },
  questionIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.9,
  },
});

export default SimpleTile;
