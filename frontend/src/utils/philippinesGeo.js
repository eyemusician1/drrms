/** Philippines bounding box: [[west, south], [east, north]] for MapLibre maxBounds */
export const PHILIPPINES_BOUNDS = [[116.0, 4.2], [127.7, 21.3]];

export const PHILIPPINES_CENTER = { lng: 121.0, lat: 14.6 };
export const PHILIPPINES_DEFAULT_ZOOM = 5.2;

export const NCR_REGION_CODE = '130000000';
export const NCR_PROVINCE_KEY = '__NCR__';

export const isWithinPhilippines = (lat, lng) => {
  const parsedLat = Number.parseFloat(lat);
  const parsedLng = Number.parseFloat(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return false;
  const [[west, south], [east, north]] = PHILIPPINES_BOUNDS;
  return parsedLat >= south && parsedLat <= north && parsedLng >= west && parsedLng <= east;
};

export const clampToPhilippines = (lat, lng) => {
  const [[west, south], [east, north]] = PHILIPPINES_BOUNDS;
  return {
    lat: Math.min(north, Math.max(south, Number.parseFloat(lat))),
    lng: Math.min(east, Math.max(west, Number.parseFloat(lng))),
  };
};
