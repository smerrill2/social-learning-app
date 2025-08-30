#!/usr/bin/env node

/**
 * Learning Algorithm Demo - Shows how the system works conceptually
 * Run with: node learning-demo.js
 */

console.log('🧠 Social Learning Intelligence System Demo\n');

// Simulate user learning profile
const userProfile = {
  userId: 'demo-user',
  skills: {},
  metrics: {
    totalContentConsumed: 0,
    completionRate: 0,
    applicationRate: 0,
    averageSessionDuration: 0
  },
  streaks: {},
  goals: {
    shortTerm: [
      { skill: 'artificial_intelligence', targetLevel: 'intermediate', priority: 'high' }
    ]
  },
  difficultyPreference: 60 // slightly prefers challenge
};

// Simulate content database
const contentDatabase = [
  {
    id: 'ai-intro-paper',
    type: 'research',
    title: 'Introduction to Artificial Intelligence',
    skillArea: 'artificial_intelligence',
    difficulty: 'beginner',
    learningValue: 8,
    timeMinutes: 15
  },
  {
    id: 'ml-advanced-paper',
    type: 'research', 
    title: 'Advanced Machine Learning Techniques',
    skillArea: 'artificial_intelligence',
    difficulty: 'advanced',
    learningValue: 9,
    timeMinutes: 45
  },
  {
    id: 'ai-ethics-discussion',
    type: 'hackernews',
    title: 'Ethics in AI Development',
    skillArea: 'artificial_intelligence', 
    difficulty: 'intermediate',
    learningValue: 7,
    timeMinutes: 12
  }
];

// Simulate achievement definitions
const achievements = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first learning activity',
    tier: 'bronze',
    criteria: { type: 'content_consumed', threshold: 1 },
    statusPoints: 50
  },
  {
    id: 'ai-beginner',
    name: 'AI Novice',
    description: 'Reach beginner level in artificial intelligence',
    tier: 'bronze',
    criteria: { type: 'skill_level', skill: 'artificial_intelligence', level: 'beginner' },
    statusPoints: 100
  },
  {
    id: 'learning-streak',
    name: 'Consistent Learner',
    description: 'Maintain a 7-day learning streak',
    tier: 'silver',
    criteria: { type: 'learning_streak', threshold: 7 },
    statusPoints: 200
  }
];

// Core Algorithm Functions

function skillLevelToNumber(level) {
  const map = { beginner: 1, intermediate: 2, advanced: 3, expert: 4, master: 5 };
  return map[level] || 1;
}

function calculateOptimalDifficulty(userSkill, difficultyPreference) {
  if (!userSkill) return 'beginner';
  
  const baseLevel = skillLevelToNumber(userSkill.level);
  const preferenceAdjustment = (difficultyPreference - 50) / 50; // -1 to 1
  
  let adjustedLevel = baseLevel + (preferenceAdjustment * 0.5);
  adjustedLevel = Math.max(1, Math.min(4, Math.round(adjustedLevel)));
  
  const levels = ['', 'beginner', 'intermediate', 'advanced', 'expert'];
  return levels[adjustedLevel] || 'beginner';
}

function calculateRelevanceScore(content, userSkill, profile) {
  let score = 0.5; // base score
  
  // Difficulty match
  if (userSkill) {
    const optimalDiff = calculateOptimalDifficulty(userSkill, profile.difficultyPreference);
    if (content.difficulty === optimalDiff) score += 0.3;
  }
  
  // Goal alignment  
  if (profile.goals.shortTerm.some(g => g.skill === content.skillArea)) {
    score += 0.2;
  }
  
  return Math.min(1, score);
}

