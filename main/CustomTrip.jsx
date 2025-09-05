import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { debounce } from 'lodash';
import * as Location from 'expo-location';

const ITEM_HEIGHT = 80;
const DEBOUNCE_DELAY = 2000; // 2 second delay between requests

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LocationItem = ({ item, index, moveItem, positions }) => {
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isActive.value = true;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      isActive.value = false;
      const destination = Math.round(translateY.value / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(index + destination, positions.length - 1));
      if (newIndex !== index) {
        runOnJS(moveItem)(index, newIndex);
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive.value ? 1 : 0,
    shadowOpacity: withSpring(isActive.value ? 0.2 : 0),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.orderBlock, animatedStyle]}>
        <Text style={styles.orderNumber}>{index + 1}</Text>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationDetails}>
            {`${item.distance}mi • ${item.budget} • ${item.times}`}
          </Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => positions.onDelete(index)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const CustomTrip = ({ onClose, initialLocations = [], onSave }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [tripLocations, setTripLocations] = useState(initialLocations.map((loc, index) => ({
    id: index.toString(),
    name: loc.name || '',
    distance: loc.distance || 0,
    address: loc.address || '',
    times: loc.times || '',
    budget: loc.budget || '',
    lat: loc.lat || 0,
    lon: loc.lon || 0
  })));

  const deleteLocation = (index) => {
    setTripLocations(prev => prev.filter((_, i) => i !== index));
  };

  const saveTrip = () => {
    // Convert tripLocations to the expected format
    const formattedLocations = tripLocations.map((loc) => ({
      name: loc.name,
      distance: loc.distance,
      address: loc.address,
      times: loc.times,
      budget: loc.budget,
      lat: loc.lat,
      lon: loc.lon
    }));

    // Pass to parent component
    onSave(formattedLocations);
    onClose();
  };

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
      } catch (error) {
        setLocationError('Error getting location');
        console.error('Location error:', error);
      }
    };

    fetchUserLocation();
  }, []);

  // Debounced search function
  const searchLocations = useCallback(
    debounce(async (query, searchRadius = 0.1, useAdvancedSearch = false) => {
      if (query.length < 3 || !userLocation) {
        console.log('Search skipped - query too short or no location');
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      console.log(`Search attempt - Radius: ${searchRadius}, Advanced: ${useAdvancedSearch}`);

      try {
        const viewbox = [
          userLocation.longitude - searchRadius,
          userLocation.latitude - searchRadius,
          userLocation.longitude + searchRadius,
          userLocation.latitude + searchRadius
        ].join(',');

        const url = `https://nominatim.openstreetmap.org/search?` + 
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `viewbox=${viewbox}&` +
          `bounded=0&` +
          `limit=5` +
          (useAdvancedSearch ? `&addressdetails=1&dedupe=1&fuzzy=1` : '');

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TripMaker/1.0',
            'Accept-Language': 'en'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Found ${data.length} results with${useAdvancedSearch ? ' advanced' : ' basic'} search at radius ${searchRadius}`);

        if (data.length === 0) {
          if (!useAdvancedSearch) {
            console.log('No results found, trying advanced search with expanded radius...');
            return searchLocations(query, searchRadius * 1000, true);
          } else if (searchRadius < 10) {
            console.log('Still no results, expanding radius further...');
            return searchLocations(query, searchRadius * 10, true);
          }
        }

        setSearchResults(data);
      } catch (error) {
        console.error('Search error:', error.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_DELAY),
    [userLocation]
  );

  if (locationError) {
    return (
      <View style={styles.container}>
        <Text>Error loading location: {locationError}</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  const addLocation = (osmLocation) => {
    const newLocation = {
      id: Date.now().toString(),
      name: osmLocation.display_name.split(',')[0],
      distance: '0',
      address: osmLocation.display_name,
      times: '9:00 AM - 5:00 PM',
      budget: '$0',
      lat: parseFloat(osmLocation.lat),
      lon: parseFloat(osmLocation.lon)
    };

    setTripLocations(prev => [...prev, newLocation]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const moveItem = (fromIndex, toIndex) => {
    const newLocations = [...tripLocations];
    const item = newLocations.splice(fromIndex, 1)[0];
    newLocations.splice(toIndex, 0, item);
    setTripLocations(newLocations);
  };

  return (
    <GestureHandlerRootView>
      <TouchableOpacity 
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.panel}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.panelText}>Trip Details</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                isSearching && styles.searchInputLoading
              ]}
              placeholder={isSearching ? "Searching..." : "Search and add locations..."}
              value={searchQuery}
              onChangeText={(text) => {
                console.log(`Input changed: "${text}"`);
                setSearchQuery(text);
                searchLocations(text);
              }}
              editable={!isSearching}
            />
            {(searchQuery.length > 0) && (
              <View style={styles.searchResults}>
                {searchQuery.length < 3 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.loadingText}>Type at least 3 characters...</Text>
                  </View>
                ) : isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.searchResultItem}
                      onPress={() => addLocation(result)}
                    >
                      <Text style={styles.searchResultName}>
                        {result.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.searchResultAddress} numberOfLines={1}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>No results found</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <View style={styles.tripOrderContainer}>
              <Text style={styles.tripOrderTitle}>Drag to Reorder</Text>
              {tripLocations.map((item, index) => (
                <LocationItem
                  key={item.id}
                  item={item}
                  index={index}
                  moveItem={moveItem}
                  positions={{
                    length: tripLocations.length,
                    onDelete: deleteLocation
                  }}
                />
              ))}
            </View>
          </ScrollView>
          
          <TouchableOpacity 
            style={[
              styles.saveButton,
              { opacity: tripLocations.length === 0 ? 0.5 : 1 }
            ]}
            onPress={saveTrip}
            disabled={tripLocations.length === 0}
          >
            <Text style={styles.saveButtonText}>Save Trip</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
};

// Keep all your existing styles...
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: 400,
    height: SCREEN_HEIGHT * 0.8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  panelText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  tripOrderContainer: {
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  orderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    height: ITEM_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 20,
    color: '#666',
    width: 25,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: '#999',
  },
  scrollView: {
    marginTop: 15,
    width: '100%',
  },
  searchContainer: {
    width: '100%',
    paddingHorizontal: 15,
    marginBottom: 15,
    position: 'relative',
    zIndex: 999,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 12,
    color: '#666',
  },
  searchInputLoading: {
    backgroundColor: '#f0f0f0',
    color: '#999'
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    alignSelf: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 10,
    alignSelf: 'center',
  },
  deleteIcon: {
    fontSize: 18,
    color: '#ff4444',
  },
});

export default CustomTrip;