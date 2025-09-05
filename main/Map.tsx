import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { handlePlanTrip } from './tripMaker';
import PlanTripOptions from './PlanTripOptions';
import { RouteCreator } from './RouteCreator';
import { useLocations } from './LocationsContext';

const theme = {
  light: {
    colors: {
      background: '#ffffff',
    }
  }
};



const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;


interface TripParams {
  searchQueries: string[];
  budget: string;
  distance: number;
  timeRange: {
    start: string;
    end: string;
  };
}

interface TripMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
  order: number;
}

interface OrderedMarkerProps {
  order: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
}

const OrderedMarker = ({ order, coordinate, title, description }: OrderedMarkerProps) => {
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
    >
      <View style={styles.waypointMarker}>
        <Text style={styles.waypointNumber}>{order}</Text>
      </View>
    </Marker>
  );
};

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [showTripOptions, setShowTripOptions] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  
  const { tripMarkers, setLocations } = useLocations() as { 
    tripMarkers: TripMarker[],
    setLocations: any
  };

  const clearTripMarkers = () => {
    setLocations([]);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const currentLocation = await Location.getCurrentPositionAsync({});
      
      setLocation(currentLocation);
      setRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      {showTripOptions && (
        <PlanTripOptions 
          visible={showTripOptions}
          onClose={() => setShowTripOptions(false)}
          onSubmit={async (options: TripParams) => {
            try {
              const places = await handlePlanTrip(
                location?.coords.latitude || 29.0134668, 
                location?.coords.longitude || -81.3074748, 
                options
              );
              console.log(places);
            } catch (error) {
              console.error('Error planning trip:', error);
            }
          }}
        />
      )}

      {region && location && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsUserLocation={true}
            zoomEnabled
            zoomControlEnabled
          >
            {tripMarkers && tripMarkers.map((marker, index) => (
              <OrderedMarker
                key={marker.id}
                order={index + 1}
                coordinate={marker.coordinate}
                title={marker.title}
                description={marker.description}
              />
            ))}

            {tripMarkers && tripMarkers.length > 1 && (
              <RouteCreator
                waypoints={tripMarkers.map(marker => marker.coordinate)}
                apiKey={GOOGLE_MAPS_APIKEY}
              />
            )}
          </MapView>
        </View>
      )}

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          onPress={() => {
            clearTripMarkers();
            setShowTripOptions(true);
          }}
          style={styles.planTripButton}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Plan Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ...styles remain the same...
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: theme.light.colors.background,
  },
  mapContainer: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  planTripButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  waypointMarker: {
    backgroundColor: '#000',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  waypointNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});