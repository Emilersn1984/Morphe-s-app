/**
 * Calculs géographiques — architecture.md §10 (`geo.ts` testé unitairement).
 * Utilisé par le boîtier simulé (positions de démonstration) et, à l'étape 2,
 * par l'écran Carte pour recalculer `drift`/`dist` en contrôle du BB
 * (architecture.md §5.4 : c'est toujours la décision du BB qui fait foi).
 */

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface Coordinate {
  lat: number;
  lon: number;
}

/** Distance en mètres entre deux points, formule de haversine. */
export function distanceM(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Déplace un point de `northMeters`/`eastMeters` (approximation plane valable
 * sur les quelques dizaines de mètres d'un mouillage).
 */
export function offsetCoordinate(origin: Coordinate, northMeters: number, eastMeters: number): Coordinate {
  const deltaLat = northMeters / EARTH_RADIUS_M;
  const deltaLon = eastMeters / (EARTH_RADIUS_M * Math.cos(toRadians(origin.lat)));

  return {
    lat: origin.lat + (deltaLat * 180) / Math.PI,
    lon: origin.lon + (deltaLon * 180) / Math.PI,
  };
}

/**
 * Inverse de `offsetCoordinate` : écart nord/est en mètres entre `origin` et
 * `point` (approximation plane, valable sur les quelques dizaines de mètres
 * d'un mouillage). Utilisé par la vue schématique de repli sans réseau
 * (cahier-des-charges.md N-12), qui n'a pas de fond de carte pour placer les
 * points géographiquement.
 */
export function localOffsetM(origin: Coordinate, point: Coordinate): { north: number; east: number } {
  const north = toRadians(point.lat - origin.lat) * EARTH_RADIUS_M;
  const east = toRadians(point.lon - origin.lon) * EARTH_RADIUS_M * Math.cos(toRadians(origin.lat));
  return { north, east };
}
