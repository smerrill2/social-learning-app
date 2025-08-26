import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AnimatedFeedItem } from './AnimatedFeedItem';

/**
 * Demo component showcasing the professional animation technique:
 * 
 * Technique Analysis (from ChatGPT):
 * - Layer-level fade + upward translate using ease-out curve (fast start, slow finish)
 * - No glyph-by-glyph "type-on": all characters rise and brighten together
 * - No visible overshoot, no rotation/skew
 * - Micro scale from ~0.98 → 1.00 for soft "arrive and firm up" feel
 * - No motion blur (UI-style motion vs cinematic blur)
 * - Consistent timing across items (reused preset)
 * 
 * Specs:
 * - 200ms total duration
 * - 16px upward travel
 * - Cubic-out fade + scale
 * - 0.98→1.0 scale transition
 */

interface DemoItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
}

const demoItems: DemoItem[] = [
  {
    id: '1',
    title: 'Professional Animation Technique',
    subtitle: 'Layer-level fade + upward translate',
    content: 'Fast start, slow finish with cubic-out easing curve',
  },
  {
    id: '2',
    title: 'Micro Scale Animation',
    subtitle: '0.98 → 1.00 scale transition',
    content: 'Creates soft "arrive and firm up" visual feedback',
  },
  {
    id: '3',
    title: 'UI-Style Motion',
    subtitle: 'No motion blur, consistent timing',
    content: 'Clean, professional appearance for interface elements',
  },
  {
    id: '4',
    title: 'Staggered Entrance',
    subtitle: '35ms delay between items',
    content: 'Creates flowing, sequential reveal animation',
  },
  {
    id: '5',
    title: 'Reanimated Performance',
    subtitle: 'Native driver optimization',
    content: '60fps smooth animations with React Native Reanimated',
  },
];

export const AnimationDemo: React.FC = () => {
  const [animationKey, setAnimationKey] = useState(0);

  const triggerAnimation = () => {
    setAnimationKey(prev => prev + 1);
  };

  const renderDemoItem = (item: DemoItem, index: number) => (
    <AnimatedFeedItem
      key={`${item.id}-${animationKey}`}
      index={index}
      style={styles.demoItemContainer}
    >
      <View style={styles.demoItem}>
        <View style={styles.demoHeader}>
          <View style={styles.demoIcon}>
            <Text style={styles.demoIconText}>✨</Text>
          </View>
          <View style={styles.demoMeta}>
            <Text style={styles.demoTitle}>{item.title}</Text>
            <Text style={styles.demoSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <Text style={styles.demoContent}>{item.content}</Text>
        
        <View style={styles.demoSpecs}>
          <Text style={styles.demoSpec}>200ms duration</Text>
          <Text style={styles.demoSpec}>16px travel</Text>
          <Text style={styles.demoSpec}>Cubic-out easing</Text>
        </View>
      </View>
    </AnimatedFeedItem>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Animation Technique Demo</Text>
        <Text style={styles.headerSubtitle}>
          Professional UI-style motion matching ChatGPT's analysis
        </Text>
        
        <TouchableOpacity
          style={styles.triggerButton}
          onPress={triggerAnimation}
          activeOpacity={0.7}
        >
          <Text style={styles.triggerButtonText}>▶ Trigger Animation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.demoContainer}>
        {demoItems.map((item, index) => renderDemoItem(item, index))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Animation Properties:</Text>
        <View style={styles.propertyList}>
          <Text style={styles.property}>• Duration: 200ms</Text>
          <Text style={styles.property}>• Travel: 16px upward</Text>
          <Text style={styles.property}>• Easing: Cubic-out (fast → slow)</Text>
          <Text style={styles.property}>• Scale: 0.98 → 1.00</Text>
          <Text style={styles.property}>• Stagger: 35ms between items</Text>
          <Text style={styles.property}>• Opacity: 0 → 1 (layer-level fade)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  triggerButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  triggerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  demoContainer: {
    padding: 16,
  },
  demoItemContainer: {
    marginBottom: 16,
  },
  demoItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  demoIconText: {
    fontSize: 18,
  },
  demoMeta: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  demoSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  demoContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  demoSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoSpec: {
    fontSize: 12,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  propertyList: {
    gap: 6,
  },
  property: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
