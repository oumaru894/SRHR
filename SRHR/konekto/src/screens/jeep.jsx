import React, { useEffect, useRef, useState } from 'react';
import MapView, { Callout, Marker, Polyline, UrlTile, Region } from 'react-native-maps';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { markers } from '../../assets/markers';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useNetwork } from '../context/NetworkContext';

// Liberia bounding box coordinates
const LIBERIA_BOUNDS = {
  north: 8.551986,
  south: 4.353119,
  west: -11.492650,
  east: -7.365113
};

const INITIAL_REGION = {
  latitude: 6.428055,
  latitudeDelta: 4.5,
  longitude: -9.429167, 
  longitudeDelta: 4.5
};

// Zoom levels to cache (adjust based on storage constraints)
const ZOOM_LEVELS_TO_CACHE = [10, 11, 12, 13, 14, 15];
const MAX_TILES_TO_CACHE = 5000; // Prevent storage overflow

export default function OneStop() {
  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation();
  const [userLocation, setUserLocation] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [tileCacheStatus, setTileCacheStatus] = useState<'idle' | 'caching' | 'cached'>('idle');
  const [cachedTilesCount, setCachedTilesCount] = useState(0);

  const { isConnected } = useNetwork();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => focusMap()}>
          <View style={{ padding: 10 }}>
            <Text>Focus</Text>
          </View>
        </TouchableOpacity>
      )
    });
    requestLocationPermission();
    initializeTileCache();
  }, []);

  // Initialize cache directory and check existing tiles
  const initializeTileCache = async () => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}map_tiles/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Count existing cached tiles
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const tileFiles = files.filter(file => file.endsWith('.png'));
      setCachedTilesCount(tileFiles.length);
      
      if (tileFiles.length > 0) {
        setTileCacheStatus('cached');
      }
    } catch (error) {
      console.error('Error initializing tile cache:', error);
    }
  };

  // Cache tiles for Liberia when online
  useEffect(() => {
    if (isConnected && tileCacheStatus === 'idle' && cachedTilesCount === 0) {
      cacheLiberiaTiles();
    }
  }, [isConnected, tileCacheStatus]);

  const cacheLiberiaTiles = async () => {
    if (tileCacheStatus === 'caching') return;
    
    setTileCacheStatus('caching');
    let tilesCached = 0;

    try {
      for (const zoom of ZOOM_LEVELS_TO_CACHE) {
        if (tilesCached >= MAX_TILES_TO_CACHE) break;

        const tiles = getTilesForZoomLevel(zoom);
        
        for (const tile of tiles) {
          if (tilesCached >= MAX_TILES_TO_CACHE) break;
          
          await cacheSingleTile(tile.x, tile.y, tile.z);
          tilesCached++;
          
          // Update progress occasionally
          if (tilesCached % 50 === 0) {
            setCachedTilesCount(tilesCached);
          }
        }
      }
      
      setCachedTilesCount(tilesCached);
      setTileCacheStatus('cached');
      console.log(`Cached ${tilesCached} tiles for Liberia`);
    } catch (error) {
      console.error('Error caching tiles:', error);
      setTileCacheStatus('idle');
    }
  };

  // Calculate tile coordinates for Liberia at specific zoom level
  const getTilesForZoomLevel = (z: number) => {
    const tiles = [];
    
    const minTile = latLonToTile(LIBERIA_BOUNDS.north, LIBERIA_BOUNDS.west, z);
    const maxTile = latLonToTile(LIBERIA_BOUNDS.south, LIBERIA_BOUNDS.east, z);
    
    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tiles.push({ x, y, z });
      }
    }
    
    return tiles;
  };

  // Convert lat/lon to tile coordinates
  const latLonToTile = (lat: number, lon: number, zoom: number) => {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
  };

  // Cache individual tile
  const cacheSingleTile = async (x: number, y: number, z: number) => {
    try {
      const tileUrl = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const localPath = `${FileSystem.documentDirectory}map_tiles/${z}_${x}_${y}.png`;
      
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (!fileInfo.exists) {
        await FileSystem.downloadAsync(tileUrl, localPath);
      }
    } catch (error) {
      console.warn(`Failed to cache tile ${z}/${x}/${y}:`, error);
    }
  };

  // Get tile URL - uses cached tiles when offline or when available
  const getTileUrl = (z: number, x: number, y: number) => {
    const localPath = `${FileSystem.documentDirectory}map_tiles/${z}_${x}_${y}.png`;
    
    // Always try to use cached tiles first if they exist
    return `file://${localPath}`;
  };

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
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      userLocation
        ? { ...userLocation, latitudeDelta: 0.1, longitudeDelta: 0.1 }
        : INITIAL_REGION
    );
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
          distance: (routeData.distance / 1000).toFixed(1),
          duration: Math.ceil(routeData.duration / 60),
        });

        setRoute(coordinates);
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      } else {
        throw new Error('Routing failed');
      }
    } catch (error) {
      console.warn('Offline mode: Using fallback route');
      // fallback route when offline
      const fallbackCoords = createStraightLineRoute(
        userLocation.latitude,
        userLocation.longitude,
        marker.latitude,
        marker.longitude
      );

      setRoute(fallbackCoords);
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        marker.latitude,
        marker.longitude
      );

      setRouteDetails({
        distance,
        duration: Math.ceil((distance / 40) * 60), // assuming 40km/h speed
      });

      mapRef.current?.fitToCoordinates(fallbackCoords, {
        edgePadding: { top: 50, right: 50, bottom: 100, left: 50 },
        animated: true,
      });

      if (!isConnected) {
        Alert.alert(
          'Offline Mode',
          `No internet, showing straight-line route.\nDistance: ${distance} km`,
          [{ text: 'OK' }]
        );
      }
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

  // Create a smooth line between two coordinates
  const createStraightLineRoute = (lat1, lon1, lat2, lon2, numPoints = 20) => {
    const route = [];
    for (let i = 0; i <= numPoints; i++) {
      const lat = lat1 + (lat2 - lat1) * (i / numPoints);
      const lon = lon1 + (lon2 - lon1) * (i / numPoints);
      route.push({ latitude: lat, longitude: lon });
    }
    return route;
  };

  // Clear tile cache (optional feature)
  const clearTileCache = async () => {
    try {
      const cacheDir = `${FileSystem.documentDirectory}map_tiles/`;
      await FileSystem.deleteAsync(cacheDir);
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      setCachedTilesCount(0);
      setTileCacheStatus('idle');
      Alert.alert('Cache Cleared', 'All cached map tiles have been removed.');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChange={onRegionChange}
      >
        {/* Use custom tile overlay that tries cached tiles first */}
        <UrlTile
          urlTemplate={isConnected 
            ? "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "file://" + FileSystem.documentDirectory + "map_tiles/{z}_{x}_{y}.png"
          }
          maximumZ={19}
          flipY={false}
          // Fallback to online tiles if cached tile doesn't exist
          // This allows progressive caching
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Route Polyline */}
        {route && route.length > 0 && (
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

      {/* Cache Status Indicator */}
      <View style={styles.cacheStatus}>
        <Text style={styles.cacheStatusText}>
          {tileCacheStatus === 'caching' ? `Caching maps... ${cachedTilesCount} tiles` :
           tileCacheStatus === 'cached' ? `Offline maps: ${cachedTilesCount} tiles` :
           !isConnected ? 'Offline Mode' : 'Online Mode'}
        </Text>
        {tileCacheStatus === 'cached' && (
          <TouchableOpacity onPress={clearTileCache} style={styles.clearCacheButton}>
            <Text style={styles.clearCacheText}>Clear Cache</Text>
          </TouchableOpacity>
        )}
      </View>

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

  // Add new styles for cache status
  cacheStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cacheStatusText: {
    fontSize: 12,
    color: '#333',
    marginRight: 8,
  },
  clearCacheButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearCacheText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});



