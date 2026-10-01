import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';

import { searchParks, type NpsPark } from '../api/nps';
import { useAsync } from '../hooks/useAsync';
import { useTheme } from '../theme';
import { ParkCard, StatusView } from './ui';

const PAGE_SIZE = 30;

// Server-side park search with infinite scroll. `q` should already be debounced.
export function ParkSearchList({ q, stateCode, topInset = 0 }: { q: string; stateCode?: string; topInset?: number }) {
  const c = useTheme();
  const first = useAsync((signal) => searchParks({ q, stateCode, limit: PAGE_SIZE }, signal), [q, stateCode]);
  const searchKey = `${q}|${stateCode ?? ''}`;
  // Pages fetched by infinite scroll, tagged with the search they belong to.
  const [more, setMore] = useState<{ key: string; items: NpsPark[] }>({ key: '', items: [] });
  const [loadingMore, setLoadingMore] = useState(false);

  const { loading, error } = first;
  const total = first.data?.total ?? 0;
  const parks = [...(first.data?.items ?? []), ...(more.key === searchKey ? more.items : [])];

  const loadMore = () => {
    if (loading || loadingMore || parks.length >= total) return;
    setLoadingMore(true);
    searchParks({ q, stateCode, start: parks.length, limit: PAGE_SIZE })
      .then((page) =>
        setMore((prev) => ({ key: searchKey, items: [...(prev.key === searchKey ? prev.items : []), ...page.items] })),
      )
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  if (loading || error) return <StatusView loading={loading} error={error} onRetry={first.reload} />;

  return (
    <FlatList
      data={parks}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ParkCard park={item} />}
      contentContainerStyle={[styles.list, { paddingTop: topInset }]}
      keyboardDismissMode="on-drag"
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <Text style={[styles.count, { color: c.muted }]}>{`${total} park${total === 1 ? '' : 's'}`}</Text>
      }
      ListEmptyComponent={<StatusView empty="No parks match that search." />}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={c.primary} style={{ margin: 16 }} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  count: { fontSize: 13, marginBottom: 8 },
});
