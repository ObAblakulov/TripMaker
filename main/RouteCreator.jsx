// RouteCreator.jsx
import React, { useState, useEffect } from 'react';
import { Polyline } from 'react-native-maps';

export const RouteCreator = ({ waypoints, apiKey }) => {
  const [routeCoords, setRouteCoords] = useState([]);

  const getRoutes = async () => {
    if (waypoints.length < 2) return;

    try {
      // Build URL with waypoints in order
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${waypoints[0].latitude},${waypoints[0].longitude}&` +
        `destination=${waypoints[waypoints.length-1].latitude},${waypoints[waypoints.length-1].longitude}&` +
        `waypoints=${waypoints.slice(1, -1).map(wp => `${wp.latitude},${wp.longitude}`).join('|')}&` +
        `key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes?.[0]?.overview_polyline?.points) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRouteCoords(points);
      }
    } catch (error) {
      console.error('Route error:', error);
    }
  };

  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
  
    while (index < len) {
      let shift = 0, result = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
  
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
  
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
  
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
  
      points.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }
    return points;
  };

  useEffect(() => {
    getRoutes();
  }, [waypoints]);

  return routeCoords.length > 0 ? (
    <Polyline
      coordinates={routeCoords}
      strokeWidth={3}
      strokeColor="#fff"
    />
  ) : null;
};