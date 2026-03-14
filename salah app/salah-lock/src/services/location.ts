import * as Location from 'expo-location';

export interface LocationData {
    latitude: number;
    longitude: number;
    city?: string;
}

export async function getCurrentLocation(): Promise<LocationData | null> {
    try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
            console.error('Location services are disabled');
            throw new Error('Location services are disabled. Please enable GPS.');
        }

        let locationPermissionGranted = false;
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            locationPermissionGranted = status === 'granted';
        } catch (e) {
            console.warn('Could not request location permission:', e);
        }

        let location;
        if (locationPermissionGranted) {
            try {
                location = await Promise.race([
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
                ]) as Location.LocationObject;
            } catch (e) {
                console.warn('getCurrentPositionAsync (Balanced) failed:', e);
                try {
                    location = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                    ]) as Location.LocationObject;
                } catch (e2) {
                    console.warn('getCurrentPositionAsync (Lowest) failed:', e2);
                    try {
                        location = await Location.getLastKnownPositionAsync();
                    } catch (e3) {
                        console.warn('getLastKnownPositionAsync failed:', e3);
                    }
                }
            }
        } else {
            console.warn('Location permission denied. Skipping GPS fetch.');
        }

        let latitude: number;
        let longitude: number;
        let city: string | undefined;

        if (location && location.coords) {
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            try {
                const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
                city = reverseGeocode[0]?.city || reverseGeocode[0]?.region || undefined;
            } catch (geocodeErr) {
                console.warn('Reverse geocoding failed:', geocodeErr);
            }
        } else {
            console.warn('Expo location failed. Falling back to IP-based location.');
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
                clearTimeout(timeout);
                const data = await response.json();

                if (data.latitude && data.longitude) {
                    latitude = data.latitude;
                    longitude = data.longitude;
                    city = data.city;
                    console.log('Successfully fetched location via IP API:', city);
                } else {
                    throw new Error('IP API returned incomplete data');
                }
            } catch (ipErr) {
                console.error('IP Geolocation failed:', ipErr);
                console.log('Using default location (New Delhi)');
                latitude = 28.6139;
                longitude = 77.209;
                city = 'New Delhi (default)';
            }
        }

        return { latitude, longitude, city };
    } catch (error: any) {
        console.error('Error getting location:', error);
        throw error;
    }
}
