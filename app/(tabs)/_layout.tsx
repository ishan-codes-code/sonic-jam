import { Tabs } from 'expo-router';
import { Download, Home, Library, Search, User } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';
import { theme } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#ffffff', // Spotify active tab is white
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          ...theme.typography.label,
          fontSize: 10,
          marginTop: -4,
          fontWeight: '500',
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 70, // Standard tab bar height with safe area
          backgroundColor: '#0A0A0A', // Deep dark for the tab bar
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Library color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="processing"
        options={{
          title: 'Processing',
          tabBarIcon: ({ color, size }) => <Download color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />,
        }}
      />
      {/* <Tabs.Screen
        name="player"
        options={{
          href: null, // hides from tab bar
        }}
      /> */}
    </Tabs>
  );
}
