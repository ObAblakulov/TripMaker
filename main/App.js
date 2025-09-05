import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Map from './Map';
import { LocationsProvider } from './LocationsContext';

export default function App() {
  return (
    <LocationsProvider>
      <View style={styles.container}>
        <Map />
        <StatusBar style="auto" />
      </View>
    </LocationsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});