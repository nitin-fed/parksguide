import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, StatusView } from '../../components/ui';
import { useTrips } from '../../state/trips';
import { useTheme } from '../../theme';
import { formatDateRange, isIsoDate } from '../../utils/dates';

export default function TripsScreen() {
  const c = useTheme();
  const { trips, loaded, createTrip } = useTrips();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [formError, setFormError] = useState<string>();

  const submit = () => {
    if (!name.trim()) return setFormError('Give your trip a name.');
    if ((start && !isIsoDate(start)) || (end && !isIsoDate(end))) return setFormError('Use dates like 2026-10-14.');
    if (start && end && end < start) return setFormError('The end date is before the start date.');
    createTrip(name.trim(), start || undefined, end || undefined);
    setName('');
    setStart('');
    setEnd('');
    setFormError(undefined);
  };

  const inputStyle = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }];

  return (
    <FlatList
      data={trips}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.formTitle, { color: c.text }]}>Plan a new trip</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Trip name, e.g. Utah Mighty 5" placeholderTextColor={c.muted} style={inputStyle} />
          <View style={styles.dates}>
            <TextInput value={start} onChangeText={setStart} placeholder="Start YYYY-MM-DD" placeholderTextColor={c.muted} style={[inputStyle, styles.flex]} keyboardType="numbers-and-punctuation" />
            <TextInput value={end} onChangeText={setEnd} placeholder="End YYYY-MM-DD" placeholderTextColor={c.muted} style={[inputStyle, styles.flex]} keyboardType="numbers-and-punctuation" />
          </View>
          {formError ? <Text style={{ color: c.danger }}>{formError}</Text> : null}
          <Button title="Create trip" icon="add" onPress={submit} />
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/trip/[id]', params: { id: item.id } }} asChild>
          <Pressable style={StyleSheet.flatten([styles.trip, { backgroundColor: c.card, borderColor: c.border }])}>
            <Ionicons name="compass" size={28} color={c.accent} />
            <View style={styles.flex}>
              <Text style={[styles.tripName, { color: c.text }]}>{item.name}</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                {[formatDateRange(item.startDate, item.endDate), `${item.stops.length} park${item.stops.length === 1 ? '' : 's'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} />
          </Pressable>
        </Link>
      )}
      ListEmptyComponent={
        loaded ? <StatusView empty="No trips yet. Create one above, then add parks from any park page." /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  form: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10, marginBottom: 20 },
  formTitle: { fontSize: 17, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  dates: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  tripName: { fontSize: 16, fontWeight: '600' },
});
