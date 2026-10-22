import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { fetchNearbyHospitals, Hospital } from "@/src/utils/hospitals";

export type Coords = { latitude: number; longitude: number };

// Shared by the native map and the web list: current location + 5 nearest hospitals
export const useNearbyHospitals = () => {
  const [location, setLocation] = useState<Coords | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is needed to find nearby hospitals.");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      try {
        setHospitals(await fetchNearbyHospitals(coords.latitude, coords.longitude));
      } catch (e) {
        setError("Couldn't load nearby hospitals. Check your internet connection.");
      }
    } catch (e) {
      setError("Couldn't get your location.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { location, hospitals, loading, error, reload: load };
};
