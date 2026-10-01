import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAlerts, getAllParks } from '../../api/nps';
import { AlertItem, StatePicker, StatusView } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useTrips } from '../../state/trips';
import { alertColor, useTheme } from '../../theme';

const CATEGORIES = ['All', 'Danger', 'Park Closure', 'Caution', 'Information'];

export default function AlertsScreen() {
  const c = useTheme();
  const { trips } = useTrips();
  const tripParkCodes = useMemo(
    () => [...new Set(trips.flatMap((t) => t.stops.map((s) => s.parkCode)))],
    [trips],
  );

  // Trips load from storage after mount, so the default follows them until the user picks.
  const [pickedScope, setScope] = useState<'trips' | 'state'>();
  const scope = pickedScope ?? (tripParkCodes.length ? 'trips' : 'state');
  const [stateCode, setStateCode] = useState<string>();
  const [category, setCategory] = useState('All');

  const useTripScope = scope === 'trips' && tripParkCodes.length > 0;
  const { data, error, loading, reload } = useAsync(
    (signal) =>
      getAlerts(useTripScope ? { parkCodes: tripParkCodes, limit: 200 } : { stateCode, limit: 100 }, signal),
    [useTripScope, tripParkCodes.join(','), stateCode],
  );
  const parkNames = useAsync(() => getAllParks(), []);
  const nameFor = useMemo(() => {
    const map = new Map((parkNames.data ?? []).map((p) => [p.parkCode, p.fullName]));
    return (code: string) => map.get(code);
  }, [parkNames.data]);

  const alerts = (data?.items ?? []).filter((a) => category === 'All' || a.category === category);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={[styles.segment, { borderColor: c.border, backgroundColor: c.card }]}>
          {(['trips', 'state'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              style={[styles.segmentItem, scope === s && { backgroundColor: c.primary }]}
            >
              <Text style={{ color: scope === s ? c.primaryText : c.text, fontWeight: '600' }}>
                {s === 'trips' ? 'My trip parks' : 'By state'}
              </Text>
            </Pressable>
          ))}
        </View>
        {scope === 'state' ? <StatePicker value={stateCode} onChange={setStateCode} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            const tint = cat === 'All' ? c.primary : alertColor(c, cat);
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, { borderColor: tint, backgroundColor: active ? tint : 'transparent' }]}
              >
                <Text style={{ color: active ? c.card : tint, fontSize: 13, fontWeight: '600' }}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {scope === 'trips' && tripParkCodes.length === 0 ? (
        <StatusView empty="Add parks to a trip to see their alerts here, or switch to By state." />
      ) : loading || error ? (
        <StatusView loading={loading} error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AlertItem alert={item} parkName={nameFor(item.parkCode)} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<StatusView empty="No current alerts. Enjoy the trail!" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  chips: { gap: 8, paddingBottom: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  list: { padding: 16, flexGrow: 1 },
});
