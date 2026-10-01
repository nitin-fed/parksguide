import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { getAlerts, getAllParks, parkCoordinate } from "../../api/nps";
import {
  AlertItem,
  Button,
  SectionTitle,
  StatusView,
} from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useTrip, useTrips, type TripStop } from "../../state/trips";
import { useTheme } from "../../theme";
import { formatDateRange, isIsoDate } from "../../utils/dates";

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const trip = useTrip(id);
  const { deleteTrip } = useTrips();
  const mapRef = useRef<MapView>(null);

  const codes = trip?.stops.map((s) => s.parkCode) ?? [];
  const codesKey = codes.join(",");
  const allParks = useAsync(() => getAllParks(), []);
  const alerts = useAsync(
    (signal) =>
      codes.length
        ? getAlerts({ parkCodes: codes, limit: 200 }, signal)
        : Promise.resolve(undefined),
    [codesKey],
  );

  const route = useMemo(() => {
    const byCode = new Map((allParks.data ?? []).map((p) => [p.parkCode, p]));
    return (trip?.stops ?? []).flatMap((s) => {
      const park = byCode.get(s.parkCode);
      const coordinate = park && parkCoordinate(park);
      return coordinate ? [{ stop: s, coordinate }] : [];
    });
  }, [allParks.data, trip?.stops]);

  if (!trip) return <StatusView empty="This trip no longer exists." />;

  const urgent = (alerts.data?.items ?? []).filter(
    (a) => a.category === "Danger" || a.category === "Park Closure",
  );
  const nameFor = (code: string) =>
    trip.stops.find((s) => s.parkCode === code)?.parkName;

  const confirmDelete = () =>
    Alert.alert(
      "Delete trip?",
      `"${trip.name}" and its notes will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            router.back();
            deleteTrip(trip.id);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: trip.name }} />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: c.text }]}>{trip.name}</Text>
        {trip.startDate || trip.endDate ? (
          <Text style={{ color: c.muted }}>
            {formatDateRange(trip.startDate, trip.endDate)}
          </Text>
        ) : null}

        {route.length > 0 ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            onMapReady={() =>
              mapRef.current?.fitToCoordinates(
                route.map((r) => r.coordinate),
                {
                  edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                  animated: false,
                },
              )
            }
          >
            {route.map(({ stop, coordinate }, i) => (
              <Marker
                key={stop.parkCode}
                coordinate={coordinate}
                title={`${i + 1}. ${stop.parkName}`}
                pinColor={c.primary}
              />
            ))}
            {route.length > 1 ? (
              <Polyline
                coordinates={route.map((r) => r.coordinate)}
                strokeColor={c.accent}
                strokeWidth={3}
                lineDashPattern={[6, 6]}
              />
            ) : null}
          </MapView>
        ) : null}

        <Button
          title="Ask assistant"
          icon="chatbubble-ellipses-outline"
          onPress={() => router.navigate({ pathname: "/chat/[tripId]", params: { tripId: trip.id } })}
          style={{ marginTop: 12 }}
        />

        {urgent.length > 0 ? (
          <>
            <SectionTitle>{`Heads up (${urgent.length})`}</SectionTitle>
            {urgent.map((a) => (
              <AlertItem key={a.id} alert={a} parkName={nameFor(a.parkCode)} />
            ))}
          </>
        ) : null}

        <SectionTitle>{`Stops (${trip.stops.length})`}</SectionTitle>
        {trip.stops.length === 0 ? (
          <Text style={{ color: c.muted, marginBottom: 12 }}>
            Open any park from Explore or Map and tap Add to trip.
          </Text>
        ) : (
          trip.stops.map((stop, i) => (
            <StopRow
              key={stop.parkCode}
              tripId={trip.id}
              stop={stop}
              index={i}
              count={trip.stops.length}
            />
          ))
        )}

        <Button
          title="Find parks to add"
          icon="search"
          variant="secondary"
          onPress={() => router.navigate("/")}
        />
        <Button
          title="Delete trip"
          icon="trash-outline"
          variant="danger"
          onPress={confirmDelete}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </>
  );
}

function StopRow({
  tripId,
  stop,
  index,
  count,
}: {
  tripId: string;
  stop: TripStop;
  index: number;
  count: number;
}) {
  const c = useTheme();
  const { updateStop, removeStop, moveStop } = useTrips();
  const dateInvalid =
    !!stop.date && stop.date.length >= 10 && !isIsoDate(stop.date);

  return (
    <View
      style={[styles.stop, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <View style={styles.stopHeader}>
        <View style={[styles.badge, { backgroundColor: c.primary }]}>
          <Text style={{ color: c.primaryText, fontWeight: "700" }}>
            {index + 1}
          </Text>
        </View>
        {stop.imageUrl ? (
          <Image
            source={{ uri: stop.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : null}
        <Link
          href={{ pathname: "/park/[code]", params: { code: stop.parkCode } }}
          asChild
        >
          <Pressable style={styles.flex}>
            <Text
              style={{ color: c.text, fontSize: 16, fontWeight: "600" }}
              numberOfLines={2}
            >
              {stop.parkName}
            </Text>
          </Pressable>
        </Link>
        <Pressable
          disabled={index === 0}
          onPress={() => moveStop(tripId, stop.parkCode, -1)}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={index === 0 ? c.border : c.muted}
          />
        </Pressable>
        <Pressable
          disabled={index === count - 1}
          onPress={() => moveStop(tripId, stop.parkCode, 1)}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-down"
            size={20}
            color={index === count - 1 ? c.border : c.muted}
          />
        </Pressable>
        <Pressable
          onPress={() => removeStop(tripId, stop.parkCode)}
          hitSlop={8}
        >
          <Ionicons name="close-circle-outline" size={22} color={c.danger} />
        </Pressable>
      </View>
      <TextInput
        value={stop.date ?? ""}
        onChangeText={(date) =>
          updateStop(tripId, stop.parkCode, { date: date || undefined })
        }
        placeholder="Visit date YYYY-MM-DD"
        placeholderTextColor={c.muted}
        keyboardType="numbers-and-punctuation"
        style={[
          styles.input,
          { color: c.text, borderColor: dateInvalid ? c.danger : c.border },
        ]}
      />
      <TextInput
        value={stop.notes}
        onChangeText={(notes) => updateStop(tripId, stop.parkCode, { notes })}
        placeholder="Notes: trails, lodging, permits..."
        placeholderTextColor={c.muted}
        multiline
        style={[
          styles.input,
          styles.notes,
          { color: c.text, borderColor: c.border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800" },
  map: { height: 220, borderRadius: 14, marginTop: 16 },
  stop: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  stopHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  flex: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  notes: { minHeight: 60, textAlignVertical: "top" },
});
