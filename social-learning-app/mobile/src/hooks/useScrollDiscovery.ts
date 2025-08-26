import { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VISIBILITY_THRESHOLD = 0.3;

interface UseScrollDiscoveryProps {
  itemHeight: number;
  itemOffset: number;
  scrollY: Animated.Value;
  threshold?: number;
}

interface ScrollDiscoveryResult {
  isVisible: boolean;
  hasBeenVisible: boolean;
  visibilityProgress: number;
  triggerDiscovery: () => void;
  resetDiscovery: () => void;
}

export const useScrollDiscovery = ({
  itemHeight,
  itemOffset,
  scrollY,
  threshold = VISIBILITY_THRESHOLD,
}: UseScrollDiscoveryProps): ScrollDiscoveryResult => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [visibilityProgress, setVisibilityProgress] = useState(0);
  const hasTriggered = useRef(false);

  const checkVisibility = useCallback((scrollPosition: number) => {
    const itemTop = itemOffset;
    const itemBottom = itemOffset + itemHeight;
    const screenTop = scrollPosition;
    const screenBottom = scrollPosition + SCREEN_HEIGHT;

    const thresholdOffset = SCREEN_HEIGHT * threshold;
    const isItemVisible = 
      itemBottom >= screenTop + thresholdOffset &&
      itemTop <= screenBottom - thresholdOffset;

    // Calculate visibility progress
    const visibleTop = Math.max(itemTop, screenTop);
    const visibleBottom = Math.min(itemBottom, screenBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const progress = Math.min(1, visibleHeight / itemHeight);

    setVisibilityProgress(progress);
    setIsVisible(isItemVisible);

    if (isItemVisible && !hasTriggered.current) {
      setHasBeenVisible(true);
      hasTriggered.current = true;
    } else if (!isItemVisible && hasTriggered.current && progress < 0.1) {
      hasTriggered.current = false;
    }
  }, [itemHeight, itemOffset, threshold]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      checkVisibility(value);
    });

    // Initial check
    checkVisibility(0);

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, checkVisibility]);

  const triggerDiscovery = useCallback(() => {
    setHasBeenVisible(true);
    hasTriggered.current = true;
  }, []);

  const resetDiscovery = useCallback(() => {
    setHasBeenVisible(false);
    setIsVisible(false);
    setVisibilityProgress(0);
    hasTriggered.current = false;
  }, []);

  return {
    isVisible,
    hasBeenVisible,
    visibilityProgress,
    triggerDiscovery,
    resetDiscovery,
  };
};

interface UseTypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  enabled: boolean;
}

export const useTypewriter = ({
  text,
  speed = 30,
  delay = 0,
  enabled,
}: UseTypewriterProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!enabled || !text) return;

    setDisplayedText('');
    setIsComplete(false);
    
    let index = 0;
    const typeCharacter = () => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
        timeoutRef.current = setTimeout(typeCharacter, speed + Math.random() * 10);
      } else {
        setIsComplete(true);
      }
    };

    timeoutRef.current = setTimeout(typeCharacter, delay);
  }, [text, speed, delay, enabled]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText('');
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startTyping();
    } else {
      stopTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, startTyping, stopTyping]);

  return {
    displayedText,
    isComplete,
    startTyping,
    stopTyping,
  };
};

interface UseWordRevealProps {
  text: string;
  speed?: number;
  delay?: number;
  enabled: boolean;
}

export const useWordReveal = ({
  text,
  speed = 80,
  delay = 0,
  enabled,
}: UseWordRevealProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const startRevealing = useCallback(() => {
    if (!enabled || !text) return;

    setDisplayedText('');
    setIsComplete(false);
    
    const words = text.split(' ');
    let wordIndex = 0;

    const revealWord = () => {
      if (wordIndex < words.length) {
        const wordsToShow = words.slice(0, wordIndex + 1).join(' ');
        setDisplayedText(wordsToShow);
        wordIndex++;
        timeoutRef.current = setTimeout(revealWord, speed + Math.random() * 40);
      } else {
        setIsComplete(true);
      }
    };

    timeoutRef.current = setTimeout(revealWord, delay);
  }, [text, speed, delay, enabled]);

  const stopRevealing = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText('');
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startRevealing();
    } else {
      stopRevealing();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, startRevealing, stopRevealing]);

  return {
    displayedText,
    isComplete,
    startRevealing,
    stopRevealing,
  };
};