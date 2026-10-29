import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from "react-native-health-connect";
import type { PhoneVitals } from "./healthPlatform";

const PERMISSIONS: Permission[] = [
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "OxygenSaturation" },
  { accessType: "read", recordType: "Steps" },
];

// Only opens the Health Connect permission screen when something is missing,
// so a returning user isn't prompted on every dashboard visit
export const requestHealthAccess = async () => {
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    console.log("ℹ️ Health Connect is not installed or needs an update");
    return false;
  }
  if (!(await initialize())) return false;

  const hasAll = (granted: { recordType: string; accessType: string }[]) =>
    PERMISSIONS.every((p) => granted.some((g) => g.recordType === p.recordType && g.accessType === p.accessType));
  if (hasAll(await getGrantedPermissions())) return true;
  return hasAll(await requestPermission(PERMISSIONS));
};

export const readLatestVitals = async (since: Date, motionSince: Date): Promise<PhoneVitals> => {
  const now = new Date().toISOString();
  const window = { operator: "between" as const, startTime: since.toISOString(), endTime: now };

  const [heartRate, oxygen, steps] = await Promise.all([
    readRecords("HeartRate", { timeRangeFilter: window, ascendingOrder: false, pageSize: 1 }),
    readRecords("OxygenSaturation", { timeRangeFilter: window, ascendingOrder: false, pageSize: 1 }),
    aggregateRecord({
      recordType: "Steps",
      timeRangeFilter: { operator: "between", startTime: motionSince.toISOString(), endTime: now },
    }),
  ]);
  // A heart rate record covers an interval; its last sample is the newest beat reading
  const hrSample = heartRate.records[0]?.samples.at(-1);
  const spo2 = oxygen.records[0];

  return {
    heartRate: hrSample ? Math.round(hrSample.beatsPerMinute) : null,
    bloodOxygen: spo2 ? Math.round(spo2.percentage) : null,
    recentSteps: steps.COUNT_TOTAL ?? 0,
    measuredAt: [hrSample?.time, spo2?.time]
      .filter((t): t is string => !!t)
      .map((t) => new Date(t))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    source: "Health Connect",
  };
};
