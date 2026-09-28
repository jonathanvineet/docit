import Constants from "expo-constants";
import { supabase } from "@/SupabaseConfig";

// Determine if a person is in motion based on accelerometer and gyroscope data
const determineMotionState = (
  accelerometer: { x: number; y: number; z: number },
  gyroData: { x: number; y: number; z: number }
) => {
  // Calculate the magnitude of acceleration and angular velocity
  const accelMagnitude = Math.sqrt(
    accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
  );
  const gyroMagnitude = Math.sqrt(
    gyroData.x ** 2 + gyroData.y ** 2 + gyroData.z ** 2
  );

  // Define thresholds for motion detection
  const ACCEL_THRESHOLD = 0.8; // Adjust based on your sensor's sensitivity
  const GYRO_THRESHOLD = 100; // Adjust based on your sensor's sensitivity

  // Determine if the person is in motion
  if (accelMagnitude > ACCEL_THRESHOLD || gyroMagnitude > GYRO_THRESHOLD) {
    return "In Motion";
  } else {
    return "Stationary";
  }
};

// Format date to a simpler format
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// The sensor server is optional: if it can't be reached after a few tries we
// stop quietly and the app keeps showing the last readings stored in Supabase.
const MAX_FAILED_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 5000;

// This function starts collecting sensor data and updating Supabase
export const startSensorDataCollection = () => {
  console.log("🔄 Starting sensor data collection service...");

  let lastUpdateTime = Date.now();
  let isActive = true;
  let wsConnection: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let hasConnected = false;
  let failedAttempts = 0;

  // Retry with backoff; give up if the server has never been reachable
  const scheduleReconnect = () => {
    if (!isActive) return;
    if (!hasConnected) {
      failedAttempts += 1;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        console.log("ℹ️ Sensor server unavailable, live sensor data disabled");
        return;
      }
    }
    const delay = hasConnected ? BASE_RETRY_DELAY_MS : BASE_RETRY_DELAY_MS * 2 ** (failedAttempts - 1);
    retryTimer = setTimeout(connectWebSocket, delay);
  };

  // Function to connect to the WebSocket server
  const connectWebSocket = () => {
    if (!isActive) return;

    try {
      // Dynamically determine the dev machine IP
      // @ts-ignore
      const debuggerHost = Constants.expoConfig?.hostUri || Constants.experienceUrl || Constants.manifest2?.extra?.expoClient?.hostUri || Constants.manifest?.debuggerHost;
      const devIP = debuggerHost?.split(":")[0] || "192.168.1.44"; // Fallback to current IP if needed

      console.log(`📡 Connecting to sensor server at ws://${devIP}:3000`);
      wsConnection = new WebSocket(`ws://${devIP}:3000`);

      wsConnection.onopen = () => {
        hasConnected = true;
        failedAttempts = 0;
        console.log("✅ Connected to WebSocket Server");
      };

      wsConnection.onmessage = async (event) => {
        if (!isActive) return;

        try {
          const data = JSON.parse(event.data);

          if (data.gyroscope && data.accelerometer && data.pulseoximeter) {
            const currentTime = Date.now();
            if (currentTime - lastUpdateTime > 2000) {
              lastUpdateTime = currentTime;

              const { data: { user } } = await supabase.auth.getUser();
              if (user && user.email) {
                const now = new Date();
                const simpleFormat = formatDate(now.toISOString());
                const motionState = determineMotionState(data.accelerometer, data.gyroscope);
                const heartRate = data.pulseoximeter.heartRate;
                const bloodOxygen = data.pulseoximeter.SpO2;

                try {
                  // Ensure user exists in 'users' table to avoid FK constraint error
                  const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("email")
                    .eq("email", user.email)
                    .single();

                  if (userError || !userData) {
                    console.log("⚠️ User not found in 'users' table, creating stub...");
                    await supabase.from("users").insert({ email: user.email, name: "New Patient" });
                  }

                  const { error } = await supabase
                    .from("health_data")
                    .upsert({
                      patient_email: user.email,
                      heart_rate: `${heartRate} BPM`,
                      blood_oxygen: `${bloodOxygen}%`,
                      motion_state: motionState,
                      last_updated: simpleFormat,
                      raw_data: {
                        gyroscope: data.gyroscope,
                        accelerometer: data.accelerometer,
                        pulseoximeter: data.pulseoximeter
                      }
                    }, { onConflict: 'patient_email' });

                  if (error) throw error;
                  console.log(`✅ Health data updated in Supabase: HR=${heartRate}, SpO2=${bloodOxygen}, Motion=${motionState}`);
                } catch (error) {
                  console.error("❌ Error updating health data:", error);
                }
              } else {
                console.log("❌ No current user found or missing email");
              }
            }
          } else {
            console.log("⚠️ Incomplete sensor data received");
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      wsConnection.onclose = () => {
        if (!isActive) return;
        console.log(hasConnected ? "❌ WebSocket Disconnected" : "⚠️ Sensor server not reachable");
        scheduleReconnect();
      };

      // onclose always follows and handles the retry; the error event itself has no useful detail
      wsConnection.onerror = () => {};
    } catch (error) {
      console.log("⚠️ Could not open sensor connection:", error);
      scheduleReconnect();
    }
  };

  connectWebSocket();

  return () => {
    console.log("🛑 Stopping sensor data collection...");
    isActive = false;
    if (retryTimer) clearTimeout(retryTimer);
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  };
};