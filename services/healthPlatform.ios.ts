import {
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import type { PhoneVitals } from "./healthPlatform";

const READ_TYPES = [
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierStepCount",
] as const;

// Apple Health never says whether read access was granted (privacy), so a
// denied user simply gets no samples back
export const requestHealthAccess = async () => {
  if (!isHealthDataAvailable()) return false;
  return requestAuthorization({ toRead: READ_TYPES });
};

export const readLatestVitals = async (since: Date, motionSince: Date): Promise<PhoneVitals> => {
  const [heartRate, oxygen, steps] = await Promise.all([
    getMostRecentQuantitySample("HKQuantityTypeIdentifierHeartRate", "count/min"),
    getMostRecentQuantitySample("HKQuantityTypeIdentifierOxygenSaturation", "%"),
    queryStatisticsForQuantity("HKQuantityTypeIdentifierStepCount", ["cumulativeSum"], {
      filter: { date: { startDate: motionSince } },
      unit: "count",
    }),
  ]);
  const recent = <T extends { startDate: Date }>(s?: T) => (s && new Date(s.startDate) >= since ? s : undefined);
  const hr = recent(heartRate);
  const spo2 = recent(oxygen);

  return {
    heartRate: hr ? Math.round(hr.quantity) : null,
    // HealthKit's "%" unit is a 0–1 fraction
    bloodOxygen: spo2 ? Math.round(spo2.quantity <= 1 ? spo2.quantity * 100 : spo2.quantity) : null,
    recentSteps: steps.sumQuantity?.quantity ?? 0,
    measuredAt: [hr?.startDate, spo2?.startDate]
      .filter((d): d is Date => !!d)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    source: "Apple Health",
  };
};
