import { supabase } from "@/SupabaseConfig";
import { formatDate, saveHealthReading, type SensorReading } from "./SensorData";
import type * as HealthPlatform from "./healthPlatform";

// Loaded lazily: the HealthKit / Health Connect native modules don't exist in
// Expo Go or in a build made before they were added, and importing them at
// the top level would crash the whole Dashboard route
const loadHealthPlatform = (): typeof HealthPlatform | null => {
  try {
    return require("./healthPlatform");
  } catch (error) {
    console.log("ℹ️ Phone health data unavailable in this build:", error);
    return null;
  }
};

// Wearables sync into Apple Health / Health Connect every few minutes, so
// polling faster than this only re-reads the same samples
const POLL_INTERVAL_MS = 60 * 1000;
const VITALS_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MOTION_WINDOW_MS = 10 * 60 * 1000;

// Reads the newest heart rate / SpO2 / steps from the phone's health store
// and saves them to Supabase like a sensor reading. Used when the sensor
// server isn't reachable.
export const startPhoneHealthSync = (onReading?: (reading: SensorReading) => void) => {
  let isActive = true;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastSavedAt: number | null = null;
  const platform = loadHealthPlatform();
  if (!platform) return () => {};
  const { readLatestVitals, requestHealthAccess } = platform;

  const poll = async () => {
    try {
      const now = Date.now();
      const vitals = await readLatestVitals(new Date(now - VITALS_LOOKBACK_MS), new Date(now - MOTION_WINDOW_MS));
      if (!isActive || !vitals.measuredAt) return;
      // Nothing new since the last poll
      if (vitals.measuredAt.getTime() === lastSavedAt) return;

      const reading: SensorReading = {
        heartRate: vitals.heartRate ? `${vitals.heartRate} BPM` : "No data",
        bloodOxygen: vitals.bloodOxygen ? `${vitals.bloodOxygen}%` : "No data",
        motionState: vitals.recentSteps > 0 ? "In Motion" : "Stationary",
        lastUpdated: formatDate(vitals.measuredAt.toISOString()),
      };
      onReading?.(reading);

      const { data: { user } } = await supabase.auth.getUser();
      if (!isActive || !user?.email) return;
      await saveHealthReading(user.email, reading, { source: vitals.source, steps: vitals.recentSteps });
      lastSavedAt = vitals.measuredAt.getTime();
    } catch (error) {
      console.log("⚠️ Could not read phone health data:", error);
    }
  };

  (async () => {
    try {
      if (!(await requestHealthAccess()) || !isActive) return;
    } catch (error) {
      console.log("⚠️ Health data permission request failed:", error);
      return;
    }
    console.log("📱 Reading vitals from the phone's health data");
    poll();
    timer = setInterval(poll, POLL_INTERVAL_MS);
  })();

  return () => {
    isActive = false;
    if (timer) clearInterval(timer);
  };
};
