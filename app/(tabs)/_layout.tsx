import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';

const ACTIVE_COLOR = '#079A91';
const INACTIVE_COLOR = '#667085';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 10, backgroundColor: '#FFFFFF', borderTopColor: '#E7E9ED', borderTopWidth: 1 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="glicose" options={{ title: 'Glicose', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'water' : 'water-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="pressao" options={{ title: 'Pressão', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={23} color={color} /> }} />
      <Tabs.Screen name="remedios" options={{ title: 'Remédios', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'medical' : 'medical-outline'} size={22} color={color} /> }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: ({ color }) => <Ionicons name="menu-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );}