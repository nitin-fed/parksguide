import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'parksguide/trips/v1';

export interface TripStop {
  parkCode: string;
  parkName: string;
  imageUrl?: string;
  // ISO date (YYYY-MM-DD) the user plans to visit, if set.
  date?: string;
  notes: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  stops: TripStop[];
  createdAt: number;
}

interface TripsContextValue {
  trips: Trip[];
  loaded: boolean;
  createTrip: (name: string, startDate?: string, endDate?: string) => Trip;
  updateTrip: (id: string, patch: Partial<Omit<Trip, 'id' | 'stops' | 'createdAt'>>) => void;
  deleteTrip: (id: string) => void;
  addStop: (tripId: string, stop: Omit<TripStop, 'notes'>) => void;
  updateStop: (tripId: string, parkCode: string, patch: Partial<Pick<TripStop, 'date' | 'notes'>>) => void;
  removeStop: (tripId: string, parkCode: string) => void;
  moveStop: (tripId: string, parkCode: string, direction: -1 | 1) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setTrips(JSON.parse(raw) as Trip[]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips)).catch(() => {});
  }, [trips, loaded]);

  const mapTrip = useCallback((id: string, fn: (trip: Trip) => Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const value = useMemo<TripsContextValue>(
    () => ({
      trips,
      loaded,
      createTrip: (name, startDate, endDate) => {
        const trip: Trip = { id: newId(), name, startDate, endDate, stops: [], createdAt: Date.now() };
        setTrips((prev) => [trip, ...prev]);
        return trip;
      },
      updateTrip: (id, patch) => mapTrip(id, (t) => ({ ...t, ...patch })),
      deleteTrip: (id) => setTrips((prev) => prev.filter((t) => t.id !== id)),
      addStop: (tripId, stop) =>
        mapTrip(tripId, (t) =>
          t.stops.some((s) => s.parkCode === stop.parkCode)
            ? t
            : { ...t, stops: [...t.stops, { ...stop, notes: '' }] },
        ),
      updateStop: (tripId, parkCode, patch) =>
        mapTrip(tripId, (t) => ({
          ...t,
          stops: t.stops.map((s) => (s.parkCode === parkCode ? { ...s, ...patch } : s)),
        })),
      removeStop: (tripId, parkCode) =>
        mapTrip(tripId, (t) => ({ ...t, stops: t.stops.filter((s) => s.parkCode !== parkCode) })),
      moveStop: (tripId, parkCode, direction) =>
        mapTrip(tripId, (t) => {
          const i = t.stops.findIndex((s) => s.parkCode === parkCode);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= t.stops.length) return t;
          const stops = [...t.stops];
          [stops[i], stops[j]] = [stops[j], stops[i]];
          return { ...t, stops };
        }),
    }),
    [trips, loaded, mapTrip],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used inside TripsProvider');
  return ctx;
}

export function useTrip(id: string | undefined): Trip | undefined {
  const { trips } = useTrips();
  return trips.find((t) => t.id === id);
}