function generateRecommendations(profile) {
  const targetSkills = profile.goals.shortTerm.map(g => g.skill);
  const recommendations = [];
  
  for (const skill of targetSkills) {
    const userSkill = profile.skills[skill];
    const optimalDifficulty = calculateOptimalDifficulty(userSkill, profile.difficultyPreference);
    
    const relevantContent = contentDatabase.filter(c => 
      c.skillArea === skill && c.difficulty === optimalDifficulty
    );
    
    for (const content of relevantContent) {
      const relevanceScore = calculateRelevanceScore(content, userSkill, profile);
      
      recommendations.push({
        ...content,
        relevanceScore,
        whyRecommended: userSkill ? 
          `Perfect ${content.difficulty} match for your ${skill} level` :
          `Great introduction to ${skill}`,
        priorityLevel: relevanceScore >= 0.8 ? 'high' : relevanceScore >= 0.6 ? 'medium' : 'low'
      });
    }
  }
  
  return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function trackLearningActivity(profile, activityData) {
  const { skillArea, timeSpentMinutes, completionRate, difficultyLevel } = activityData;
  
  // Update metrics
  profile.metrics.totalContentConsumed += 1;
  profile.metrics.averageSessionDuration = 
    ((profile.metrics.averageSessionDuration * (profile.metrics.totalContentConsumed - 1)) + timeSpentMinutes) 
    / profile.metrics.totalContentConsumed;
  profile.metrics.completionRate = 
    ((profile.metrics.completionRate * (profile.metrics.totalContentConsumed - 1)) + completionRate)
    / profile.metrics.totalContentConsumed;
  
  // Update skill
  if (!profile.skills[skillArea]) {
    profile.skills[skillArea] = {
      level: 'beginner',
      experience: 0,
      confidence: 50,
      validated: false,
      lastAssessed: new Date()
    };
  }
  
  const skill = profile.skills[skillArea];
  const experienceGain = { beginner: 5, intermediate: 10, advanced: 20, expert: 30 }[difficultyLevel] || 10;
  skill.experience += experienceGain;
  
  // Level up if needed
  if (skill.experience >= 100 && skill.level === 'beginner') {
    skill.level = 'intermediate';
    skill.experience = skill.experience - 100;
    console.log(`🎉 Level up! User reached ${skill.level} in ${skillArea}!`);
  }
  
  // Update streaks
  if (!profile.streaks.content_consumed) {
    profile.streaks.content_consumed = { current: 0, longest: 0, lastActivity: null };
  }
  profile.streaks.content_consumed.current += 1;
  profile.streaks.content_consumed.longest = Math.max(
    profile.streaks.content_consumed.longest,
    profile.streaks.content_consumed.current
  );
  profile.streaks.content_consumed.lastActivity = new Date();
  
  return profile;
}

function checkAchievements(profile) {
  const earnedAchievements = [];
  
  for (const achievement of achievements) {
    const { criteria } = achievement;
    let earned = false;
    
    switch (criteria.type) {
      case 'content_consumed':
        earned = profile.metrics.totalContentConsumed >= criteria.threshold;
        break;
      case 'skill_level':
        const skill = profile.skills[criteria.skill];
        earned = skill && skillLevelToNumber(skill.level) >= skillLevelToNumber(criteria.level);
        break;
      case 'learning_streak':
        const streak = profile.streaks.content_consumed;
        earned = streak && streak.current >= criteria.threshold;
        break;
    }
    
    if (earned) {
      earnedAchievements.push(achievement);
    }
  }
  
  return earnedAchievements;
}

function generateProgressInsights(profile) {
  const skills = Object.values(profile.skills);
  const avgLevel = skills.length ? 
    skills.reduce((sum, s) => sum + skillLevelToNumber(s.level), 0) / skills.length : 1;
  
  const progressScore = Math.round((avgLevel - 1) / 4 * 100); // 0-100
  
  const skillGaps = Object.entries(profile.skills)
    .filter(([_, skill]) => skill.experience < 50 || skill.confidence < 60)
    .map(([name]) => name);
    
  const strengths = Object.entries(profile.skills)
    .filter(([_, skill]) => skill.level === 'advanced' || skill.level === 'expert')
    .map(([name]) => name);
  
  return {
    overallProgressScore: progressScore,
    currentLevel: avgLevel <= 1 ? 'beginner' : avgLevel <= 2 ? 'intermediate' : 
                  avgLevel <= 3 ? 'advanced' : 'expert',
    skillGaps,
    strengths,
    recommendedActions: [
      profile.metrics.completionRate < 0.8 ? 'Focus on completing started content' : null,
      skillGaps.length > 0 ? `Study ${skillGaps[0]} to fill knowledge gaps` : null,
      profile.streaks.content_consumed?.current < 7 ? 'Build a consistent daily learning habit' : null
    ].filter(Boolean),
    motivationalMessage: progressScore < 25 ? 'Great start! You\'re building your foundation.' :
                        progressScore < 50 ? 'You\'re making solid progress. Keep it up!' :
                        progressScore < 75 ? 'Excellent work! You\'re becoming an expert.' :
                        'Outstanding! You\'re at the top of your field.'
  };
}

// Simulation Demo
console.log('👤 Initial User Profile:');
console.log(JSON.stringify(userProfile, null, 2));
console.log('\n📚 Available Content:');
contentDatabase.forEach(c => console.log(`- ${c.title} (${c.difficulty}, ${c.type})`));

console.log('\n🎯 Initial Recommendations (empty skills):');
let recommendations = generateRecommendations(userProfile);
recommendations.forEach(r => console.log(`- ${r.title}: ${r.whyRecommended} (${r.priorityLevel} priority)`));

console.log('\n📖 Simulating user reads "Introduction to AI"...');
trackLearningActivity(userProfile, {
  skillArea: 'artificial_intelligence',
  timeSpentMinutes: 15,
  completionRate: 1.0,
  difficultyLevel: 'beginner'
});

console.log('\n✅ Updated User Profile:');
console.log(`Skills: ${JSON.stringify(userProfile.skills, null, 2)}`);
console.log(`Metrics: ${JSON.stringify(userProfile.metrics, null, 2)}`);

console.log('\n🏆 Checking for achievements...');
const earned = checkAchievements(userProfile);
earned.forEach(a => console.log(`🎉 Achievement Earned: ${a.name} (${a.tier}) - ${a.description}`));

console.log('\n📊 Progress Insights:');
const insights = generateProgressInsights(userProfile);
console.log(JSON.stringify(insights, null, 2));

console.log('\n🎯 New Recommendations (after learning):');
recommendations = generateRecommendations(userProfile);
recommendations.forEach(r => console.log(`- ${r.title}: ${r.whyRecommended} (${r.priorityLevel} priority)`));

console.log('\n🔄 Simulating 6 more learning sessions...');
for (let i = 2; i <= 7; i++) {
  trackLearningActivity(userProfile, {
    skillArea: 'artificial_intelligence',
    timeSpentMinutes: Math.floor(Math.random() * 20) + 10,
    completionRate: 0.8 + Math.random() * 0.2,
    difficultyLevel: i <= 3 ? 'beginner' : 'intermediate'
  });
}

console.log('\n🏆 Final Achievement Check:');
const finalAchievements = checkAchievements(userProfile);
finalAchievements.forEach(a => console.log(`🎉 ${a.name} (${a.tier}) - ${a.statusPoints} points`));

console.log('\n📊 Final Progress Report:');
const finalInsights = generateProgressInsights(userProfile);
console.log(`Progress Score: ${finalInsights.overallProgressScore}%`);
console.log(`Current Level: ${finalInsights.currentLevel}`);
console.log(`Skills: AI Level ${userProfile.skills.artificial_intelligence.level} (${userProfile.skills.artificial_intelligence.experience} XP)`);
console.log(`Learning Streak: ${userProfile.streaks.content_consumed.current} days`);
console.log(`Completion Rate: ${Math.round(userProfile.metrics.completionRate * 100)}%`);
console.log(`Motivation: ${finalInsights.motivationalMessage}`);

console.log('\n✅ Learning Intelligence System Demo Complete!');
console.log('\nThis shows how users get smarter through:');
console.log('🧠 Adaptive difficulty progression');  
console.log('🏆 Status recognition via achievements');
console.log('📈 Measurable skill development');
console.log('🎯 Personalized learning paths');