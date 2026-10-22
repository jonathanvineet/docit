import axios from "axios";

export type Hospital = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

// Places API (gomaps.pro, Google-compatible) when EXPO_PUBLIC_GOMAPS_API_KEY is set;
// otherwise the free OpenStreetMap Overpass API (no key required).
const PLACES_KEY = process.env.EXPO_PUBLIC_GOMAPS_API_KEY || "";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fromPlaces = async (lat: number, lon: number, radius: number): Promise<Hospital[]> => {
  const { data } = await axios.get("https://maps.gomaps.pro/maps/api/place/nearbysearch/json", {
    params: { location: `${lat},${lon}`, radius, type: "hospital", key: PLACES_KEY },
    timeout: 10000,
  });
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(data.error_message || data.status);
  }
  return (data.results || []).map((h: any) => ({
    id: h.place_id || `${h.geometry.location.lat},${h.geometry.location.lng}`,
    name: h.name,
    address: h.vicinity || "",
    latitude: h.geometry.location.lat,
    longitude: h.geometry.location.lng,
    distanceKm: distanceKm(lat, lon, h.geometry.location.lat, h.geometry.location.lng),
  }));
};

const fromOverpass = async (lat: number, lon: number, radius: number): Promise<Hospital[]> => {
  const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:${radius},${lat},${lon});way["amenity"="hospital"](around:${radius},${lat},${lon}););out center 40;`;
  const { data } = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });
  return (data.elements || [])
    .map((el: any) => {
      const hLat = el.lat ?? el.center?.lat;
      const hLon = el.lon ?? el.center?.lon;
      if (hLat === undefined || hLon === undefined) return null;
      const t = el.tags || {};
      return {
        id: `${el.type}/${el.id}`,
        name: t.name || t["name:en"] || "Hospital",
        address: [t["addr:street"], t["addr:city"]].filter(Boolean).join(", "),
        latitude: hLat,
        longitude: hLon,
        distanceKm: distanceKm(lat, lon, hLat, hLon),
      } as Hospital;
    })
    .filter(Boolean) as Hospital[];
};

export const fetchNearbyHospitals = async (lat: number, lon: number, limit = 5, radius = 10000) => {
  let list: Hospital[] = [];
  if (PLACES_KEY) {
    try {
      list = await fromPlaces(lat, lon, radius);
    } catch (e) {
      console.log("Places API failed, falling back to OpenStreetMap:", e);
    }
  }
  if (list.length === 0) list = await fromOverpass(lat, lon, radius);
  return list.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
};

export const directionsUrl = (h: Hospital) =>
  `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`;
