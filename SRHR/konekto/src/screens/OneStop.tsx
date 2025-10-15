import React, { useEffect, useState } from "react";
import { MapView, Camera, UserLocation, PointAnnotation, ShapeSource, LineLayer } from "@maplibre/maplibre-react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { markers } from "../../assets/markers";
import { useNetwork } from "../context/NetworkContext";
import NetworkStatusIndicator from "../components/NetworkStatusIndicator";

const MAPTILER_KEY = Constants.expoConfig.extra.MAPTILER_KEY;

// Fallback local tiles directory (for offline use)
const TILE_CACHE_PATH = `${FileSystem.documentDirectory}maptiler_cache`;

console.log('TILE_CACHE_PATH (documentDirectory-based):', TILE_CACHE_PATH);

export default function OneStop() {
  const [userLocation, setUserLocation] = useState<any>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isConnected } = useNetwork();
  const [offlineTilesDownloaded, setOfflineTilesDownloaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [showRoute, setShowRoute] = useState(false);
  const [lastKnownLocation, setLastKnownLocation] = useState<any>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  useEffect(() => {
    requestLocationPermission();
    prepareOfflineTiles();

    return () => {
      // cleanup location watcher
      if (locationSubscription && typeof locationSubscription.remove === 'function') {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (isConnected && !offlineTilesDownloaded && userLocation) {
      downloadOfflineTiles();
    }
  }, [isConnected, offlineTilesDownloaded, userLocation]);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Location permission is required to show your position.");
      return;
    }

    try {
      // Try to get a last known position quickly
      const last = await Location.getLastKnownPositionAsync();
      if (last && last.coords) {
        setLastKnownLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        // set initial displayed position if not yet set
        if (!userLocation) {
          setUserLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        }
      }

      // Start continuous high-accuracy watch so we get the true GPS fix
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000, // ms
          distanceInterval: 1, // meters
        },
        (loc) => {
          if (loc && loc.coords) {
            const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(newLoc);
            setLastKnownLocation(newLoc);
            // debug
            console.log('Location update', newLoc, 'accuracy', loc.coords.accuracy);
          }
        }
      );
      setLocationSubscription(sub);
    } catch (e) {
      console.warn('Failed to start location watch', e);
      // fallback: single getCurrentPosition
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        setLastKnownLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      } catch (err) {
        console.warn('Failed to get current position', err);
      }
    }
  };

  // Create local folder for offline tiles
  const prepareOfflineTiles = async () => {
    try {
      const dir = await FileSystem.getInfoAsync(TILE_CACHE_PATH);
      if (!dir.exists) {
        await FileSystem.makeDirectoryAsync(TILE_CACHE_PATH, { intermediates: true });
      }
      setOfflineReady(true);
    } catch (error) {
      console.warn("Error preparing offline cache:", error);
    }
  };

  // Download tiles for offline use
  const downloadOfflineTiles = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    try {
      console.log('Starting offline tile download. TILE_CACHE_PATH=', TILE_CACHE_PATH, 'userLocation=', userLocation);
      // Define the area around the user's location (approximately 10km radius)
      const bounds = {
        minLat: userLocation.latitude - 0.1,
        maxLat: userLocation.latitude + 0.1,
        minLon: userLocation.longitude - 0.1,
        maxLon: userLocation.longitude + 0.1
      };

      // Download tiles for zoom levels 11-15
      for (let z = 11; z <= 15; z++) {
        const tilePath = `${TILE_CACHE_PATH}/z${z}`;
        await FileSystem.makeDirectoryAsync(tilePath, { intermediates: true });
        console.log(`Preparing tiles for z=${z}, tilePath=${tilePath}`);
        // Calculate tile coordinates for the bounding box
        const minTileX = Math.floor((bounds.minLon + 180) / 360 * Math.pow(2, z));
        const maxTileX = Math.floor((bounds.maxLon + 180) / 360 * Math.pow(2, z));
        const minTileY = Math.floor((1 - Math.log(Math.tan(bounds.maxLat * Math.PI / 180) + 1 / Math.cos(bounds.maxLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        const maxTileY = Math.floor((1 - Math.log(Math.tan(bounds.minLat * Math.PI / 180) + 1 / Math.cos(bounds.minLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

        // Download tiles
        for (let x = minTileX; x <= maxTileX; x++) {
          for (let y = minTileY; y <= maxTileY; y++) {
            const vectorUrl = `https://api.maptiler.com/maps/streets-v2/tiles/${z}/${x}/${y}.mvt?key=${MAPTILER_KEY}`;
            const rasterUrl = `https://api.maptiler.com/maps/streets-v2/tiles/${z}/${x}/${y}@2x.png?key=${MAPTILER_KEY}`;
            // Use z/x/y directory structure which MapLibre expects for tile templates
            const dirX = `${tilePath}/${x}`;
            const vectorFileName = `${dirX}/${y}.mvt`;
            const rasterFileName = `${dirX}/${y}.png`;

            // ensure x directory exists
            const dirInfo = await FileSystem.getInfoAsync(dirX);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(dirX, { intermediates: true });
            }

            const vectorFileInfo = await FileSystem.getInfoAsync(vectorFileName);
            const rasterFileInfo = await FileSystem.getInfoAsync(rasterFileName);
            if (!vectorFileInfo.exists) {
              try { 
                await FileSystem.downloadAsync(vectorUrl, vectorFileName);
                console.log('Downloaded vector tile', vectorFileName);
              } catch (e) { console.warn('Vector tile download failed', vectorUrl, e); }
            } else {
              // console.log('Vector tile exists', vectorFileName);
            }
            if (!rasterFileInfo.exists) {
              try { 
                await FileSystem.downloadAsync(rasterUrl, rasterFileName);
                console.log('Downloaded raster tile', rasterFileName);
              } catch (e) { console.warn('Raster tile download failed', rasterUrl, e); }
            } else {
              // console.log('Raster tile exists', rasterFileName);
            }
          }
        }
      }
      // List sample cached files for z=11 to help debugging
      try {
        const sampleDir = `${TILE_CACHE_PATH}/z11`;
        const sampleList = await FileSystem.readDirectoryAsync(sampleDir);
        console.log('Sample z11 directory contents count=', sampleList.length, 'sample files=', sampleList.slice(0,10));
      } catch (e) {
        console.warn('Failed to list sample cache directory', e);
      }
      setOfflineTilesDownloaded(true);
    } catch (error) {
      console.warn("Error downloading offline tiles:", error);
      Alert.alert("Error", "Failed to download offline map tiles");
    } finally {
      setLoading(false);
    }
  };

  // Compute an online route (OSRM public) - fallback to offline if it fails
  const computeRouteOnline = async (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
      console.log('computeRouteOnline requesting', url);
      const resp = await fetch(url);
      const data = await resp.json();
      console.log('computeRouteOnline response', data && data.code, data && data.routes && data.routes.length);
      if (data && data.routes && data.routes.length > 0) {
        const coords: Array<[number, number]> = data.routes[0].geometry.coordinates;
        setRouteCoords(coords);
        setShowRoute(true);
        return true;
      }
    } catch (e) {
      console.warn('Online routing failed', e);
    }
    return false;
  };

  // Compute an offline straight-line route by interpolating N points
  const computeRouteOffline = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }, segments = 64) => {
    const coords: Array<[number, number]> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = from.latitude + (to.latitude - from.latitude) * t;
      const lon = from.longitude + (to.longitude - from.longitude) * t;
      coords.push([lon, lat]);
    }
    setRouteCoords(coords);
    setShowRoute(true);
  };

  const onMarkerPress = async (marker: any) => {
  console.log('onMarkerPress called for', marker.name);
    setSelectedMarker(marker);
    // decide source location: prefer live userLocation when available, else lastKnownLocation
    const source = userLocation ?? lastKnownLocation;
    if (!source) {
      Alert.alert('Location unavailable', 'Cannot compute route because current location is unknown.');
      return;
    }

    // Try online routing first if connected
    if (isConnected) {
      const ok = await computeRouteOnline(source, { latitude: marker.latitude, longitude: marker.longitude });
  console.log('computeRouteOnline result', ok);
      if (!ok) {
        // fallback to offline straight-line
        computeRouteOffline(source, { latitude: marker.latitude, longitude: marker.longitude });
      }
    } else {
      // offline: use lastKnownLocation as source if exists
      const src = lastKnownLocation ?? source;
      computeRouteOffline(src, { latitude: marker.latitude, longitude: marker.longitude });
    }
  };

  // Get appropriate map style based on connection status
  const getMapStyle = () => {
    if (isConnected) {
      return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
    }
    // Use local raster XYZ tiles for offline mode (MapLibre handles raster tiles reliably)
      return {
      version: 8,
      sources: {
        'offline-tiles-raster': {
          type: 'raster',
          // Android/iOS MapLibre may require file:// prefix for local files. Provide both templates (file:// first).
          tiles: [`file://${TILE_CACHE_PATH}/z{z}/{x}/{y}.png`, `${TILE_CACHE_PATH}/z{z}/{x}/{y}.png`],
          tileSize: 256,
          maxzoom: 15,
          minzoom: 11
        }
      },
      layers: [
        {
          id: 'raster-tiles',
          type: 'raster',
          source: 'offline-tiles-raster',
          paint: {}
        }
      ]
    };
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={styles.map}
        mapStyle={getMapStyle()}
        zoomEnabled
        compassEnabled
        localizeLabels
      >
        {userLocation && (
          <Camera
            zoomLevel={13}
            centerCoordinate={[userLocation.longitude, userLocation.latitude]}
          />
        )}

        {/* Show user location */}
        <UserLocation visible={true} showsUserHeadingIndicator={true} />

        {/* Add markers from assets */}
        {markers.map((marker, index) => (
          <PointAnnotation
            key={`marker-${index}`}
            id={`marker-${index}`}
            coordinate={[marker.longitude, marker.latitude]}
            onSelected={() => onMarkerPress(marker)}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location-sharp" size={22} color="#2A4D9B" style={styles.markerIcon} />
              <View style={styles.markerDot} />
              <Text style={styles.markerLabel}>{marker.name}</Text>
            </View>
          </PointAnnotation>
        ))}
        {showRoute && routeCoords.length > 0 && (
          <ShapeSource id="routeSource" shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } }}>
            <LineLayer id="routeLine" style={{ lineColor: '#ff3b30', lineWidth: 4 }} />
          </ShapeSource>
        )}
      </MapView>

      {/* Status panel */}
      <View style={styles.statusPanel}>
        <NetworkStatusIndicator />
        <View style={styles.statusContent}>
          {loading ? (
            <ActivityIndicator size="small" color="#5B6BFF" />
          ) : (
            <Text style={styles.statusText}>
              {offlineTilesDownloaded 
                ? "Offline maps available ✅" 
                : offlineReady 
                  ? "Offline maps ready for download" 
                  : "Preparing offline maps..."}
            </Text>
          )}
        </View>
      </View>
      {/* Marker info / routing panel */}
      {selectedMarker && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>{selectedMarker.name}</Text>
          <Text style={styles.infoText}>{selectedMarker.type} — {selectedMarker.services}</Text>
          {selectedMarker.phone ? (
            <Text style={[styles.infoText, { fontWeight: '700' }]}>Phone: {selectedMarker.phone}</Text>
          ) : null}
          <View style={styles.infoActions}>
            <TouchableOpacity style={styles.routeButton} onPress={() => onMarkerPress(selectedMarker)}>
              <Text style={styles.routeButtonText}>Route</Text>
            </TouchableOpacity>
            {selectedMarker.phone ? (
              <TouchableOpacity style={[styles.routeButton, { backgroundColor: '#28A745' }]} onPress={() => { Linking.openURL(`tel:${selectedMarker.phone}`); }}>
                <Text style={styles.routeButtonText}>Call</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.closeButton} onPress={() => { setSelectedMarker(null); setShowRoute(false); }}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerDot: {
    width: 10,
    height: 10,
    backgroundColor: "#5B6BFF",
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "white",
  },
  markerLabel: {
    fontSize: 10,
    color: "#333",
    marginTop: 4,
  },
  markerIcon: {
    position: 'absolute',
    top: -10,
    left: -11,
    zIndex: 10,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#444',
    marginBottom: 8,
  },
  infoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeButton: {
    backgroundColor: '#2A4D9B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  routeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  statusPanel: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 10,
    width: "auto",
    minWidth: 200,
  },
  statusContent: {
    marginTop: 8,
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    color: "#333",
  },
});
