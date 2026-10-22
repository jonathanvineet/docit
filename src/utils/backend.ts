import Constants from "expo-constants";
import { Platform } from "react-native";

// Where the local backend (backend/ folder) runs.
// Priority: explicit env -> the Expo dev server host (same laptop) -> localhost.
//   EXPO_PUBLIC_BACKEND_URL     e.g. http://192.168.1.10:3001  (alerts + chatbot)
//   EXPO_PUBLIC_SENSOR_WS_URL   e.g. ws://192.168.1.10:3000    (live sensor feed)
const getDevHost = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // @ts-ignore older manifest shapes
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    // @ts-ignore
    Constants.manifest?.debuggerHost;
  if (hostUri) return String(hostUri).split(":")[0];
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return "localhost";
};

const trimSlash = (url: string) => url.replace(/\/+$/, "");

export const getBackendUrl = () =>
  trimSlash(process.env.EXPO_PUBLIC_BACKEND_URL || `http://${getDevHost()}:3001`);

export const getSensorWsUrl = () =>
  trimSlash(process.env.EXPO_PUBLIC_SENSOR_WS_URL || `ws://${getDevHost()}:3000`);

// fetch with a timeout so an unreachable laptop doesn't hang the UI
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};
