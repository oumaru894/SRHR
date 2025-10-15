import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useNetwork } from "../context/NetworkContext";

export default function NetworkStatusIndicator() {
  const { isConnected, connectionType } = useNetwork();
  const opacity = new Animated.Value(1);

  useEffect(() => {
    // Create a pulsing animation when offline
    if (!isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      opacity.setValue(1);
    }
  }, [isConnected]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: isConnected ? "#4CAF50" : "#ff3b30",
            opacity: opacity,
          },
        ]}
      />
      <Text style={[
        styles.statusText,
        { color: isConnected ? "#4CAF50" : "#ff3b30" }
      ]}>
        {isConnected ? "Online" : "Offline"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
