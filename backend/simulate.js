import mqtt from "mqtt";
import dotenv from "dotenv";

dotenv.config();

// Publishes fake wearable readings to the MQTT broker (same topic the hub
// subscribes to). For a fully offline demo you don't need this: index.js has
// a built-in simulator when MQTT_HOST is not set.
if (!process.env.MQTT_HOST) {
  console.error("MQTT_HOST is not set in backend/.env — nothing to publish to.");
  console.error("Run `npm run sensors` instead: the sensor hub simulates readings by itself.");
  process.exit(1);
}

const config = {
  host: process.env.MQTT_HOST,
  port: Number(process.env.MQTT_PORT || 8883),
  protocol: process.env.MQTT_PROTOCOL || "mqtts",
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};
const TOPIC = process.env.MQTT_TOPIC || "sensors/data";

const client = mqtt.connect(config);

client.on("connect", () => {
  console.log("🚀 Sensor Simulator Started! Sending fake data to cloud...");

  setInterval(() => {
    const mockData = {
      accelerometer: {
        x: Number((Math.random() * 2 - 1).toFixed(2)),
        y: Number((Math.random() * 2 - 1).toFixed(2)),
        z: Number((Math.random() * 0.4 - 0.2).toFixed(2)),
      },
      gyroscope: {
        x: Number((Math.random() * 10).toFixed(2)),
        y: Number((Math.random() * 10).toFixed(2)),
        z: Number((Math.random() * 10).toFixed(2)),
      },
      pulseoximeter: {
        heartRate: Math.floor(Math.random() * (85 - 70) + 70), // 70-85 BPM
        SpO2: Math.floor(Math.random() * (100 - 95) + 95), // 95-100%
      },
    };

    client.publish(TOPIC, JSON.stringify(mockData));
    console.log("📡 Published:", mockData.pulseoximeter);
  }, 2000); // Send every 2 seconds
});

client.on("error", (err) => console.error("❌ Sim Error:", err.message));
