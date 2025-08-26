import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Feed } from './Feed';

type AnimationType = 'staggered' | 'pulse' | 'typewriter' | 'glow';

const ANIMATION_STYLES: { 
  type: AnimationType; 
  name: string; 
  description: string; 
  icon: string; 
}[] = [
  {
    type: 'staggered',
    name: 'Staggered Slide',
    description: 'Items slide up and fade in sequentially',
    icon: '📈',
  },
  {
    type: 'pulse',
    name: 'Pulse Effect',
    description: 'Items appear with a gentle pulse animation',
    icon: '💫',
  },
  {
    type: 'typewriter',
    name: 'Typewriter',
    description: 'Text appears as if being typed in real-time',
    icon: '⌨️',
  },
  {
    type: 'glow',
    name: 'Glow Effect',
    description: 'Items appear with a subtle glowing animation',
    icon: '✨',
  },
];

export const AnimationStyleDemo: React.FC = () => {
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>('staggered');
  const [feedKey, setFeedKey] = useState(0);

  const handleAnimationChange = (type: AnimationType) => {
    setSelectedAnimation(type);
    setFeedKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed Animation Styles</Text>
        <Text style={styles.subtitle}>
          Choose different animation styles for your feed experience
        </Text>
      </View>

      <View style={styles.animationSelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
        >
          {ANIMATION_STYLES.map((style) => (
            <TouchableOpacity
              key={style.type}
              style={[
                styles.animationOption,
                selectedAnimation === style.type && styles.selectedOption,
              ]}
              onPress={() => handleAnimationChange(style.type)}
            >
              <Text style={styles.animationIcon}>{style.icon}</Text>
              <Text style={[
                styles.animationName,
                selectedAnimation === style.type && styles.selectedText,
              ]}>
                {style.name}
              </Text>
              <Text style={[
                styles.animationDescription,
                selectedAnimation === style.type && styles.selectedDescriptionText,
              ]}>
                {style.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.feedContainer}>
        <Text style={styles.currentStyleLabel}>
          Current Style: {ANIMATION_STYLES.find(s => s.type === selectedAnimation)?.name}
        </Text>
        <Feed
          key={feedKey}
          animationType={selectedAnimation}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  animationSelector: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectorContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  animationOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  animationIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  animationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedText: {
    color: '#3b82f6',
  },
  animationDescription: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedDescriptionText: {
    color: '#3b82f6',
  },
  feedContainer: {
    flex: 1,
  },
  currentStyleLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    fontWeight: '500',
  },
});