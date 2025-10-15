// src/screens/Navigation.jsx
import * as React from 'react';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// screens
import Home from './Home';
import Chatbot from './Chatbot';
import OneStopMap from './OneStop';
import EmergencyScreen from './EmergencyScreen';


const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Home" 
            component={Home}
            options={{ headerShown: false }}    
          />
          <Stack.Screen 
            name="Chatbot" 
            component={Chatbot}
            options={{ headerShown: false }}
          />

          <Stack.Screen 
            name="OneStopMap" 
            component={OneStopMap}
            options={{ headerShown: false }}
          />

          <Stack.Screen 
            name="Hotlines" 
            component={EmergencyScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export default Navigation;