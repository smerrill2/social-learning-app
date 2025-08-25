import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, AntDesign, MaterialIcons } from '@expo/vector-icons';

interface NavItem {
  id: string;
  iconType: 'Ionicons' | 'AntDesign' | 'MaterialIcons';
  icon: string;
  onPress: () => void;
}

interface Props {
  activeTab: string;
  onTabPress: (tabId: string) => void;
}

export const BottomNavigation: React.FC<Props> = ({ 
  activeTab, 
  onTabPress
}) => {
  const navItems: NavItem[] = [
    {
      id: 'home',
      iconType: 'Ionicons',
      icon: 'home-outline',
      onPress: () => onTabPress('home'),
    },
    {
      id: 'books',
      iconType: 'AntDesign',
      icon: 'book',
      onPress: () => onTabPress('books'),
    },
    {
      id: 'analytics',
      iconType: 'MaterialIcons',
      icon: 'auto-graph',
      onPress: () => onTabPress('analytics'),
    },
    {
      id: 'profile',
      iconType: 'Ionicons',
      icon: 'person-outline',
      onPress: () => onTabPress('profile'),
    },
  ];

  const renderIcon = (item: NavItem, isActive: boolean) => {
    const color = isActive ? '#3b82f6' : '#6b7280';
    const size = 25; // Increased from 22 to 25 (15% increase)

    switch (item.iconType) {
      case 'Ionicons':
        return (
          <Ionicons
            name={isActive ? item.icon.replace('-outline', '') as any : item.icon as any}
            size={size}
            color={color}
          />
        );
      case 'AntDesign':
        return (
          <AntDesign
            name={item.icon as any}
            size={size}
            color={color}
          />
        );
      case 'MaterialIcons':
        return (
          <MaterialIcons
            name={item.icon as any}
            size={size}
            color={color}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              {renderIcon(item, isActive)}
              {isActive && <View style={styles.activeDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12, // Increased from 8 to 9 (15% increase)
    paddingHorizontal: 5, // Increased from 4 to 5 (15% increase)
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5, // Increased from 4 to 5 (15% increase)
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 5, // Increased from 4 to 5 (15% increase)
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 5, // Increased from 4 to 5 (15% increase)
    height: 5, // Increased from 4 to 5 (15% increase)
    backgroundColor: '#3b82f6',
    borderRadius: 2.5, // Adjusted for new size
  },
});