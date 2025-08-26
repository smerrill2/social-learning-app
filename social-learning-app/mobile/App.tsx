import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoginForm } from './src/components/LoginForm';
import { RegisterForm } from './src/components/RegisterForm';
import { Feed } from './src/components/Feed';
import { DemoFeed } from './src/components/DemoFeed';
import { BottomNavigation } from './src/components/BottomNavigation';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { AlgorithmSettings } from './src/screens/AlgorithmSettings';
import { AlgorithmOnboarding } from './src/screens/AlgorithmOnboarding';
import { algorithmService } from './src/services/api';
import { AlgorithmPreferences } from './src/types';

type Screen = 'feed' | 'algorithm_settings' | 'algorithm_onboarding';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('feed');
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferences, setPreferences] = useState<AlgorithmPreferences | null>(null);
  
  // Header animation state
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && !showOnboarding) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const userPreferences = await algorithmService.getPreferences();
      setPreferences(userPreferences);
      
      // Check if user has completed onboarding (has any customized preferences)
      const hasCustomPreferences = 
        userPreferences.contentTypes.researchPapers !== 25 || // Default would be 25% each
        userPreferences.researchCategories.psychology !== 10 || // Default would be 10% each
        userPreferences.feedBehavior.explorationVsExploitation !== 50; // Default would be 50%
        
      if (!hasCustomPreferences) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Show onboarding on error to be safe
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = (newPreferences: AlgorithmPreferences) => {
    setPreferences(newPreferences);
    setShowOnboarding(false);
    setCurrentScreen('feed');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setCurrentScreen('feed');
  };

  const handleOpenAlgorithmSettings = () => {
    setCurrentScreen('algorithm_settings');
  };

  const handleSettingsBack = () => {
    setCurrentScreen('feed');
  };

  const handlePreferencesChanged = (newPreferences: AlgorithmPreferences) => {
    setPreferences(newPreferences);
  };

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Header animation functions
  const hideHeader = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showHeader = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleScroll = () => {
    if (!isScrolling) {
      setIsScrolling(true);
      hideHeader();
    }
    
    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Set new timeout to show header after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      showHeader();
    }, 1500); // Increased timeout to 1.5 seconds
  };

  // Reset header to visible on mount
  useEffect(() => {
    showHeader();
  }, []);
  
  console.log('📱 App: Render - user:', user ? `${user.username} (${user.id})` : 'null');
  console.log('📱 App: Render - loading:', loading);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingTitle}>Social Learning</Text>
          <Text style={styles.loadingSubtitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        {showRegister ? (
          <RegisterForm
            onSuccess={() => setShowRegister(false)}
            switchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm
            onSuccess={() => {
              console.log('📱 App: Login success callback triggered');
            }}
            switchToRegister={() => setShowRegister(true)}
          />
        )}
      </SafeAreaView>
    );
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <AlgorithmOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Show algorithm settings screen
  if (currentScreen === 'algorithm_settings') {
    return (
      <AlgorithmSettings
        onBack={handleSettingsBack}
        onPreferencesChanged={handlePreferencesChanged}
      />
    );
  }

  // Main app with feed
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          {activeTab === 'home' ? (
            <Feed 
              onOpenAlgorithmSettings={handleOpenAlgorithmSettings} 
              onScroll={undefined}
            />
          ) : activeTab === 'books' ? (
            <DemoFeed onScroll={undefined} />
          ) : (
            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
              <Text style={styles.comingSoonSubtext}>This feature is in development</Text>
            </View>
          )}
        </View>
        

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'white', // Match header background for seamless look
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
