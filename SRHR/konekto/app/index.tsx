// App.js
// Correct:
import * as React from 'react';
//import {useEffect} from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
// import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, StatusBar } from 'react-native';
// import { tfjsModelService } from '../src/services/TFJSModelService';



import Chatbot from '../src/screens/Chatbot';
import HealthTracker from '../src/screens/HealthTracker';
import SafeSpace from '../src/screens/SafeSpace';
import Home from '../src/screens/Home';


// <SafeAreaProvider>
    //   <StatusBar barStyle="dark-content" backgroundColor="white" />
    //   <NavigationContainer>
    //     <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    //       <View style={styles.content}>
    //         <Stack.Navigator
    //           screenOptions={{
    //             headerShown: true,
    //             headerStyle: {
    //               backgroundColor: 'white',
    //             },
    //             cardStyle: { backgroundColor: 'white' }
    //           }}
    //         >
    //           <Stack.Screen name="Chat" component={Chatbot} />
    //           <Stack.Screen name="HealthTracker" component={HealthTracker} />
    //           <Stack.Screen name="SafeSpace" component={SafeSpace} />
    //         </Stack.Navigator>
    //       </View>
    //     </SafeAreaView>
    //   </NavigationContainer>
    // </SafeAreaProvider>


//const Stack = createStackNavigator();

export default function Index() {
  return (
    
    <Home/>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  }
});
