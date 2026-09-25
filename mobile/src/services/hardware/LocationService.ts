/**
 * Menial Mobile - Hardware Location Service
 * 
 * Manages device GPS geolocation, runtime permissions, reverse geocoding,
 * and distance calculation for in-person job tracking and Section 49 Emergency SOS.
 */

import * as Location from 'expo-location';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  timestamp: number;
  addressText?: string;
  isSimulated?: boolean;
}

// Fallback Lagos Coordinates (Plot 14, Admiralty Way, Lekki Phase 1)
const DEFAULT_LAGOS_LOCATION: DeviceLocation = {
  latitude: 6.4380,
  longitude: 3.4280,
  accuracy: 10,
  altitude: 12,
  speed: 0,
  timestamp: Date.now(),
  addressText: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  isSimulated: true,
};

export class LocationService {
  /**
   * Requests foreground GPS permission from the user.
   */
  public static async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('LocationService.requestLocationPermissions error:', err);
      return false;
    }
  }

  /**
   * Checks current permission status without requesting.
   */
  public static async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Fetches the device's live GPS coordinates.
   * If permission is denied, GPS is disabled, or timed out, falls back gracefully to Lagos baseline.
   */
  public static async getCurrentLocation(): Promise<DeviceLocation> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermissions();
        if (!granted) {
          return { ...DEFAULT_LAGOS_LOCATION, timestamp: Date.now() };
        }
      }

      // Check if location services are enabled on device
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        return { ...DEFAULT_LAGOS_LOCATION, timestamp: Date.now() };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Optimized for speed & battery
      });

      const { latitude, longitude, accuracy, altitude, speed } = position.coords;

      // Reverse geocode to readable street address if possible
      let addressText: string | undefined;
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded && geocoded.length > 0) {
          const item = geocoded[0];
          const parts = [item.name, item.street, item.district, item.city, item.region].filter(Boolean);
          addressText = parts.join(', ');
        }
      } catch {
        // Reverse geocoding non-critical failure
      }

      return {
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        altitude: altitude ?? undefined,
        speed: speed ?? undefined,
        timestamp: position.timestamp,
        addressText: addressText || `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
        isSimulated: false,
      };
    } catch (err) {
      console.warn('LocationService.getCurrentLocation fallback:', err);
      return { ...DEFAULT_LAGOS_LOCATION, timestamp: Date.now() };
    }
  }

  /**
   * Calculates straight-line distance in kilometers between two GPS coordinates
   * using the Haversine formula.
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }
}
