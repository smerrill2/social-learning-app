import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { algorithmService } from '../services/api';
import { AlgorithmPreferences, QuickControlPreset } from '../types';

const QUICK_PRESETS: QuickControlPreset[] = [
  {
    id: 'more_ai_ml',
    name: 'More AI/ML',
    description: 'Boost AI and ML content',
    icon: '🤖',
    changes: {
      researchCategories: { artificialIntelligence: 80, computerScience: 60 },
      contentTypes: { researchPapers: 60, hackernews: 30 }
    }
  },
  {
    id: 'less_startup_news',
    name: 'Less Startup News',
    description: 'Reduce startup/business content',
    icon: '📰',
    changes: {
      contentTypes: { hackernews: 15, researchPapers: 50, insights: 30 },
      sourcePreferences: { hackernews: 30 }
    }
  },
  {
    id: 'research_focus',
    name: 'Research Focus',
    description: 'Prioritize academic papers',
    icon: '📚',
    changes: {
      contentTypes: { researchPapers: 70, insights: 20, hackernews: 10 },
      contentFilters: { contentQualityThreshold: 80 }
    }
  },
  {
    id: 'discovery_mode',
    name: 'Discovery Mode',
    description: 'Show more surprising content',
    icon: '🔍',
    changes: {
      feedBehavior: { explorationVsExploitation: 80, diversityImportance: 75 }
    }
  },
  {
    id: 'popular_content',
    name: 'Popular Content',
    description: 'Show trending items',
    icon: '🔥',
    changes: {
      feedBehavior: { popularityWeight: 80, socialSignalsWeight: 70 }
    }
  },
  {
    id: 'fresh_content',
    name: 'Fresh Content',
    description: 'Prioritize newest posts',
    icon: '🆕',
    changes: {
      feedBehavior: { recencyWeight: 85, popularityWeight: 20 }
    }
  }
];

interface Props {
  onPreferencesChanged: (preferences: AlgorithmPreferences) => void;
  onOpenSettings: () => void;
}

export const FeedQuickControls: React.FC<Props> = ({ onPreferencesChanged, onOpenSettings }) => {
  const [showModal, setShowModal] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const applyQuickPreset = async (preset: QuickControlPreset) => {
    setApplyingPreset(preset.id);
    try {
      const currentPrefs = await algorithmService.getPreferences();
      
      const newPreferences = { ...currentPrefs };
      Object.keys(preset.changes).forEach(category => {
        const changes = preset.changes[category as keyof typeof preset.changes];
        if (changes) {
          Object.keys(changes).forEach(key => {
            if (newPreferences[category as keyof AlgorithmPreferences]) {
              (newPreferences[category as keyof AlgorithmPreferences] as any)[key] = (changes as any)[key];
            }
          });
        }
      });

      const updatedPrefs = await algorithmService.updatePreferences(newPreferences);
      onPreferencesChanged(updatedPrefs);
      setShowModal(false);
      
      Alert.alert('Applied!', `"${preset.name}" preferences applied to your feed.`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      Alert.alert('Error', 'Failed to apply preset. Please try again.');
    } finally {
      setApplyingPreset(null);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.quickControlsButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.quickControlsIcon}>⚡</Text>
          <Text style={styles.quickControlsText}>Quick Controls</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenSettings}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Quick Algorithm Controls</Text>
            <TouchableOpacity
              onPress={onOpenSettings}
              style={styles.advancedButton}
            >
              <Text style={styles.advancedButtonText}>Advanced</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>
              Quickly adjust your feed algorithm with these presets:
            </Text>

            <View style={styles.presetsGrid}>
              {QUICK_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    applyingPreset === preset.id && styles.presetCardApplying
                  ]}
                  onPress={() => applyQuickPreset(preset)}
                  disabled={applyingPreset !== null}
                >
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetDescription}>{preset.description}</Text>
                  {applyingPreset === preset.id && (
                    <Text style={styles.applyingText}>Applying...</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>💡 How it works</Text>
              <Text style={styles.infoText}>
                These quick controls adjust your algorithm preferences instantly. 
                Your changes are saved automatically and will affect future feed refreshes.
              </Text>
              
              <TouchableOpacity
                style={styles.fullSettingsButton}
                onPress={() => {
                  setShowModal(false);
                  onOpenSettings();
                }}
              >
                <Text style={styles.fullSettingsButtonText}>
                  Open Full Algorithm Settings →
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    gap: 8,
  },
  quickControlsButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickControlsIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  quickControlsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  settingsIcon: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  advancedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  advancedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginVertical: 20,
    textAlign: 'center',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  presetCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardApplying: {
    borderColor: '#3b82f6',
    opacity: 0.7,
  },
  presetIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  presetDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  applyingText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  fullSettingsButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullSettingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});