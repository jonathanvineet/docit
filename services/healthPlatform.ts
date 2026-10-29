// Phone health store: Apple Health on iOS (healthPlatform.ios.ts), Health
// Connect on Android (healthPlatform.android.ts). Web has neither.

export type PhoneVitals = {
  heartRate: number | null;
  bloodOxygen: number | null;
  recentSteps: number;
  measuredAt: Date | null;
  source: string;
};

export const requestHealthAccess = async () => false;

export const readLatestVitals = async (_since: Date, _motionSince: Date): Promise<PhoneVitals> => ({
  heartRate: null,
  bloodOxygen: null,
  recentSteps: 0,
  measuredAt: null,
  source: "none",
});
