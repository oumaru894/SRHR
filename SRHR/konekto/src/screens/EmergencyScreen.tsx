// src/screens/EmergencyScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

type Hotline = {
  name: string;
  number: string;
  description?: string;
};

const defaultHotlines: Hotline[] = [
  {
    name: "National SRHR Hotline",
    number: "4455",
    description: "Confidential 24/7 SRHR support line.",
  },
  {
    name: "Liberia Red Cross",
    number: "+231770123456",
    description: "Emergency medical and counseling assistance.",
  },
  {
    name: "Women & Children Protection",
    number: "+231880654321",
    description: "Support for gender-based violence survivors.",
  },
];

export default function EmergencyScreen() {
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    loadHotlines();
    getLocation();
  }, []);

  const loadHotlines = async () => {
    try {
      const saved = await AsyncStorage.getItem("hotlines");
      setHotlines(saved ? JSON.parse(saved) : defaultHotlines);
    } catch (error) {
      console.warn("Error loading hotlines:", error);
      setHotlines(defaultHotlines);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(`${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`);
    } catch (error) {
      console.warn("Location error:", error);
    }
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Error", "Unable to make a call on this device.")
    );
  };

  return (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#E11D48" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Hotlines</Text>
        <Text style={styles.headerSubtitle}>
          Immediate access to verified SRHR support services.
        </Text>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E11D48" />
          <Text style={styles.loadingText}>Loading hotlines...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hotline Cards */}
          {hotlines.map((line, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleCall(line.number)}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="phone" color="#E11D48" size={22} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{line.name}</Text>
                {line.description && (
                  <Text style={styles.cardSubtitle}>{line.description}</Text>
                )}
                <Text style={styles.cardNumber}>{line.number}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Location Section */}
          <View style={styles.locationBox}>
            <View style={styles.locationHeader}>
              <MaterialCommunityIcons name="map-marker" color="#2563EB" size={20} />
              <Text style={styles.locationTitle}>Your Location</Text>
            </View>
            <Text style={styles.locationText}>
              {location
                ? `Approx. coordinates: ${location}`
                : "Location access is off. Enable it for nearby support."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.blueButton]} onPress={getLocation}>
              <MaterialCommunityIcons name="shield-check" color="#fff" size={18} />
              <Text style={styles.buttonText}>Update Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.greenButton]}
              onPress={() =>
                Alert.alert("Feature coming soon", "Nearby centers map in development.")
              }
            >
              <MaterialCommunityIcons name="heart-pulse" color="#fff" size={18} />
              <Text style={styles.buttonText}>Nearest Center</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    marginTop: StatusBar.currentHeight || 0,
  },
  header: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#fff",
    opacity: 0.8,
    marginTop: 6,
    fontSize: 13,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    backgroundColor: "#FEE2E2",
    borderRadius: 50,
    padding: 10,
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: "#B91C1C",
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 2,
  },
  cardNumber: {
    color: "#374151",
    fontSize: 13,
    marginTop: 4,
  },
  locationBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 1,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationTitle: {
    color: "#2563EB",
    fontWeight: "600",
    marginLeft: 6,
  },
  locationText: {
    color: "#374151",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  blueButton: {
    backgroundColor: "#2563EB",
  },
  greenButton: {
    backgroundColor: "#16A34A",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 13,
  },
});
