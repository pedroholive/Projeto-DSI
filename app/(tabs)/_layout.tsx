import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#0E9F8C',
        tabBarInactiveTintColor: '#737B8C',

        tabBarButton: HapticTab,

        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          elevation: 0,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {/* Início */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={25}
              color={color}
            />
          ),
        }}
      />

      {/* Glicose */}
      <Tabs.Screen
        name="glicose"
        options={{
          title: 'Glicose',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'water' : 'water-outline'}
              size={25}
              color={color}
            />
          ),
        }}
      />

      {/* Pressão */}
      <Tabs.Screen
  name="pressao"
  options={{
    title: 'Pressão',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'heart' : 'heart-outline'}
        size={25}
        color={color}
      />
    ),
  }}
/>

      {/* Remédios */}
      <Tabs.Screen
        name="remedios"
        options={{
          title: 'Remédios',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="medkit-outline"
              size={25}
              color={color}
            />
          ),
        }}
      />

      {/* Mais */}
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="menu-outline"
              size={27}
              color={color}
            />
          ),
        }}
      />

      {/* Mantém a antiga tela Explore fora da barra */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
