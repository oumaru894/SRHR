import React, { useEffect, useRef, useState } from 'react';
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useNavigation } from 'expo-router';
import { markers } from '../../assets/markers';
import * as Location from 'expo-location';

const INITIAL_REGION = {
  latitude: 7.241334844687561,
  latitudeDelta: 10.751601205428543,
  longitude: 2,
  longitudeDelta: 55
};

export default function OneStop() {
  const mapRef = useRef<any>(null);
  const navigation = useNavigation();
  const [userLocation, setUserLocation] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [routeDetails, setRouteDetails] = useState<any>(null);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={focusMap}>
          <View style={{ padding: 10 }}>
            <Text>Focus</Text>
          </View>
        </TouchableOpacity>
      )
    });
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const focusMap = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
    } else {
      mapRef.current?.animateToRegion(INITIAL_REGION);
    }
  };

  const onMarkerSelected = async (marker: any) => {
    setSelectedMarker(marker);
    
    if (userLocation) {
      await getRouteToMarker(marker);
    } else {
      Alert.alert(
        'Location Required',
        'We need your location to calculate the route. Please enable location services.',
        [{ text: 'OK' }]
      );
    }
  };

  // Get route using free OSRM service
  const getRouteToMarker = async (marker: any) => {
    if (!userLocation) return;

    setLoading(true);
    try {
      const origin = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      };
      const destination = {
        latitude: marker.latitude,
        longitude: marker.longitude
      };

      // Using OSRM (Open Source Routing Machine) - completely free
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coordinates = routeData.geometry.coordinates.map((coord: any) => ({
          latitude: coord[1],
          longitude: coord[0]
        }));

        setRouteDetails({
          distance: (routeData.distance / 1000).toFixed(1), // km
          duration: Math.ceil(routeData.duration / 60), // minutes
        });

        setRoute(coordinates);
        
        // Fit map to show the entire route
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
          animated: true,
        });

        Alert.alert(
          'Route Found',
          `Route to ${marker.name} calculated!\n\nDistance: ${(routeData.distance / 1000).toFixed(1)} km\nEstimated time: ${Math.ceil(routeData.duration / 60)} min`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Could not calculate route');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert(
        'Routing Error',
        'Could not calculate route. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setSelectedMarker(null);
    setRouteDetails(null);
    focusMap();
  };

  const calloutPressed = (marker: any) => {
    Alert.alert(
      marker.name,
      'What would you like to do?',
      [
        {
          text: 'Get Directions',
          onPress: () => onMarkerSelected(marker)
        },
        {
          text: 'Clear Route',
          onPress: clearRoute,
          style: 'destructive'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const onRegionChange = (region: Region) => {
    console.log(region);
  };

  // Calculate straight-line distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        onRegionChangeComplete={onRegionChange}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Route Polyline */}
        {route && (
          <Polyline
            coordinates={route}
            strokeColor="#5B6BFF"
            strokeWidth={5}
          />
        )}

        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            title={marker.name}
            coordinate={marker}
            onPress={() => onMarkerSelected(marker)}
            pinColor={selectedMarker?.name === marker.name ? "#FF6B6B" : "#5B6BFF"}
          >
            <Callout onPress={() => calloutPressed(marker)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{marker.name}</Text>
                {userLocation && (
                  <Text style={styles.calloutDistance}>
                    {calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      marker.latitude,
                      marker.longitude
                    )} km away
                  </Text>
                )}
                {routeDetails && selectedMarker?.name === marker.name && (
                  <Text style={styles.calloutRouteDetails}>
                    📍 {routeDetails.distance} km • ⏱️ {routeDetails.duration} min
                  </Text>
                )}
                <Text style={styles.calloutHint}>
                  Tap for directions
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Bottom Control Panel */}
      <View style={styles.bottomPanel}>
        {selectedMarker && route && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeTitle}>Route to {selectedMarker.name}</Text>
            {routeDetails && (
              <Text style={styles.routeDetails}>
                📍 {routeDetails.distance} km • ⏱️ {routeDetails.duration} min
              </Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={clearRoute}
              >
                <Text style={styles.secondaryButtonText}>Clear Route</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={() => onMarkerSelected(selectedMarker)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Recalculate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!selectedMarker && (
          <View style={styles.instructionPanel}>
            <Text style={styles.instructionText}>
              {userLocation 
                ? 'Tap any marker to get directions' 
                : 'Getting your location...'
              }
            </Text>
            {!userLocation && (
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={requestLocationPermission}
              >
                <Text style={styles.buttonText}>Enable Location</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5B6BFF" />
            <Text style={styles.loadingText}>Calculating route...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  calloutContainer: {
    padding: 10,
    minWidth: 200,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 14,
    color: '#5B6BFF',
    marginBottom: 4,
  },
  calloutRouteDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calloutHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  routeInfo: {
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  routeDetails: {
    fontSize: 16,
    color: '#5B6BFF',
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionPanel: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#5B6BFF',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});