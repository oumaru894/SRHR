import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Chatbot from '../../screens/Chatbot';
import HealthTracker from '../../screens/HealthTracker';
import SafeSpace from '../../screens/SafeSpace';
import { Ionicons } from '@expo/vector-icons';

const Tab = createMaterialTopTabNavigator();

export default function NavigationBar() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          let iconName;

          if (route.name === 'chat') iconName = 'chatbubbles';
          else if (route.name === 'HealthTracker') iconName = 'heart';
          else iconName = 'shield-checkmark'; // SafeSpace

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: 'gold',
        tabBarInactiveTintColor: 'gray',
        tabBarShowIcon: true,
        tabBarIndicatorStyle: { backgroundColor: 'gold' },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { backgroundColor: 'white' },
      })}
    >
      <Tab.Screen name="chat" component={Chatbot} />
      <Tab.Screen name="HealthTracker" component={HealthTracker} />
      <Tab.Screen name="SafeSpace" component={SafeSpace} />
    </Tab.Navigator>
  );
}
