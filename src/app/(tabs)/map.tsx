import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { getAllParks, parkCoordinate } from '../../api/nps';
import { StatusView } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useTheme } from '../../theme';

// Centered on the contiguous United States.
const INITIAL_REGION = { latitude: 39.5, longitude: -98.35, latitudeDelta: 38, longitudeDelta: 50 };

export default function MapScreen() {
  const c = useTheme();
  const { data, error, loading, reload } = useAsync(() => getAllParks(), []);

  const pins = useMemo(
    () =>
      (data ?? []).flatMap((park) => {
        const coordinate = parkCoordinate(park);
        return coordinate ? [{ park, coordinate }] : [];
      }),
    [data],
  );

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={INITIAL_REGION} showsUserLocation>
        {pins.map(({ park, coordinate }) => (
          <Marker
            key={park.id}
            coordinate={coordinate}
            title={park.fullName}
            description={`${park.designation || 'Park'} · tap for details`}
            pinColor={c.primary}
            onCalloutPress={() => router.push({ pathname: '/park/[code]', params: { code: park.parkCode } })}
          />
        ))}
      </MapView>
      {loading || error ? (
        <View style={[styles.overlay, { backgroundColor: c.background + 'E6' }]}>
          <StatusView loading={loading} error={error} onRetry={reload} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: StyleSheet.absoluteFill,
});
