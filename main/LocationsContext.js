import React, { createContext, useContext, useState } from 'react';

const LocationsContext = createContext();

export const LocationsProvider = ({ children }) => {
  const [locations, setLocations] = useState([]);

  // Transform locations to trip markers format
  const tripMarkers = locations.map((location, index) => ({
    id: `marker-${index}`,
    coordinate: {
      latitude: location.lat,
      longitude: location.lon,
    },
    title: location.name,
    description: location.address,
    order: index + 1,
  }));

  return (
    <LocationsContext.Provider 
      value={{
        locations,
        setLocations,
        tripMarkers,
      }}
    >
      {children}
    </LocationsContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationsProvider');
  }
  return context;
};