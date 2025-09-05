import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import {DateTimePickerModal} from 'react-native-modal-datetime-picker';
import Slider from '@react-native-community/slider';
import CustomTrip from './CustomTrip';  
import { handlePlanTrip } from './tripMaker';
import { useLocations } from './LocationsContext';
import * as Location from 'expo-location';

const PlanTripOptions = ({ visible, onClose, onSubmit }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [distance, setDistance] = useState(5);
  const [showCustomTrip, setShowCustomTrip] = useState(false);
  const [showMainPanel, setShowMainPanel] = useState(false);
  const [showChoicePanel, setShowChoicePanel] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const { locations, setLocations } = useLocations();

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getUserLocation();
  }, []);

  const handleDistanceChange = (value) => {
    setDistance(value);
  };

  const handleBudgetChange = (text) => {
    const numericValue = text.replace(/\D/g, '');
    setBudget(numericValue);
  };

  const handleStartConfirm = (time) => {
    setStartPickerVisible(false);
    setStartTime(time);
  };

  const handleEndConfirm = (time) => {
    setEndPickerVisible(false);
    setEndTime(time);
  };

  const handleSearchInput = (text) => {
    setSearchQuery(text);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async () => {
    if (!userLocation) {
      console.error('User location not available');
      return;
    }

    const tripParams = {
      searchQueries: searchQuery.split(',').map(term => term.trim()).filter(Boolean),
      budget,
      distance,
      timeRange: {
        start: formatTime(startTime),
        end: formatTime(endTime)
      }
    };
    console.log('Trip params:', tripParams);

    try {
      const formattedLocations = await handlePlanTrip(
        userLocation.latitude,
        userLocation.longitude,
        tripParams
      );
      console.log('Got formatted locations:', formattedLocations);
      
      setLocations(formattedLocations);
      console.log('Updated locations in context');
      
      setShowMainPanel(false);
      setShowCustomTrip(true);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  if (!visible) return null;

  return (
    <TouchableOpacity 
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      {showChoicePanel ? (
        <TouchableOpacity 
          style={styles.panel}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          <Text style={styles.panelText}>Choose Your Planner Setup</Text>
          <View style={styles.choiceContainer}>
            <TouchableOpacity 
              style={styles.choiceButton}
              onPress={() => {
                setShowChoicePanel(false);
                setShowMainPanel(true);
              }}
            >
              <Text style={styles.choiceButtonText}>AI Planner</Text>
            </TouchableOpacity>
            
            <Text style={styles.orText}>or</Text>
            
            <TouchableOpacity 
              style={styles.choiceButton}
              onPress={() => {
                setShowChoicePanel(false);
                setShowCustomTrip(true);
              }}
            >
              <Text style={styles.choiceButtonText}>Custom Trip</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ) : showMainPanel ? (
        <TouchableOpacity 
          style={styles.panel}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setShowMainPanel(false);
              setShowChoicePanel(true);
            }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.panelText}>Trip Options</Text>
          <Text style={styles.inputLabel3}>Look for places (no need to get specific):</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. restaurant, park, museum (separate with commas)"
              value={searchQuery}
              onChangeText={handleSearchInput}
            />
          </View>
          
          <View style={styles.optionsRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel2}>Budget:</Text>
              <View style={styles.budgetContainer}>
                <TextInput
                  value={budget ? `$${budget}` : ''}
                  onChangeText={(input) => handleBudgetChange(input)}
                  keyboardType="numeric"
                  style={styles.budgetInput}
                  maxLength={7}
                  placeholder='$'
                />
              </View>
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel4}>Time Range:</Text>
              <View style={styles.timeContainer}>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setStartPickerVisible(true)}
                >
                  <Text>{formatTime(startTime)}</Text>
                </TouchableOpacity>
                
                <Text style={styles.timeSeparator}>-</Text>
                
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setEndPickerVisible(true)}
                >
                  <Text>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.distanceContainer}>
            <Text style={styles.inputLabel2}>Distance:</Text>
            <View style={styles.sliderContent}>
              <Text style={styles.sliderLabel}>Close</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.01}
                maximumValue={1}
                value={distance}
                onValueChange={handleDistanceChange}
                minimumTrackTintColor="#000"
                maximumTrackTintColor="#ddd"
                step={0.01}
              />
              <Text style={styles.sliderLabel}>Far</Text>
            </View>
          </View>

          <DateTimePickerModal
            isVisible={isStartPickerVisible}
            mode="time"
            onConfirm={handleStartConfirm}
            onCancel={() => setStartPickerVisible(false)}
          />

          <DateTimePickerModal
            isVisible={isEndPickerVisible}
            mode="time"
            onConfirm={handleEndConfirm}
            onCancel={() => setEndPickerVisible(false)}
          />

          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleSubmit}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : showCustomTrip ? (
        <CustomTrip 
          onClose={() => {
            setShowCustomTrip(false);
            setShowChoicePanel(true);
          }}
          initialLocations={locations}
          onSave={(formattedLocations) => {
            setLocations(formattedLocations);
            setShowCustomTrip(false);
            onClose();
          }}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
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
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  searchInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
  },
  optionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    PaddingLeft: 100,
  },
  inputLabel2: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    top: 2.3,
    alignSelf: 'flex-start', // Align label to left
  },  
  inputLabel4: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    top: 2.3,
    alignSelf: 'flex-start', // Align label to left
    marginLeft: -30,
  },  
  inputLabel3: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    PaddingLeft: 100,
    alignItems:'left'
  },
  budgetInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1.2, // Gives time picker more space
    marginLeft: -30,
  },
  timeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    textAlign: 'center',
  },
  timeSeparator: {
    paddingHorizontal: 3,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timeButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 70,
    alignItems: 'center',

  },
  budgetContainer: {
    width: '75%', // adjust as needed
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  customTripButton: {
    backgroundColor: '#000',
  paddingVertical: 12,
  paddingHorizontal: 35,
  borderRadius: 25,
  borderWidth: 1,
  borderColor: '#fff',
  marginTop: 10,
  },
  customTripButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    borderWidth: 0,
  },
  customTripText: {
    color: '#666', 
    fontSize: 14,
    fontWeight: '400',
    textDecorationLine: 'underline', // Add underline
    top: -8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  sliderContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  distanceLabel: {
    marginBottom: 10,
    marginLeft: 0,
  },
  distanceContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    left:8
  },
  choiceButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fff',
  },
  choiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PlanTripOptions;