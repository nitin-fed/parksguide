import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { type MapPressEvent, type MapType, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAllParks, parkCoordinate, type NpsPark } from '../../api/nps';
import { ParkPin, ParkPreviewCard, RoundButton, ZoomControl } from '../../components/discover';
import { ParkSearchList } from '../../components/ParkSearchList';
import { StatePicker } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useUserLocation } from '../../hooks/useUserLocation';
import { useTheme } from '../../theme';
import { distanceMiles, estimateDriveTimeMinutes, formatDriveTime, type LatLng } from '../../utils/geo';

// Centered on the contiguous United States.
const US_REGION: Region = { latitude: 39.5, longitude: -98.35, latitudeDelta: 38, longitudeDelta: 50 };
// Label only headline National Parks at regional zoom, every site once zoomed in,
// so dense areas like the Bay Area stay readable.
const PARK_LABEL_ZOOM = 14;
const ALL_LABEL_ZOOM = 2.5;
type LabelLevel = 'none' | 'parks' | 'all';

function labelLevelFor(latitudeDelta: number): LabelLevel {
  if (latitudeDelta < ALL_LABEL_ZOOM) return 'all';
  if (latitudeDelta < PARK_LABEL_ZOOM) return 'parks';
  return 'none';
}
const NEARBY_REGION_DELTA = 7;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function matches(park: NpsPark, q: string, stateCode?: string): boolean {
  if (stateCode && !park.states.split(',').includes(stateCode)) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return park.fullName.toLowerCase().includes(needle) || park.designation.toLowerCase().includes(needle);
}

