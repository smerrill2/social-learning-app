import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { algorithmService } from '../services/api';
import { AlgorithmPreferences, QuickControlPreset } from '../types';

const QUICK_PRESETS: QuickControlPreset[] = [
  {
    id: 'psychology_focus',
    name: 'Psychology Focus',
    description: 'Emphasize psychology and behavioral science research',
    icon: '🧠',
    changes: {
      contentTypes: { researchPapers: 70, insights: 20, hackernews: 10, discussions: 0 },
      researchCategories: { psychology: 80, behavioralScience: 60, cognitiveScience: 40 }
    }
  },
  {
    id: 'tech_heavy',
    name: 'Tech Heavy',
    description: 'More AI/ML, computer science, and startup news',
    icon: '💻',
    changes: {
      contentTypes: { hackernews: 50, researchPapers: 40, insights: 10, discussions: 0 },
      researchCategories: { artificialIntelligence: 80, computerScience: 70 }
    }
  },
  {
    id: 'balanced_discovery',
    name: 'Balanced Discovery',
    description: 'Even mix with high exploration',
    icon: '⚖️',
    changes: {
      contentTypes: { researchPapers: 35, hackernews: 30, insights: 25, discussions: 10 },
      feedBehavior: { explorationVsExploitation: 75, diversityImportance: 80 }
    }
  },
  {
    id: 'research_deep_dive',
    name: 'Research Deep Dive',
    description: 'Focus on academic papers and insights',
    icon: '📚',
    changes: {
      contentTypes: { researchPapers: 60, insights: 30, hackernews: 10, discussions: 0 },
      contentFilters: { minReadingTime: 5, contentQualityThreshold: 80 }
    }
  }
];

const DEFAULT_PREFERENCES: AlgorithmPreferences = {
  contentTypes: {
    researchPapers: 40,
    hackernews: 30,
    insights: 25,
    discussions: 5
  },
  researchCategories: {
    psychology: 20,
    behavioralScience: 20,
    healthSciences: 15,
    neuroscience: 15,
    cognitiveScience: 15,
    artificialIntelligence: 25,
    computerScience: 20,
    socialSciences: 10,
    economics: 10,
    philosophy: 10
  },
  feedBehavior: {
    recencyWeight: 50,
    popularityWeight: 50,
    diversityImportance: 60,
    explorationVsExploitation: 50,
    socialSignalsWeight: 40
  },
  sourcePreferences: {
    arxiv: 70,
    hackernews: 60,
    pubmed: 50,
    researchgate: 40,
    personalInsights: 80
  },
  contentFilters: {
    minReadingTime: 2,
    maxReadingTime: 45,
    languagePreference: 'en',
    contentQualityThreshold: 60
  }
};

interface Props {
  onBack: () => void;
  onPreferencesChanged?: (preferences: AlgorithmPreferences) => void;
}

