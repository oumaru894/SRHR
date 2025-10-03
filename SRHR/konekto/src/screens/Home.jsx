import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient'; // Change this import
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { WIDTH as WINDOW_WIDTH, HEIGHT as WINDOW_HEIGHT} from "../../assets/constant";
import { useNavigation } from '@react-navigation/native';

export default function Home() {

    const navigation = useNavigation();
    return (
        <>
            <StatusBar
            barStyle="light-content"
            backgroundColor="#5B6BFF"
            translucent={true}
            />
            <SafeAreaView style={styles.safe}>
            <LinearGradient
                colors={["#5B6BFF", "#9C83FF", "#BBAEFF"]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.container}
                >
            
                {/* Card */}
                
                <View style={styles.header}>
                    <Text accessibilityRole="header" style={styles.title}>
                    KONEKTOH
                    </Text>
                    <Text style={styles.subtitle}>Your Digital Health Companion</Text>
                </View>

                <View style={styles.actions}>
                    <ActionButton
                    iconName="message-text-outline"
                    iconBg="#E8E5FF"
                    iconColor="#6B5AFE"
                    titleTop="Chat with"
                    titleBottom="Assistant"
                    onPress={() => {
                        // navigation or handler
                        navigation.navigate('Chatbot');
                    }}
                    accessibilityLabel="Chat with Assistant"
                    />

                    <ActionButton
                    iconName="map-marker-outline"
                    iconBg="#E7F9EF"
                    iconColor="#3EC07C"
                    title="Find a One Stop Center"
                    onPress={() => {
                        navigation.navigate('OneStopMap');
                    }}
                    accessibilityLabel="Find a clinic"
                    />

                    <ActionButton
                    iconName="alert-circle-outline"
                    iconBg="#FFECEC"
                    iconColor="#FF6B6B"
                    title="Emergency Hotlines"
                    titleTextStyle={{ color: "#D23A3A" }}
                    onPress={() => {
                        console.log("Emergency hotlines pressed");
                    }}
                    accessibilityLabel="Emergency hotlines"
                    />
                </View>
                
            
            </LinearGradient>
            </SafeAreaView>
        </>
    );
}

// ... rest of your code (ActionButton component and styles remain the same)
/**
 * ActionButton - reusable touchable row to match the mockup.
 * props:
 *  - iconName: icon name from MaterialCommunityIcons
 *  - iconBg: circle background color
 *  - iconColor: icon color
 *  - title: single-line title (string)
 *  - titleTop + titleBottom: two-line title
 */


function ActionButton({
  iconName,
  iconBg,
  iconColor,
  title,
  titleTop,
  titleBottom,
  titleTextStyle,
  onPress,
  accessibilityLabel,
}) {
  const multiline = !!(titleTop && titleBottom);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.actionBtn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.leftIconWrap]}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Icon name={iconName} size={22} color={iconColor} />
        </View>
      </View>

      <View style={styles.actionTextWrap}>
        {multiline ? (
          <>
            <Text style={[styles.actionText, titleTextStyle]}>{titleTop}</Text>
            <Text style={[styles.actionText, styles.actionTextBold, titleTextStyle]}>
              {titleBottom}
            </Text>
          </>
        ) : (
          <Text style={[styles.actionText, styles.actionTextBold, titleTextStyle]}>
            {title}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,

    width: WINDOW_WIDTH,
    
    height: '100%',
    padding: 18,
  },
  
  header: {
    marginBottom: WINDOW_HEIGHT*0.1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
    textAlign: "center",
    
  },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },

  actions: {
    marginTop: 6,
    width: '100%',
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    // shadow to float the button slightly
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    height: WINDOW_HEIGHT*0.15,
    
  },

  leftIconWrap: {
    width: 54,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextWrap: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: "center",
  },

  actionText: {
    fontSize: 16,
    color: "#0E1538",
    lineHeight: 20,
  },

  actionTextBold: {
    fontWeight: "700",
  },
});
