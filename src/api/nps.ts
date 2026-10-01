// Thin client for the National Park Service data API.
// Docs: https://www.nps.gov/subjects/developer/api-documentation.htm

const BASE_URL = 'https://developer.nps.gov/api/v1';

// Expo inlines EXPO_PUBLIC_* variables from .env at build time.
const API_KEY = process.env.EXPO_PUBLIC_NPS_API_KEY ?? '';

export class MissingApiKeyError extends Error {
  constructor() {
    super('Set EXPO_PUBLIC_NPS_API_KEY in .env (get a free key at https://www.nps.gov/subjects/developer/get-started.htm).');
    this.name = 'MissingApiKeyError';
  }
}

export interface NpsImage {
  url: string;
  title: string;
  altText: string;
  caption: string;
  credit: string;
}

export interface NpsActivity {
  id: string;
  name: string;
}

export interface NpsEntranceFee {
  cost: string;
  title: string;
  description: string;
}

export interface NpsOperatingHours {
  name: string;
  description: string;
  standardHours: Record<string, string>;
}

export interface NpsPark {
  id: string;
  url: string;
  fullName: string;
  name: string;
  parkCode: string;
  description: string;
  latitude: string;
  longitude: string;
  states: string;
  designation: string;
  directionsInfo?: string;
  directionsUrl?: string;
  weatherInfo?: string;
  images: NpsImage[];
  activities?: NpsActivity[];
  entranceFees?: NpsEntranceFee[];
  operatingHours?: NpsOperatingHours[];
}

export type AlertCategory = 'Danger' | 'Caution' | 'Information' | 'Park Closure' | string;

export interface NpsAlert {
  id: string;
  url: string;
  title: string;
  parkCode: string;
  description: string;
  category: AlertCategory;
  lastIndexedDate: string;
}

export interface NpsCampground {
  id: string;
  name: string;
  parkCode: string;
  description: string;
  reservationUrl: string;
  latitude: string;
  longitude: string;
}

interface NpsListResponse<T> {
  total: string;
  limit: string;
  start: string;
  data: T[];
}

export interface Page<T> {
  total: number;
  items: T[];
}

type Params = Record<string, string | number | undefined>;

export function hasApiKey(): boolean {
  return API_KEY.length > 0;
}

async function request<T>(path: string, params: Params, signal?: AbortSignal): Promise<Page<T>> {
  if (!hasApiKey()) throw new MissingApiKeyError();

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    headers: { 'X-Api-Key': API_KEY, Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`NPS API ${path} failed with ${res.status}`);
  }
  const body = (await res.json()) as NpsListResponse<T>;
  return { total: Number(body.total) || body.data.length, items: body.data };
}

export interface ParkSearch {
  q?: string;
  stateCode?: string;
  start?: number;
  limit?: number;
}

export function searchParks({ q, stateCode, start = 0, limit = 30 }: ParkSearch, signal?: AbortSignal) {
  return request<NpsPark>(
    '/parks',
    { q, stateCode, start, limit, fields: 'images', sort: 'fullName' },
    signal,
  );
}

export async function getPark(parkCode: string, signal?: AbortSignal): Promise<NpsPark | undefined> {
  const page = await request<NpsPark>('/parks', { parkCode, limit: 1 }, signal);
  return page.items[0];
}

let allParksCache: Promise<NpsPark[]> | undefined;

// Every park, used to plot pins on the map. The NPS catalog is ~470 parks,
// so a single request covers it; the result is kept for the app session.
export function getAllParks(): Promise<NpsPark[]> {
  if (!allParksCache) {
    allParksCache = request<NpsPark>('/parks', { limit: 600, sort: 'fullName' })
      .then((page) => page.items)
      .catch((err) => {
        allParksCache = undefined;
        throw err;
      });
  }
  return allParksCache;
}

export function getAlerts(
  { parkCodes, stateCode, limit = 50 }: { parkCodes?: string[]; stateCode?: string; limit?: number },
  signal?: AbortSignal,
) {
  return request<NpsAlert>(
    '/alerts',
    { parkCode: parkCodes?.join(','), stateCode, limit },
    signal,
  );
}

export function getCampgrounds(parkCode: string, signal?: AbortSignal) {
  return request<NpsCampground>('/campgrounds', { parkCode, limit: 50 }, signal);
}

export function parkCoordinate(park: Pick<NpsPark, 'latitude' | 'longitude'>) {
  const latitude = parseFloat(park.latitude);
  const longitude = parseFloat(park.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return undefined;
  return { latitude, longitude };
}
