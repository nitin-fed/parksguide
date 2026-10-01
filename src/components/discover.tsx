import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { NpsPark } from '../api/nps';
import { US_STATES, useTheme } from '../theme';
import { type LatLng } from '../utils/geo';

type IconName = keyof typeof Ionicons.glyphMap;

const DOT = 28;
const LABEL = 26;
const GAP = 6;

// A map pin: a ringed dot, optionally with a name bubble above it.
// Selected pins turn terracotta with a dark label, as in the Discover design.
export const ParkPin = memo(function ParkPin({
  park,
  coordinate,
  selected,
  showLabel,
  onPress,
}: {
  park: NpsPark;
  coordinate: LatLng;
  selected: boolean;
  showLabel: boolean;
  onPress: (park: NpsPark) => void;
}) {
  const c = useTheme();
  const labeled = showLabel || selected;
  const height = labeled ? LABEL + GAP + DOT : DOT;
  // Keep the dot's centre on the park's coordinate whether or not the label is shown.
  const dotCenterY = height - DOT / 2;
  return (
    <Marker
      coordinate={coordinate}
      onPress={() => onPress(park)}
      anchor={{ x: 0.5, y: dotCenterY / height }}
      centerOffset={Platform.OS === 'ios' ? { x: 0, y: height / 2 - dotCenterY } : undefined}
      tracksViewChanges={false}
      zIndex={selected ? 2 : labeled ? 1 : 0}
      accessibilityLabel={park.fullName}
    >
      <View style={styles.pin}>
        {labeled ? (
          <View style={[styles.label, styles.shadow, { backgroundColor: selected ? c.primary : c.surface }]}>
            <Text style={[styles.labelText, { color: selected ? c.primaryText : c.text }]} numberOfLines={1}>
              {park.name}
            </Text>
          </View>
        ) : null}
        <View style={[styles.dot, styles.shadow, { backgroundColor: selected ? c.highlight : c.primary }]}>
          <View style={[styles.dotCore, { backgroundColor: c.surface }]} />
        </View>
      </View>
    </Marker>
  );
});

export function RoundButton({
  icon,
  onPress,
  label,
  size = 48,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.round,
        styles.shadow,
        { width: size, height: size, backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={c.text} />
    </Pressable>
  );
}

export function ZoomControl({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  const c = useTheme();
  return (
    <View style={[styles.zoom, styles.shadow, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable onPress={onZoomIn} accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.zoomButton}>
        <Ionicons name="add" size={24} color={c.text} />
      </Pressable>
      <View style={[styles.zoomDivider, { backgroundColor: c.border }]} />
      <Pressable onPress={onZoomOut} accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.zoomButton}>
        <Ionicons name="remove" size={24} color={c.text} />
      </Pressable>
    </View>
  );
}

// Full names for one or two states; codes beyond that so the line stays short.
function stateNames(states: string): string {
  const codes = states.split(',').filter(Boolean);
  if (codes.length > 2) return codes.join(' · ');
  return codes.map((code) => US_STATES.find((s) => s.code === code)?.name ?? code).join(' & ');
}

// The card pinned to the bottom of the map for the selected park.
export function ParkPreviewCard({
  park,
  driveTime,
  onOpen,
}: {
  park: NpsPark;
  driveTime?: string;
  onOpen: () => void;
}) {
  const c = useTheme();
  const image = park.images?.[0];
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityHint="Opens park details"
      style={[styles.card, styles.shadow, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      {image ? (
        <Image
          source={{ uri: image.url }}
          recyclingKey={park.id}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
          accessibilityLabel={image.altText}
        />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: c.border }]} />
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardState, { color: c.highlight }]} numberOfLines={1}>
          {stateNames(park.states).toUpperCase()}
        </Text>
        <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>
          {park.fullName}
        </Text>
        <View style={styles.cardMetaRow}>
          <Ionicons name={driveTime !== undefined ? 'car-outline' : 'leaf-outline'} size={16} color={c.muted} />
          <Text style={[styles.cardMeta, { color: c.muted }]} numberOfLines={1}>
            {driveTime || park.designation || 'National Park Service site'}
          </Text>
        </View>
        <View style={styles.cardLink}>
          <Text style={[styles.cardLinkText, { color: c.primary }]}>View park details</Text>
          <Ionicons name="arrow-forward" size={16} color={c.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pin: { alignItems: 'center', gap: GAP },
  label: { height: LABEL, borderRadius: LABEL / 2, paddingHorizontal: 12, justifyContent: 'center', maxWidth: 180 },
  labelText: { fontSize: 13, fontWeight: '700' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: { width: 8, height: 8, borderRadius: 4 },
  round: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  zoom: { width: 48, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'visible' },
  zoomButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  card: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardImage: { width: 112, height: 112, borderRadius: 16 },
  cardBody: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  cardState: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  cardTitle: { fontSize: 19, fontWeight: '500', lineHeight: 24 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta: { fontSize: 14, flexShrink: 1 },
  cardLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLinkText: { fontSize: 15, fontWeight: '500' },
});
