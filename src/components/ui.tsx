import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MissingApiKeyError, type NpsAlert, type NpsPark } from '../api/nps';
import { alertColor, US_STATES, useTheme } from '../theme';

export function StatusView({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: Error;
  empty?: string;
  onRetry?: () => void;
}) {
  const c = useTheme();
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (error) {
    const missingKey = error instanceof MissingApiKeyError;
    return (
      <View style={styles.center}>
        <Ionicons name={missingKey ? 'key-outline' : 'cloud-offline-outline'} size={32} color={c.muted} />
        <Text style={[styles.centerText, { color: c.text }]}>
          {missingKey ? 'An NPS API key is needed' : "Couldn't reach the National Park Service"}
        </Text>
        <Text style={[styles.centerSub, { color: c.muted }]}>{error.message}</Text>
        {onRetry && !missingKey ? <Button title="Try again" onPress={onRetry} /> : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={[styles.centerSub, { color: c.muted }]}>{empty}</Text>
      </View>
    );
  }
  return null;
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg = variant === 'primary' ? c.primary : 'transparent';
  const fg = variant === 'primary' ? c.primaryText : variant === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'danger' ? c.danger : c.primary, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function ParkCard({ park }: { park: NpsPark }) {
  const c = useTheme();
  const image = park.images?.[0];
  // Link asChild only accepts a flat style object (no arrays or functions), so press feedback lives inside.
  return (
    <Link href={{ pathname: '/park/[code]', params: { code: park.parkCode } }} asChild>
      <Pressable style={StyleSheet.flatten([styles.card, { backgroundColor: c.card, borderColor: c.border }])}>
        {({ pressed }) => (
          <View style={[styles.cardRow, { opacity: pressed ? 0.85 : 1 }]}>
            {image ? (
              <Image source={{ uri: image.url }} style={styles.cardImage} contentFit="cover" transition={200} accessibilityLabel={image.altText} />
            ) : (
              <View style={[styles.cardImage, { backgroundColor: c.border }]} />
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>
                {park.fullName}
              </Text>
              <Text style={[styles.cardMeta, { color: c.muted }]} numberOfLines={1}>
                {[park.designation, park.states.replace(/,/g, ', ')].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

export function AlertItem({ alert, parkName }: { alert: NpsAlert; parkName?: string }) {
  const c = useTheme();
  const color = alertColor(c, alert.category);
  return (
    <Pressable
      onPress={() => alert.url && Linking.openURL(alert.url)}
      style={[styles.alert, { backgroundColor: c.card, borderColor: c.border, borderLeftColor: color }]}
    >
      <Text style={[styles.alertCategory, { color }]}>
        {alert.category.toUpperCase()}
        {parkName ? <Text style={{ color: c.muted }}>{`  ·  ${parkName}`}</Text> : null}
      </Text>
      <Text style={[styles.alertTitle, { color: c.text }]}>{alert.title}</Text>
      <Text style={[styles.alertBody, { color: c.muted }]} numberOfLines={4}>
        {alert.description}
      </Text>
    </Pressable>
  );
}

// A chip that opens a searchable list of states and territories.
export function StatePicker({
  value,
  onChange,
  variant = 'chip',
}: {
  value?: string;
  onChange: (code?: string) => void;
  // 'field' is the full-width floating control used over the Discover map.
  variant?: 'chip' | 'field';
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const label = value ? US_STATES.find((s) => s.code === value)?.name ?? value : 'All states';
  const options = [{ code: '', name: 'All states' }, ...US_STATES];

  return (
    <>
      {variant === 'field' ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`State filter: ${label}`}
          style={[styles.field, styles.floating, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Ionicons name="location-outline" size={20} color={c.highlight} />
          <Text style={[styles.fieldText, { color: c.text }]}>{label}</Text>
          <Ionicons name="chevron-down" size={18} color={c.muted} />
        </Pressable>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={[styles.chip, { borderColor: c.border, backgroundColor: c.card }]}>
          <Ionicons name="location-outline" size={14} color={c.primary} />
          <Text style={[styles.chipText, { color: c.text }]}>{label}</Text>
          <Ionicons name="chevron-down" size={14} color={c.muted} />
        </Pressable>
      )}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['bottom']}>
          <View style={[styles.modalHeader, { borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Choose a state</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={{ color: c.primary, fontSize: 16 }}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(s) => s.code || 'all'}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code || undefined);
                  setOpen(false);
                }}
                style={[styles.option, { borderColor: c.border }]}
              >
                <Text style={{ color: c.text, fontSize: 16 }}>{item.name}</Text>
                {(value ?? '') === item.code ? <Ionicons name="checkmark" size={18} color={c.primary} /> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const c = useTheme();
  return <Text style={[styles.sectionTitle, { color: c.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  centerText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  centerSub: { fontSize: 14, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 12 },
  cardRow: { flexDirection: 'row' },
  cardImage: { width: 96, height: 96 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13 },
  alert: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4, padding: 12, marginBottom: 10, gap: 4 },
  alertCategory: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  alertTitle: { fontSize: 15, fontWeight: '600' },
  alertBody: { fontSize: 14, lineHeight: 19 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldText: { flex: 1, fontSize: 16 },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 8 },
});
