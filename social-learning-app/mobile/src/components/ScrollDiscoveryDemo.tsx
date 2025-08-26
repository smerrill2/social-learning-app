import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { DiscoveryFeed } from './DiscoveryFeed';

type DiscoveryMode = 'typewriter' | 'wordReveal' | 'lineReveal' | 'sparkle';

const DISCOVERY_MODES: { 
  type: DiscoveryMode; 
  name: string; 
  description: string; 
  icon: string; 
}[] = [
  {
    type: 'typewriter',
    name: 'Typewriter',
    description: 'Text appears as if being typed in real-time as you scroll',
    icon: '⌨️',
  },
  {
    type: 'wordReveal',
    name: 'Word Reveal',
    description: 'Words appear one by one as items come into view',
    icon: '📝',
  },
  {
    type: 'lineReveal',
    name: 'Line Reveal',
    description: 'Text reveals in chunks, line by line',
    icon: '📄',
  },
  {
    type: 'sparkle',
    name: 'Sparkle Discovery',
    description: 'Content appears with magical sparkle effects',
    icon: '✨',
  },
];

export const ScrollDiscoveryDemo: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<DiscoveryMode>('typewriter');
  const [feedKey, setFeedKey] = useState(0);

  const handleModeChange = (mode: DiscoveryMode) => {
    setSelectedMode(mode);
    setFeedKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scroll Discovery Demo</Text>
        <Text style={styles.subtitle}>
          Experience content generation as you scroll! 🔍
        </Text>
      </View>

      <View style={styles.modeSelector}>
        <Text style={styles.selectorTitle}>Discovery Mode:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
        >
          {DISCOVERY_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.type}
              style={[
                styles.modeOption,
                selectedMode === mode.type && styles.selectedMode,
              ]}
              onPress={() => handleModeChange(mode.type)}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text style={[
                styles.modeName,
                selectedMode === mode.type && styles.selectedText,
              ]}>
                {mode.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          {DISCOVERY_MODES.find(m => m.type === selectedMode)?.description}
        </Text>
        <Text style={styles.scrollHint}>
          👆 Scroll down to see the magic happen!
        </Text>
      </View>

      <View style={styles.feedContainer}>
        <DiscoveryFeed
          key={`${feedKey}-${selectedMode}`}
          discoveryMode={selectedMode}
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
  modeSelector: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectorContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  modeOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 120,
  },
  selectedMode: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  modeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  selectedText: {
    color: '#3b82f6',
  },
  instructions: {
    backgroundColor: '#fefce8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  instructionsText: {
    fontSize: 13,
    color: '#713f12',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  scrollHint: {
    fontSize: 12,
    color: '#a16207',
    textAlign: 'center',
    fontWeight: '500',
  },
  feedContainer: {
    flex: 1,
  },
});