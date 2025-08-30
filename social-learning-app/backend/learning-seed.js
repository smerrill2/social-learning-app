#!/usr/bin/env node

/**
 * Learning System Database Seeder
 * Creates sample learning data to demonstrate the novice learning journey
 */

const { Client } = require('pg');

// Database connection (using same config as app)
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'social_learning',
});

async function seedLearningData() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');

    // Create a novice user learning profile
    console.log('👤 Creating novice user learning profile...');
    
    const noviceProfile = {
      userId: 'novice-learner',
      skills: {
        artificial_intelligence: {
          level: 'beginner',
          experience: 25,
          confidence: 45,
          validated: false,
          lastAssessed: new Date().toISOString(),
          assessmentHistory: [
            {
              date: new Date().toISOString(),
              level: 'beginner',
              experience: 25,
              source: 'algorithm'
            }
          ]
        }
      },
      metrics: {
        totalContentConsumed: 3,
        averageEngagementRate: 0.75,
        preferredLearningTimes: ['19-22'],
        averageSessionDuration: 18,
        completionRate: 0.85,
        retentionScore: 65,
        applicationRate: 0.2
      },
      goals: {
        shortTerm: [
          {
            skill: 'artificial_intelligence',
            targetLevel: 'intermediate', 
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            priority: 'high',
            progress: 25
          }
        ],
        longTerm: [
          {
            skill: 'machine_learning',
            targetLevel: 'advanced',
            deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
            milestones: ['Complete ML fundamentals', 'Build first ML model', 'Deploy production model'],
            progress: 0
          }
        ],
        interests: ['artificial_intelligence', 'machine_learning', 'deep_learning']
      },
      streaks: {
        content_consumed: {
          current: 3,
          longest: 5,
          lastActivity: new Date().toISOString()
        }
      },
      difficultyPreference: 55,
      adaptiveLearningRate: 0.7,
      lastLearningActivity: new Date().toISOString()
    };

    // Insert user learning profile
    try {
      await client.query(`
        INSERT INTO user_learning_profiles (
          "userId", skills, metrics, goals, streaks, "difficultyPreference", 
          "adaptiveLearningRate", "lastLearningActivity", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        noviceProfile.userId,
        JSON.stringify(noviceProfile.skills),
        JSON.stringify(noviceProfile.metrics),
        JSON.stringify(noviceProfile.goals),
        JSON.stringify(noviceProfile.streaks),
        noviceProfile.difficultyPreference,
        noviceProfile.adaptiveLearningRate,
        noviceProfile.lastLearningActivity
      ]);
    } catch (err) {
      if (err.code !== '23505') throw err; // ignore duplicate key errors
    }

    console.log('✅ Created novice user learning profile');

    // Create sample achievements
    console.log('🏆 Creating sample achievements...');
    
    const achievements = [
      {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Complete your first learning activity',
        category: 'content_consumption',
        tier: 'bronze',
        criteria: JSON.stringify({ type: 'content_consumed', threshold: 1 }),
        statusPoints: 50,
        rarityScore: 10
      },
      {
        id: 'ai-novice',
        name: 'AI Novice',
        description: 'Reach beginner level in artificial intelligence',
        category: 'skill_mastery',
        tier: 'bronze',
        criteria: JSON.stringify({ type: 'skill_level', skill: 'artificial_intelligence', level: 'beginner' }),
        statusPoints: 100,
        rarityScore: 25
      },
      {
        id: 'learning-streak-3',
        name: 'Consistent Start',
        description: 'Maintain a 3-day learning streak',
        category: 'learning_streak',
        tier: 'bronze',
        criteria: JSON.stringify({ type: 'learning_streak', threshold: 3 }),
        statusPoints: 75,
        rarityScore: 20
      },
      {
        id: 'learning-streak-7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        category: 'learning_streak', 
        tier: 'silver',
        criteria: JSON.stringify({ type: 'learning_streak', threshold: 7 }),
        statusPoints: 200,
        rarityScore: 40
      }
    ];

    for (const achievement of achievements) {
      try {
        await client.query(`
          INSERT INTO achievements (id, name, description, category, tier, criteria, "statusPoints", "rarityScore", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
        `, [
          achievement.id, achievement.name, achievement.description, achievement.category,
          achievement.tier, achievement.criteria, achievement.statusPoints, achievement.rarityScore
        ]);
      } catch (err) {
        if (err.code !== '23505') throw err; // ignore duplicate key errors
      }
    }

    console.log('✅ Created sample achievements');

    // Award achievements to novice user
    console.log('🎉 Awarding achievements to novice user...');
    
    const userAchievements = [
      {
        userId: 'novice-learner',
        achievementId: 'first-steps',
        earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        earnedData: JSON.stringify({
          trigger: 'content_consumed',
          metrics: { contentId: 'ai-intro-paper', timeSpent: 15 }
        })
      },
      {
        userId: 'novice-learner', 
        achievementId: 'ai-novice',
        earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        earnedData: JSON.stringify({
          trigger: 'skill_level_reached',
          metrics: { skill: 'artificial_intelligence', level: 'beginner', experience: 15 }
        })
      },
      {
        userId: 'novice-learner',
        achievementId: 'learning-streak-3', 
        earnedAt: new Date().toISOString(), // today
        earnedData: JSON.stringify({
          trigger: 'learning_streak',
          metrics: { streakLength: 3, activityType: 'content_consumed' }
        })
      }
    ];

    for (const userAchievement of userAchievements) {
      try {
        await client.query(`
          INSERT INTO user_achievements ("userId", "achievementId", "earnedAt", "earnedData", "isVisible", "isPinned", "celebrationCount", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, true, false, 0, NOW(), NOW())
        `, [
          userAchievement.userId, userAchievement.achievementId, 
          userAchievement.earnedAt, userAchievement.earnedData
        ]);
      } catch (err) {
        if (err.code !== '23505') throw err; // ignore duplicate key errors
      }
    }

    console.log('✅ Awarded achievements to novice user');

    // Create content difficulty assessments
    console.log('📊 Creating content difficulty assessments...');
    
    const contentAssessments = [
      {
        contentId: 'ai-intro-paper',
        contentType: 'research',
        primarySkillArea: 'artificial_intelligence',
        secondarySkillAreas: [],
        overallDifficulty: 'beginner',
        difficultyMetrics: {
          conceptualComplexity: 3,
          prerequisiteKnowledge: 2,
          technicalDepth: 3,
          readingLevel: 4,
          timeToUnderstand: 15,
          applicationDifficulty: 3
        },
        learningOutcomes: {
          skills: ['artificial_intelligence'],
          concepts: ['machine_learning_basics', 'ai_definition', 'ai_applications'],
          prerequisites: [],
          followUpTopics: ['machine_learning', 'neural_networks'],
          confidenceBoost: 7
        },
        learningValue: 8,
        assessedBy: 'algorithm',
        confidence: 0.85
      },
      {
        contentId: 'ml-intermediate-paper', 
        contentType: 'research',
        primarySkillArea: 'artificial_intelligence',
        secondarySkillAreas: ['machine_learning'],
        overallDifficulty: 'intermediate',
        difficultyMetrics: {
          conceptualComplexity: 6,
          prerequisiteKnowledge: 5,
          technicalDepth: 7,
          readingLevel: 6,
          timeToUnderstand: 25,
          applicationDifficulty: 6
        },
        learningOutcomes: {
          skills: ['artificial_intelligence', 'machine_learning'],
          concepts: ['supervised_learning', 'neural_networks', 'gradient_descent'],
          prerequisites: ['artificial_intelligence_basics'],
          followUpTopics: ['deep_learning', 'advanced_algorithms'],
          confidenceBoost: 8
        },
        learningValue: 9,
        assessedBy: 'algorithm',
        confidence: 0.90
      },
      {
        contentId: 'ai-ethics-discussion',
        contentType: 'hackernews',
        primarySkillArea: 'artificial_intelligence',
        secondarySkillAreas: ['ethics', 'philosophy'],
        overallDifficulty: 'intermediate',
        difficultyMetrics: {
          conceptualComplexity: 5,
          prerequisiteKnowledge: 4,
          technicalDepth: 3,
          readingLevel: 6,
          timeToUnderstand: 12,
          applicationDifficulty: 7
        },
        learningOutcomes: {
          skills: ['artificial_intelligence', 'critical_thinking'],
          concepts: ['ai_ethics', 'bias_in_ai', 'responsible_ai'],
          prerequisites: ['artificial_intelligence_basics'],
          followUpTopics: ['ai_governance', 'fairness_in_ml'],
          confidenceBoost: 6
        },
        learningValue: 7,
        assessedBy: 'algorithm',
        confidence: 0.80
      }
    ];

    for (const assessment of contentAssessments) {
      try {
        await client.query(`
          INSERT INTO content_difficulty_assessments (
            "contentId", "contentType", "primarySkillArea", "secondarySkillAreas",
            "overallDifficulty", "difficultyMetrics", "learningOutcomes", "learningValue",
            "assessedBy", confidence, "validationCount", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NOW(), NOW())
        `, [
          assessment.contentId, assessment.contentType, assessment.primarySkillArea,
          JSON.stringify(assessment.secondarySkillAreas), assessment.overallDifficulty,
          JSON.stringify(assessment.difficultyMetrics), JSON.stringify(assessment.learningOutcomes),
          assessment.learningValue, assessment.assessedBy, assessment.confidence
        ]);
      } catch (err) {
        if (err.code !== '23505') throw err; // ignore duplicate key errors
      }
    }

    console.log('✅ Created content difficulty assessments');

    console.log('\n🎉 Learning system data seeded successfully!');
    console.log('\n📊 Novice User Profile Summary:');
    console.log('👤 User: novice-learner');
    console.log('🧠 AI Skill: Beginner level (25 XP, 45% confidence)');
    console.log('📈 Progress: 3 content pieces consumed, 85% completion rate');
    console.log('🔥 Current Streak: 3 days');
    console.log('🏆 Achievements: 3 earned (First Steps, AI Novice, Consistent Start)');
    console.log('🎯 Goal: Reach intermediate AI level in 30 days (25% progress)');
    
    console.log('\n🧪 Test the API with:');
    console.log('curl http://localhost:3000/learning/progress/novice-learner');
    console.log('curl http://localhost:3000/learning/achievements/novice-learner');
    console.log('curl http://localhost:3000/learning/recommendations/novice-learner');

  } catch (error) {
    console.error('❌ Error seeding learning data:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Check if we can connect to the database and run the seeder
if (require.main === module) {
  console.log('🌱 Learning System Database Seeder');
  console.log('=====================================\n');
  seedLearningData().catch(console.error);
}