export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MI = 3958.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Straight-line (great-circle) distance in miles.
export function distanceMiles(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export function formatMiles(miles: number): string {
  if (miles < 1) return 'Less than a mile away';
  return `${Math.round(miles).toLocaleString()} mi away`;
}

// Estimate drive time in minutes from distance (miles), assuming 55 mph average.
export function estimateDriveTimeMinutes(miles: number): number {
  return Math.round((miles / 55) * 60);
}

export function formatDriveTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min away`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} hr away` : `${hours} hr ${mins} min away`;
}
