// components/Header.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const Header = ({ title, onBack, rightComponent }) => {
  return (
    <View style={styles.header}>
      {/* Back Button */}
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconContainer}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconContainer} />
      )}

      {/* Title */}
      <Text style={styles.headerTitle}>{title}</Text>

      {/* Right Component (optional) */}
      <View style={styles.iconContainer}>
        {rightComponent ? rightComponent : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#2A4D9B",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  iconContainer: {
    width: 24,
    alignItems: "center",
  },
});

export default Header


