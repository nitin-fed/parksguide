import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { LatLng } from '../utils/geo';

async function locate(): Promise<LatLng | undefined> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return undefined;
  const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

// Asks for foreground location once on mount. `coords` stays undefined if the
// user declines, so callers should treat location as optional.
export function useUserLocation() {
  const [coords, setCoords] = useState<LatLng>();
  const [granted, setGranted] = useState(false);

  const refresh = useCallback(async (): Promise<LatLng | undefined> => {
    const next = await locate();
    setGranted(next !== undefined);
    if (next) setCoords(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    locate()
      .then((next) => {
        if (cancelled) return;
        setGranted(next !== undefined);
        setCoords(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, granted, refresh };
}
