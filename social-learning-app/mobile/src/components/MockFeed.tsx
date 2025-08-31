import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { DynamicFeedNavigator } from './navigation/DynamicFeedNavigator';
import { useSessionStore } from '../stores/sessionStore';

interface Props {
  onOpenAlgorithmSettings?: () => void;
  onScroll?: () => void;
}

export const MockFeed: React.FC<Props> = ({ onOpenAlgorithmSettings, onScroll }) => {
  const { addQuestionToCurrentSession, loadPersistedSessions, clearOldSessions } = useSessionStore();

  // Load persisted sessions on app launch
  useEffect(() => {
    const initializeSessions = async () => {
      console.log('🔄 Loading persisted research sessions...');
      await loadPersistedSessions();
      await clearOldSessions(30); // Clear sessions older than 30 days
      console.log('✅ Sessions loaded and old sessions cleared');
    };
    
    initializeSessions();
  }, [loadPersistedSessions, clearOldSessions]);

  const handleQuestionClick = (question: string, e?: any) => {
    console.log('❓ Question clicked:', question);
    
    const sourcePosition = e?.nativeEvent ? {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    } : {
      x: Dimensions.get('window').width / 2,
      y: 200,
    };

    addQuestionToCurrentSession(question, sourcePosition);
  };

  return (
    <View style={styles.container}>
      <DynamicFeedNavigator 
        onOpenAlgorithmSettings={onOpenAlgorithmSettings}
        onQuestionClick={handleQuestionClick}
        onScroll={onScroll}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MockFeed;