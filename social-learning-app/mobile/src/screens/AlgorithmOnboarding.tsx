import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { algorithmService } from '../services/api';
import { AlgorithmPreferences } from '../types';

interface Props {
  onComplete: (preferences: AlgorithmPreferences) => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    icon: string;
    preferences: Partial<AlgorithmPreferences>;
  }>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'interests',
    title: 'What interests you most?',
    subtitle: 'Help us understand your learning preferences',
    icon: '🎯',
    options: [
      {
        id: 'psychology_focused',
        label: 'Psychology & Behavior',
        description: 'Human psychology, behavioral science, cognitive research',
        icon: '🧠',
        preferences: {
          researchCategories: { psychology: 80, behavioralScience: 70, cognitiveScience: 60 },
          contentTypes: { researchPapers: 60, insights: 30, hackernews: 10 }
        }
      },
      {
        id: 'tech_ai_focused',
        label: 'Tech & AI',
        description: 'AI/ML, computer science, tech industry news',
        icon: '🤖',
        preferences: {
          researchCategories: { artificialIntelligence: 80, computerScience: 70 },
          contentTypes: { hackernews: 40, researchPapers: 50, insights: 10 }
        }
      },
      {
        id: 'health_sciences',
        label: 'Health & Neuroscience',
        description: 'Medical research, neuroscience, health sciences',
        icon: '🏥',
        preferences: {
          researchCategories: { healthSciences: 80, neuroscience: 70, psychology: 40 },
          contentTypes: { researchPapers: 70, insights: 20, hackernews: 10 }
        }
      },
      {
        id: 'balanced_learner',
        label: 'Balanced Learning',
        description: 'Mix of all topics with balanced discovery',
        icon: '⚖️',
        preferences: {
          researchCategories: { 
            psychology: 50, artificialIntelligence: 50, healthSciences: 40,
            behavioralScience: 40, computerScience: 40
          },
          contentTypes: { researchPapers: 40, hackernews: 30, insights: 25, discussions: 5 }
        }
      }
    ]
  },
  {
    id: 'content_mix',
    title: 'What type of content do you prefer?',
    subtitle: 'Balance between different content sources',
    icon: '📊',
    options: [
      {
        id: 'research_heavy',
        label: 'Research Papers',
        description: 'Academic papers and scientific studies',
        icon: '📄',
        preferences: {
          contentTypes: { researchPapers: 70, insights: 20, hackernews: 10 }
        }
      },
      {
        id: 'practical_insights',
        label: 'Personal Insights',
        description: 'Real-world applications and user insights',
        icon: '💡',
        preferences: {
          contentTypes: { insights: 50, researchPapers: 30, hackernews: 20 }
        }
      },
      {
        id: 'industry_news',
        label: 'Industry News',
        description: 'Latest tech news and startup updates',
        icon: '📰',
        preferences: {
          contentTypes: { hackernews: 50, researchPapers: 30, insights: 20 }
        }
      },
      {
        id: 'mixed_content',
        label: 'Mixed Content',
        description: 'Balanced mix of all content types',
        icon: '🎭',
        preferences: {
          contentTypes: { researchPapers: 35, hackernews: 30, insights: 25, discussions: 10 }
        }
      }
    ]
  },
  {
    id: 'discovery_style',
    title: 'How do you like to discover new content?',
    subtitle: 'Your content discovery preferences',
    icon: '🔍',
    options: [
      {
        id: 'explorer',
        label: 'Explorer',
        description: 'Show me surprising and diverse content',
        icon: '🗺️',
        preferences: {
          feedBehavior: { 
            explorationVsExploitation: 80, 
            diversityImportance: 75,
            recencyWeight: 40,
            popularityWeight: 60
          }
        }
      },
      {
        id: 'focused',
        label: 'Focused',
        description: 'Stick to my interests and proven topics',
        icon: '🎯',
        preferences: {
          feedBehavior: { 
            explorationVsExploitation: 30, 
            diversityImportance: 35,
            popularityWeight: 70,
            socialSignalsWeight: 60
          }
        }
      },
      {
        id: 'trendy',
        label: 'Trending',
        description: 'Show popular and recent content first',
        icon: '🔥',
        preferences: {
          feedBehavior: { 
            popularityWeight: 80, 
            socialSignalsWeight: 70,
            recencyWeight: 60
          }
        }
      },
      {
        id: 'deep_diver',
        label: 'Deep Diver',
        description: 'Quality over quantity, longer reads',
        icon: '📚',
        preferences: {
          contentFilters: { 
            contentQualityThreshold: 80,
            minReadingTime: 5
          },
          feedBehavior: {
            popularityWeight: 40,
            diversityImportance: 50
          }
        }
      }
    ]
  }
];

export const AlgorithmOnboarding: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleOptionSelect = (stepId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [stepId]: optionId }));
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Merge all selected preferences
      const mergedPreferences: Partial<AlgorithmPreferences> = {};
      
      ONBOARDING_STEPS.forEach(step => {
        const selectedOptionId = selections[step.id];
        if (selectedOptionId) {
          const selectedOption = step.options.find(opt => opt.id === selectedOptionId);
          if (selectedOption) {
            // Deep merge preferences
            Object.keys(selectedOption.preferences).forEach(category => {
              const categoryPrefs = selectedOption.preferences[category as keyof AlgorithmPreferences];
              if (categoryPrefs) {
                if (!mergedPreferences[category as keyof AlgorithmPreferences]) {
                  mergedPreferences[category as keyof AlgorithmPreferences] = {} as any;
                }
                Object.assign(
                  mergedPreferences[category as keyof AlgorithmPreferences] as any,
                  categoryPrefs
                );
              }
            });
          }
        }
      });

      const updatedPreferences = await algorithmService.updatePreferences(mergedPreferences);
      onComplete(updatedPreferences);
    } catch (error) {
      console.error('Failed to save onboarding preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const selectedOption = selections[currentStepData.id];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const canProceed = selectedOption !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {ONBOARDING_STEPS.length}
          </Text>
        </View>
        
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Header */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentStepData.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption === option.id && styles.optionCardSelected
              ]}
              onPress={() => handleOptionSelect(currentStepData.id, option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    selectedOption === option.id && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedOption === option.id && styles.optionDescriptionSelected
                  ]}>
                    {option.description}
                  </Text>
                </View>
                {selectedOption === option.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIcon}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.footerSpacer} />
        
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed || saving}
          style={[
            styles.nextButton,
            (!canProceed || saving) && styles.nextButtonDisabled
          ]}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastStep ? 'Complete Setup' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepHeader: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
    paddingBottom: 32,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f8faff',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#3b82f6',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  optionDescriptionSelected: {
    color: '#1e40af',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  selectedIcon: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  footerSpacer: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});