export default function DiscoverScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(US_REGION);

  const [query, setQuery] = useState('');
  const [stateCode, setStateCode] = useState<string>();
  const q = useDebounced(query.trim(), 350);
  const [selectedCode, setSelectedCode] = useState<string>();
  const [labelLevel, setLabelLevel] = useState<LabelLevel>('none');
  const [mapType, setMapType] = useState<MapType>('mutedStandard');
  const [listMode, setListMode] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(0);

  const all = useAsync(() => getAllParks(), []);
  const location = useUserLocation();

  const pins = useMemo(
    () =>
      (all.data ?? []).flatMap((park) => {
        const coordinate = parkCoordinate(park);
        return coordinate && matches(park, q, stateCode) ? [{ park, coordinate }] : [];
      }),
    [all.data, q, stateCode],
  );
  // A search that narrows to one park selects it without an extra tap.
  const selected = pins.find((p) => p.park.parkCode === selectedCode) ?? (pins.length === 1 && (q || stateCode) ? pins[0] : undefined);

  const animateTo = useCallback((region: Region) => mapRef.current?.animateToRegion(region, 350), []);
  const focusNear = useCallback(
    (point: LatLng) => animateTo({ ...point, latitudeDelta: NEARBY_REGION_DELTA, longitudeDelta: NEARBY_REGION_DELTA }),
    [animateTo],
  );

  // On first fix, zoom to the user's area and preselect the closest park.
  const didInitialFocus = useRef(false);
  useEffect(() => {
    const here = location.coords;
    if (didInitialFocus.current || !here || pins.length === 0) return;
    didInitialFocus.current = true;
    let nearest = pins[0];
    for (const p of pins) {
      if (distanceMiles(here, p.coordinate) < distanceMiles(here, nearest.coordinate)) nearest = p;
    }
    setSelectedCode(nearest.park.parkCode);
    focusNear(here);
  }, [location.coords, pins, focusNear]);

  // Frame the results whenever the search or state filter changes.
  const filterKey = `${q}|${stateCode ?? ''}`;
  const lastFramed = useRef('|');
  useEffect(() => {
    if (!all.data || filterKey === lastFramed.current) return;
    lastFramed.current = filterKey;
    if (!q && !stateCode) {
      animateTo(US_REGION);
      return;
    }
    if (pins.length === 1) {
      // Fitting a single point zooms to street level; show the surrounding region instead.
      focusNear(pins[0].coordinate);
    } else if (pins.length > 1) {
      mapRef.current?.fitToCoordinates(
        pins.map((p) => p.coordinate),
        { edgePadding: { top: overlayHeight + 40, right: 90, bottom: 220, left: 40 }, animated: true },
      );
    }
  }, [filterKey, q, stateCode, pins, all.data, overlayHeight, animateTo, focusNear]);

  const zoom = (factor: number) => {
    const r = regionRef.current;
    animateTo({
      ...r,
      latitudeDelta: Math.min(Math.max(r.latitudeDelta * factor, 0.02), 90),
      longitudeDelta: Math.min(Math.max(r.longitudeDelta * factor, 0.02), 180),
    });
  };

  const locate = async () => {
    const here = location.coords ?? (await location.refresh().catch(() => undefined));
    if (here) focusNear(here);
  };

  const onMapPress = (e: MapPressEvent) => {
    // iOS also delivers marker taps to the map; only clear on taps on the map itself.
    if (e.nativeEvent.action !== 'marker-press') setSelectedCode(undefined);
  };

  const onPinPress = useCallback((park: NpsPark) => setSelectedCode(park.parkCode), []);

  const openPark = (park: NpsPark) => router.push({ pathname: '/park/[code]', params: { code: park.parkCode } });

  const driveTime =
    selected && location.coords
      ? formatDriveTime(estimateDriveTimeMinutes(distanceMiles(location.coords, selected.coordinate)))
      : undefined;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={US_REGION}
        mapType={mapType}
        showsUserLocation={location.granted}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onPress={onMapPress}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          setLabelLevel(labelLevelFor(region.latitudeDelta));
        }}
      >
        {pins.map(({ park, coordinate }) => (
          <ParkPin
            key={park.id}
            park={park}
            coordinate={coordinate}
            selected={park.parkCode === selected?.park.parkCode}
            showLabel={labelLevel === 'all' || (labelLevel === 'parks' && park.designation.includes('National Park'))}
            onPress={onPinPress}
          />
        ))}
      </MapView>

      {listMode ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}>
          <ParkSearchList q={q} stateCode={stateCode} topInset={overlayHeight + 8} />
        </View>
      ) : null}

      <View
        style={[styles.overlay, { paddingTop: insets.top + 4 }]}
        onLayout={(e) => setOverlayHeight(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <View style={styles.header} pointerEvents="box-none">
          <RoundButton
            icon={listMode ? 'map-outline' : 'list-outline'}
            label={listMode ? 'Show map' : 'Show list'}
            onPress={() => setListMode((v) => !v)}
          />
          <Text style={[styles.title, { color: c.text }]}>DISCOVER</Text>
          <RoundButton
            icon="globe-outline"
            label="Show all parks"
            onPress={() => {
              setQuery('');
              setStateCode(undefined);
              setSelectedCode(undefined);
              animateTo(US_REGION);
            }}
          />
        </View>

        <View style={[styles.search, styles.floating, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={22} color={c.text} />
          <View style={styles.searchBody}>
            <Text style={[styles.searchLabel, { color: c.muted }]}>PARK NAME</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search all national parks"
              placeholderTextColor={c.text}
              style={[styles.searchInput, { color: c.text }]}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search parks by name"
            />
          </View>
        </View>

        <StatePicker value={stateCode} onChange={setStateCode} variant="field" />
      </View>

      {!listMode ? (
        <>
          <View style={[styles.controls, { bottom: selected ? 168 : 24 }]} pointerEvents="box-none">
            <ZoomControl onZoomIn={() => zoom(0.5)} onZoomOut={() => zoom(2)} />
            <RoundButton icon="navigate-outline" label="Go to my location" onPress={locate} />
            <RoundButton
              icon="layers-outline"
              label={mapType === 'hybrid' ? 'Show standard map' : 'Show satellite map'}
              onPress={() => setMapType((t) => (t === 'hybrid' ? 'mutedStandard' : 'hybrid'))}
            />
          </View>

          <View style={styles.bottom} pointerEvents="box-none">
            {all.loading ? (
              <View style={[styles.pill, styles.floating, { backgroundColor: c.surface }]}>
                <ActivityIndicator color={c.primary} />
                <Text style={{ color: c.text }}>Loading parks…</Text>
              </View>
            ) : all.error ? (
              <Pressable
                onPress={all.reload}
                style={[styles.pill, styles.floating, { backgroundColor: c.surface }]}
                accessibilityRole="button"
              >
                <Ionicons name="cloud-offline-outline" size={18} color={c.danger} />
                <Text style={{ color: c.text, flexShrink: 1 }} numberOfLines={2}>
                  {`Couldn't load parks. Tap to retry.`}
                </Text>
              </Pressable>
            ) : selected ? (
              <ParkPreviewCard park={selected.park} driveTime={driveTime} onOpen={() => openPark(selected.park)} />
            ) : pins.length === 0 ? (
              <View style={[styles.pill, styles.floating, { backgroundColor: c.surface }]}>
                <Text style={{ color: c.text }}>No parks match that search.</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBody: { flex: 1 },
  searchLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  searchInput: { fontSize: 17, paddingVertical: 2 },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  controls: { position: 'absolute', right: 16, gap: 12, alignItems: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
