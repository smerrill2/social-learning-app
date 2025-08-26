import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedFeedItemProps {
  children: React.ReactNode;
  index: number;
  onAnimationComplete?: () => void;
  style?: any;
}

/**
 * Professional UI-style animation preset matching the technique described:
 * - Layer-level fade + upward translate
 * - Ease-out curve (fast start, slow finish) 
 * - 200ms total duration
 * - 16px upward travel
 * - Micro scale 0.98 → 1.00 for "arrive and firm up" feel
 * - No motion blur, consistent with UI-style motion
 */
export const AnimatedFeedItem: React.FC<AnimatedFeedItemProps> = ({
  children,
  index,
  onAnimationComplete,
  style,
}) => {
  // Shared values for animation properties
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16); // 16px upward travel
  const scale = useSharedValue(0.98); // Micro scale for "firm up" feel

  useEffect(() => {
    // Stagger the animations based on index
    const delay = index * 35; // 35ms stagger between items
    
    // Start the animation sequence
    setTimeout(() => {
      // All properties animate together with cubic-out easing
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic), // Cubic-out: fast start, slow finish
      });
      
      translateY.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      
      scale.value = withTiming(1.0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        // Call completion callback on the JS thread
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      });
    }, delay);
  }, [index]);

  // Create the animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

/**
 * Reset animation hook for refresh scenarios
 */
export const useResetAnimation = () => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const scale = useSharedValue(0.98);

  const resetAndAnimate = (delay: number = 0) => {
    // Reset to initial state
    opacity.value = 0;
    translateY.value = 16;
    scale.value = 0.98;

    // Animate after delay
    setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      
      translateY.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      
      scale.value = withTiming(1.0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return { resetAndAnimate, animatedStyle };
};

/**
 * Batch animation controller for refresh scenarios
 */
export class FeedAnimationController {
  private static instance: FeedAnimationController;
  private animationQueue: Array<() => void> = [];
  private isAnimating = false;

  static getInstance(): FeedAnimationController {
    if (!FeedAnimationController.instance) {
      FeedAnimationController.instance = new FeedAnimationController();
    }
    return FeedAnimationController.instance;
  }

  /**
   * Queue multiple items for staggered animation
   */
  queueAnimation(animationFn: () => void) {
    this.animationQueue.push(animationFn);
  }

  /**
   * Execute all queued animations with proper staggering
   */
  executeQueue() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    this.animationQueue.forEach((animationFn, index) => {
      setTimeout(() => {
        animationFn();
        
        // Mark as complete when last animation starts
        if (index === this.animationQueue.length - 1) {
          setTimeout(() => {
            this.isAnimating = false;
          }, 200); // Duration of individual animation
        }
      }, index * 35); // 35ms stagger
    });
    
    this.animationQueue = [];
  }

  /**
   * Clear all queued animations
   */
  clearQueue() {
    this.animationQueue = [];
    this.isAnimating = false;
  }
}