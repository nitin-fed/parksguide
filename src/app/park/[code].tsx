import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAlerts, getCampgrounds, getPark, parkCoordinate, type NpsPark } from '../../api/nps';
import { AlertItem, Button, SectionTitle, StatusView } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useTrips } from '../../state/trips';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ParkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const c = useTheme();
  const park = useAsync((signal) => getPark(code, signal), [code]);
  const alerts = useAsync((signal) => getAlerts({ parkCodes: [code] }, signal), [code]);
  const campgrounds = useAsync((signal) => getCampgrounds(code, signal), [code]);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (park.loading || park.error || !park.data) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <StatusView loading={park.loading} error={park.error} empty="Park not found." onRetry={park.reload} />
      </>
    );
  }

  const p = park.data;
  const coordinate = parkCoordinate(p);
  const hours = p.operatingHours?.[0];
  const directionsUrl = coordinate
    ? Platform.select({
        ios: `http://maps.apple.com/?daddr=${coordinate.latitude},${coordinate.longitude}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${coordinate.latitude},${coordinate.longitude}`,
      })
    : p.directionsUrl;

  return (
    <>
      <Stack.Screen options={{ title: p.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {p.images.slice(0, 8).map((img) => (
            <Image key={img.url} source={{ uri: img.url }} style={styles.hero} contentFit="cover" accessibilityLabel={img.altText} />
          ))}
        </ScrollView>

        <View style={styles.body}>
          <Text style={[styles.title, { color: c.text }]}>{p.fullName}</Text>
          <Text style={{ color: c.muted }}>{[p.designation, p.states.replace(/,/g, ', ')].filter(Boolean).join(' · ')}</Text>

          <View style={styles.actions}>
            <Button title="Add to trip" icon="add-circle-outline" onPress={() => setPickerOpen(true)} style={styles.flex} />
            {directionsUrl ? (
              <Button title="Directions" icon="navigate-outline" variant="secondary" onPress={() => Linking.openURL(directionsUrl)} style={styles.flex} />
            ) : null}
          </View>

          <Text style={[styles.paragraph, { color: c.text }]}>{p.description}</Text>

          {alerts.data && alerts.data.items.length > 0 ? (
            <>
              <SectionTitle>{`Alerts (${alerts.data.items.length})`}</SectionTitle>
              {alerts.data.items.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
            </>
          ) : null}

          {coordinate ? (
            <>
              <SectionTitle>Location</SectionTitle>
              <MapView
                style={styles.map}
                initialRegion={{ ...coordinate, latitudeDelta: 1.2, longitudeDelta: 1.2 }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={coordinate} title={p.fullName} pinColor={c.primary} />
              </MapView>
            </>
          ) : null}

          {hours ? (
            <>
              <SectionTitle>Hours</SectionTitle>
              <Text style={[styles.paragraph, { color: c.muted }]}>{hours.description}</Text>
              {DAYS.map((day) =>
                hours.standardHours?.[day] ? (
                  <View key={day} style={[styles.hoursRow, { borderColor: c.border }]}>
                    <Text style={{ color: c.text, textTransform: 'capitalize' }}>{day}</Text>
                    <Text style={{ color: c.muted }}>{hours.standardHours[day]}</Text>
                  </View>
                ) : null,
              )}
            </>
          ) : null}

          {p.entranceFees && p.entranceFees.length > 0 ? (
            <>
              <SectionTitle>Entrance fees</SectionTitle>
              {p.entranceFees.map((fee) => (
                <View key={fee.title + fee.cost} style={[styles.hoursRow, { borderColor: c.border }]}>
                  <Text style={[styles.flex, { color: c.text }]}>{fee.title}</Text>
                  <Text style={{ color: c.text, fontWeight: '600' }}>{Number(fee.cost) === 0 ? 'Free' : `$${Number(fee.cost).toFixed(2)}`}</Text>
                </View>
              ))}
            </>
          ) : null}

          {campgrounds.data && campgrounds.data.items.length > 0 ? (
            <>
              <SectionTitle>{`Campgrounds (${campgrounds.data.items.length})`}</SectionTitle>
              {campgrounds.data.items.map((cg) => (
                <Pressable
                  key={cg.id}
                  disabled={!cg.reservationUrl}
                  onPress={() => Linking.openURL(cg.reservationUrl)}
                  style={[styles.hoursRow, { borderColor: c.border }]}
                >
                  <Text style={[styles.flex, { color: c.text }]}>{cg.name}</Text>
                  {cg.reservationUrl ? <Text style={{ color: c.primary }}>Reserve</Text> : null}
                </Pressable>
              ))}
            </>
          ) : null}

          {p.weatherInfo ? (
            <>
              <SectionTitle>Weather</SectionTitle>
              <Text style={[styles.paragraph, { color: c.text }]}>{p.weatherInfo}</Text>
            </>
          ) : null}

          {p.activities && p.activities.length > 0 ? (
            <>
              <SectionTitle>Things to do</SectionTitle>
              <View style={styles.tags}>
                {p.activities.map((a) => (
                  <View key={a.id} style={[styles.tag, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={{ color: c.text, fontSize: 13 }}>{a.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Button title="Official NPS page" icon="open-outline" variant="secondary" onPress={() => Linking.openURL(p.url)} style={{ marginTop: 24 }} />
        </View>
      </ScrollView>
      <TripPicker park={p} visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

function TripPicker({ park, visible, onClose }: { park: NpsPark; visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const { trips, createTrip, addStop } = useTrips();
  const stop = { parkCode: park.parkCode, parkName: park.fullName, imageUrl: park.images[0]?.url };
  const [added, setAdded] = useState<string>();

  const add = (tripId: string, tripName: string) => {
    addStop(tripId, stop);
    setAdded(tripName);
    setTimeout(() => {
      setAdded(undefined);
      onClose();
    }, 900);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['bottom']}>
        <View style={[styles.modalHeader, { borderColor: c.border }]}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>Add to a trip</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: c.primary, fontSize: 16 }}>Close</Text>
          </Pressable>
        </View>
        {added ? (
          <View style={styles.addedBox}>
            <Ionicons name="checkmark-circle" size={40} color={c.primary} />
            <Text style={{ color: c.text, fontSize: 16 }}>{`Added to ${added}`}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {trips.map((t) => {
              const already = t.stops.some((s) => s.parkCode === park.parkCode);
              return (
                <Pressable
                  key={t.id}
                  disabled={already}
                  onPress={() => add(t.id, t.name)}
                  style={[styles.tripRow, { backgroundColor: c.card, borderColor: c.border, opacity: already ? 0.5 : 1 }]}
                >
                  <Text style={[styles.flex, { color: c.text, fontSize: 16 }]}>{t.name}</Text>
                  <Text style={{ color: c.muted }}>{already ? 'Already added' : `${t.stops.length} parks`}</Text>
                </Pressable>
              );
            })}
            <Button
              title={trips.length ? 'New trip with this park' : 'Start a trip with this park'}
              icon="add"
              variant={trips.length ? 'secondary' : 'primary'}
              onPress={() => {
                const trip = createTrip(`${park.name} trip`);
                add(trip.id, trip.name);
              }}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { width: SCREEN_WIDTH, height: 260 },
  body: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  flex: { flex: 1 },
  paragraph: { fontSize: 15, lineHeight: 22 },
  map: { height: 200, borderRadius: 14 },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 5 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  addedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