export const AlgorithmSettings: React.FC<Props> = ({ onBack, onPreferencesChanged }) => {
  const [preferences, setPreferences] = useState<AlgorithmPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const userPrefs = await algorithmService.getPreferences();
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const updatedPrefs = await algorithmService.updatePreferences(preferences);
      setPreferences(updatedPrefs);
      onPreferencesChanged?.(updatedPrefs);
      Alert.alert('Success', 'Algorithm preferences updated!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (preset: QuickControlPreset) => {
    const newPreferences = { ...preferences };
    
    Object.keys(preset.changes).forEach(category => {
      const changes = preset.changes[category as keyof typeof preset.changes];
      if (changes) {
        Object.keys(changes).forEach(key => {
          if (newPreferences[category as keyof AlgorithmPreferences]) {
            (newPreferences[category as keyof AlgorithmPreferences] as any)[key] = changes[key];
          }
        });
      }
    });

    setPreferences(newPreferences);
  };

  const resetToDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all algorithm preferences to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const defaultPrefs = await algorithmService.resetToDefaults();
              setPreferences(defaultPrefs);
              Alert.alert('Success', 'Preferences reset to defaults!');
            } catch (error) {
              setPreferences(DEFAULT_PREFERENCES);
            }
          }
        }
      ]
    );
  };

  const updateContentType = useCallback((type: keyof AlgorithmPreferences['contentTypes'], value: number) => {
    setPreferences(prev => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [type]: Math.round(value)
      }
    }));
  }, []);

  const updateResearchCategory = useCallback((category: keyof AlgorithmPreferences['researchCategories'], value: number) => {
    setPreferences(prev => ({
      ...prev,
      researchCategories: {
        ...prev.researchCategories,
        [category]: Math.round(value)
      }
    }));
  }, []);

  const updateFeedBehavior = useCallback((behavior: keyof AlgorithmPreferences['feedBehavior'], value: number) => {
    setPreferences(prev => ({
      ...prev,
      feedBehavior: {
        ...prev.feedBehavior,
        [behavior]: Math.round(value)
      }
    }));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading algorithm preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const contentTotal = Object.values(preferences.contentTypes).reduce((sum, val) => sum + val, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Algorithm Settings</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Quick Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Presets</Text>
          <Text style={styles.sectionSubtitle}>Apply common algorithm configurations</Text>
          <View style={styles.presetGrid}>
            {QUICK_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={styles.presetCard}
                onPress={() => applyPreset(preset)}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content Type Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Content Mix</Text>
          <Text style={styles.sectionSubtitle}>
            Balance different content types (Total: {contentTotal}%)
          </Text>
          
          {Object.entries(preferences.contentTypes).map(([type, value]) => (
            <View key={type} style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>
                  {type === 'researchPapers' ? '📄 Research Papers' :
                   type === 'hackernews' ? '🔥 HackerNews' :
                   type === 'insights' ? '💡 Personal Insights' :
                   '💬 Discussions'}
                </Text>
                <Text style={styles.sliderValue}>{value}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={value}
                onValueChange={(val) => updateContentType(type as keyof AlgorithmPreferences['contentTypes'], val)}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor="#d1d5db"
              />
            </View>
          ))}
        </View>

        {/* Research Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Research Focus Areas</Text>
          <Text style={styles.sectionSubtitle}>Prioritize specific academic fields</Text>
          
          {Object.entries(preferences.researchCategories).map(([category, value]) => {
            const categoryLabels: Record<string, string> = {
              psychology: '🧠 Psychology',
              behavioralScience: '🔬 Behavioral Science',
              healthSciences: '🏥 Health Sciences',
              neuroscience: '⚡ Neuroscience',
              cognitiveScience: '🤔 Cognitive Science',
              artificialIntelligence: '🤖 AI/ML',
              computerScience: '💻 Computer Science',
              socialSciences: '👥 Social Sciences',
              economics: '💰 Economics',
              philosophy: '💭 Philosophy'
            };

            return (
              <View key={category} style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>{categoryLabels[category]}</Text>
                  <Text style={styles.sliderValue}>{value}%</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={value}
                  onValueChange={(val) => updateResearchCategory(category as keyof AlgorithmPreferences['researchCategories'], val)}
                  minimumTrackTintColor="#10b981"
                  maximumTrackTintColor="#d1d5db"
                  />
              </View>
            );
          })}
        </View>

        {/* Feed Behavior Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Feed Behavior</Text>
          <Text style={styles.sectionSubtitle}>Control how content is selected and ordered</Text>
          
          <View style={styles.behaviorContainer}>
            <View style={styles.behaviorItem}>
              <Text style={styles.behaviorLabel}>🆕 New vs Popular Content</Text>
              <Text style={styles.behaviorDescription}>
                {preferences.feedBehavior.recencyWeight < 30 ? 'Prefer popular content' :
                 preferences.feedBehavior.recencyWeight > 70 ? 'Prefer newest content' :
                 'Balanced mix'}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={preferences.feedBehavior.recencyWeight}
                onValueChange={(val) => updateFeedBehavior('recencyWeight', val)}
                minimumTrackTintColor="#f59e0b"
                maximumTrackTintColor="#d1d5db"
              />
            </View>

            <View style={styles.behaviorItem}>
              <Text style={styles.behaviorLabel}>🎯 Variety vs Focus</Text>
              <Text style={styles.behaviorDescription}>
                {preferences.feedBehavior.diversityImportance < 30 ? 'More focused content' :
                 preferences.feedBehavior.diversityImportance > 70 ? 'More variety' :
                 'Balanced diversity'}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={preferences.feedBehavior.diversityImportance}
                onValueChange={(val) => updateFeedBehavior('diversityImportance', val)}
                minimumTrackTintColor="#8b5cf6"
                maximumTrackTintColor="#d1d5db"
              />
            </View>

            <View style={styles.behaviorItem}>
              <Text style={styles.behaviorLabel}>🔍 Explore vs Familiar</Text>
              <Text style={styles.behaviorDescription}>
                {preferences.feedBehavior.explorationVsExploitation < 30 ? 'Show familiar content' :
                 preferences.feedBehavior.explorationVsExploitation > 70 ? 'Discover new content' :
                 'Balanced exploration'}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={preferences.feedBehavior.explorationVsExploitation}
                onValueChange={(val) => updateFeedBehavior('explorationVsExploitation', val)}
                minimumTrackTintColor="#ef4444"
                maximumTrackTintColor="#d1d5db"
              />
            </View>
          </View>
        </View>

        {/* Advanced Settings Toggle */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advanced Settings */}
        {showAdvanced && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎛 Content Filters</Text>
              
              <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>
                  Reading Time: {preferences.contentFilters.minReadingTime}-{preferences.contentFilters.maxReadingTime} minutes
                </Text>
                
                <Text style={styles.filterSubLabel}>Quality Threshold: {preferences.contentFilters.contentQualityThreshold}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={preferences.contentFilters.contentQualityThreshold}
                  onValueChange={(val) => setPreferences(prev => ({
                    ...prev,
                    contentFilters: {
                      ...prev.contentFilters,
                      contentQualityThreshold: Math.round(val)
                    }
                  }))}
                  minimumTrackTintColor="#06b6d4"
                  maximumTrackTintColor="#d1d5db"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📡 Source Preferences</Text>
              {Object.entries(preferences.sourcePreferences).map(([source, value]) => (
                <View key={source} style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </Text>
                    <Text style={styles.sliderValue}>{value}%</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    value={value}
                    onValueChange={(val) => setPreferences(prev => ({
                      ...prev,
                      sourcePreferences: {
                        ...prev.sourcePreferences,
                        [source]: Math.round(val)
                      }
                    }))}
                    minimumTrackTintColor="#84cc16"
                    maximumTrackTintColor="#d1d5db"
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Reset Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  presetIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  behaviorContainer: {
    gap: 20,
  },
  behaviorItem: {
    marginBottom: 8,
  },
  behaviorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  behaviorDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  advancedToggle: {
    paddingVertical: 12,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  filterContainer: {
    gap: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  filterSubLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resetButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});