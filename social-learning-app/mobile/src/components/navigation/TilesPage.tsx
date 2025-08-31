import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SimpleTile } from '../SimpleTile';

interface Props {
  onQuestionClick: (question: string, event?: any) => void;
}

// Minimal tiles page used as pager index 0 inside DynamicFeedNavigator
export const TilesPage: React.FC<Props> = ({ onQuestionClick }) => {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerHint}>
        <Text style={styles.hintText}>Discover and ask questions</Text>
      </View>

      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`tiles-${i}`} style={{ marginBottom: i === 9 ? 40 : 0 }}>
          <SimpleTile loading={false} onQuestionClick={onQuestionClick} />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerHint: {
    alignItems: 'center',
    marginBottom: 12,
  },
  hintText: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default TilesPage;

