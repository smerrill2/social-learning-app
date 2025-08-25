import React, { useState, useEffect, createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/api';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Debug: Track user state changes
  useEffect(() => {
    console.log('🔄 AuthProvider: User state changed to:', user ? `${user.username} (${user.id})` : 'null');
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      // Development auto-login with mock user
      const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        console.log('🚀 DEV MODE: Auto-login enabled - creating mock user');
        
        // Create mock user for development
        const mockUser: User = {
          id: 'dev-user-123',
          username: 'DevUser',
          email: 'dev@example.com',
          profile: {
            displayName: 'Development User',
            bio: 'Auto-logged in development user',
          }
        };
        
        // Create mock token
        const mockToken = 'dev-token-123';
        await SecureStore.setItemAsync('authToken', mockToken);
        
        setUser(mockUser);
        console.log('✅ DEV MODE: Mock user logged in successfully!');
        setLoading(false);
        return;
      }
      
      // Normal auth check for production
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      // Token might be invalid, remove it
      await SecureStore.deleteItemAsync('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    console.log('🔑 Frontend: Starting login process');
    console.log('📧 Frontend: Email:', credentials.email);
    console.log('🔐 Frontend: Password length:', credentials.password?.length);
    
    try {
      console.log('📡 Frontend: Making API call to authService.login');
      const response = await authService.login(credentials);
      
      console.log('✅ Frontend: Login API call successful');
      console.log('🎫 Frontend: Received token:', response.token ? 'Yes' : 'No');
      console.log('👤 Frontend: Received user:', response.user ? 'Yes' : 'No');
      console.log('📊 Frontend: Full response:', JSON.stringify(response, null, 2));
      
      await SecureStore.setItemAsync('authToken', response.token);
      console.log('🔄 Frontend: About to setUser with:', JSON.stringify(response.user, null, 2));
      setUser(response.user);
      console.log('✅ Frontend: setUser called successfully');
      
      console.log('🎉 Frontend: Login completed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Frontend: Login error:', error);
      console.error('📊 Frontend: Error response:', error.response?.data);
      console.error('🔍 Frontend: Error status:', error.response?.status);
      
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.register(userData);
      await SecureStore.setItemAsync('authToken', response.token);
      setUser(response.user);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

