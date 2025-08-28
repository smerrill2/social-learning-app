import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';

interface LearningProgressInsight {
  userId: string;
  overallProgressScore: number;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  skillGaps: string[];
  strengths: string[];
  recommendedActions: string[];
  nextMilestones: Array<{ skill: string; timeframe: string }>;
  motivationalMessage: string;
}

interface PersonalizedRecommendation {
  contentId: string;
  contentType: 'research' | 'hackernews' | 'insight' | 'challenge';
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  relevanceScore: number;
  learningValue: number;
  estimatedTimeMinutes: number;
  skillsAddressed: string[];
  whyRecommended: string;
  priorityLevel: 'high' | 'medium' | 'low';
}

interface Achievement {
  id: string;
  achievement: {
    name: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    category: string;
  };
  earnedAt: string;
}

const LearningDashboard: React.FC = () => {
  const [insights, setInsights] = useState<LearningProgressInsight | null>(null);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillArea, setSelectedSkillArea] = useState<string | null>(null);

  // Mock user ID for demo purposes
  const userId = 'demo-user-123';

  useEffect(() => {
    loadLearningData();
  }, [selectedSkillArea]);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      
      const [insightsRes, recommendationsRes, achievementsRes] = await Promise.all([
        fetch(`${api.baseURL}/learning/progress/${userId}`),
        fetch(`${api.baseURL}/learning/recommendations/${userId}${selectedSkillArea ? `?skillArea=${selectedSkillArea}` : ''}`),
        fetch(`${api.baseURL}/learning/achievements/${userId}`),
      ]);

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData);
      }

      if (recommendationsRes.ok) {
        const recommendationsData = await recommendationsRes.json();
        setRecommendations(recommendationsData);
      }

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setAchievements(achievementsData.slice(0, 5)); // Show recent 5
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
      Alert.alert('Error', 'Failed to load learning data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const trackActivity = async (contentId: string, contentType: string, skillArea: string) => {
    try {
      await fetch(`${api.baseURL}/learning/track-activity/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content_consumed',
          metadata: {
            contentId,
            contentType,
            skillArea,
            timeSpentMinutes: Math.floor(Math.random() * 20) + 5, // Simulated time
            completionRate: 0.8 + Math.random() * 0.2, // 80-100%
            difficultyLevel: 'intermediate',
          },
        }),
      });
      
      Alert.alert('Success', 'Learning activity tracked! Your progress has been updated.');
      loadLearningData(); // Refresh data
    } catch (error) {
      console.error('Failed to track activity:', error);
      Alert.alert('Error', 'Failed to track learning activity.');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#2196F3';
      case 'expert': return '#9C27B0';
      case 'master': return '#F44336';
      default: return '#757575';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      case 'diamond': return '#B9F2FF';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading your learning progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Learning Dashboard</Text>
          <Text style={styles.subtitle}>Your personalized learning journey</Text>
        </View>

        {/* Progress Overview */}
        {insights && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Learning Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressScore}>{insights.overallProgressScore}</Text>
                <Text style={styles.progressLabel}>Score</Text>
              </View>
              <View style={styles.progressDetails}>
                <View style={styles.levelBadge}>
                  <Text 
                    style={[styles.levelText, { color: getLevelColor(insights.currentLevel) }]}
                  >
                    {insights.currentLevel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.motivationalMessage}>{insights.motivationalMessage}</Text>
              </View>
            </View>
            
            {insights.strengths.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.skillsTitle}>💪 Your Strengths</Text>
                <View style={styles.skillsList}>
                  {insights.strengths.map((strength, index) => (
                    <View key={index} style={[styles.skillChip, { backgroundColor: '#E8F5E8' }]}>
                      <Text style={[styles.skillText, { color: '#2E7D32' }]}>{strength}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {insights.skillGaps.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.skillsTitle}>🎯 Areas to Improve</Text>
                <View style={styles.skillsList}>
                  {insights.skillGaps.map((gap, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.skillChip, { backgroundColor: '#FFF3E0' }]}
                      onPress={() => setSelectedSkillArea(gap)}
                    >
                      <Text style={[styles.skillText, { color: '#F57C00' }]}>{gap}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Recent Achievements</Text>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View 
                  style={[
                    styles.achievementBadge, 
                    { backgroundColor: getTierColor(achievement.achievement.tier) }
                  ]} 
                />
                <View style={styles.achievementDetails}>
                  <Text style={styles.achievementName}>{achievement.achievement.name}</Text>
                  <Text style={styles.achievementDescription}>
                    {achievement.achievement.description}
                  </Text>
                  <Text style={styles.achievementDate}>
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Personalized Recommendations */}
        <View style={styles.card}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.cardTitle}>📚 Recommended for You</Text>
            {selectedSkillArea && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => setSelectedSkillArea(null)}
              >
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {recommendations.length === 0 ? (
            <Text style={styles.noRecommendations}>
              No recommendations available. Start learning to get personalized content!
            </Text>
          ) : (
            recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationMeta}>
                    <View 
                      style={[
                        styles.priorityIndicator,
                        { backgroundColor: getPriorityColor(rec.priorityLevel) }
                      ]}
                    />
                    <Text style={styles.contentType}>{rec.contentType.toUpperCase()}</Text>
                    <Text 
                      style={[styles.difficulty, { color: getLevelColor(rec.difficulty) }]}
                    >
                      {rec.difficulty}
                    </Text>
                  </View>
                  <Text style={styles.estimatedTime}>{rec.estimatedTimeMinutes}min</Text>
                </View>
                
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.whyRecommended}>{rec.whyRecommended}</Text>
                
                <View style={styles.skillsAddressed}>
                  {rec.skillsAddressed.map((skill, skillIndex) => (
                    <View key={skillIndex} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.startLearningButton}
                  onPress={() => trackActivity(rec.contentId, rec.contentType, rec.skillsAddressed[0])}
                >
                  <Text style={styles.startLearningText}>Start Learning</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Next Milestones */}
        {insights?.nextMilestones && insights.nextMilestones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Next Milestones</Text>
            {insights.nextMilestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <Text style={styles.milestoneSkill}>{milestone.skill}</Text>
                <Text style={styles.milestoneTime}>{milestone.timeframe}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  progressLabel: {
    fontSize: 12,
    color: '#757575',
  },
  progressDetails: {
    flex: 1,
  },
  levelBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  motivationalMessage: {
    fontSize: 14,
    color: '#424242',
    fontStyle: 'italic',
  },
  skillsSection: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  clearFilterText: {
    fontSize: 12,
    color: '#757575',
  },
  noRecommendations: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  recommendationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  contentType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginRight: 8,
  },
  difficulty: {
    fontSize: 12,
    fontWeight: '600',
  },
  estimatedTime: {
    fontSize: 12,
    color: '#757575',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  whyRecommended: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  skillsAddressed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  skillTagText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  startLearningButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  startLearningText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  milestoneSkill: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  milestoneTime: {
    fontSize: 14,
    color: '#757575',
  },
});

export default LearningDashboard;