import express from "express";
import mqtt from "mqtt";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

const app = express();
const PORT = Number(process.env.SENSOR_PORT || 3000);
const TOPIC = process.env.MQTT_TOPIC || "sensors/data";

// Middleware
app.use(cors());
app.use(express.json());

let latestSensorData = {};
let lastReceivedAt = null;
let source = "none";

// Readings from the wearable (ESP32 + MPU6050 + MAX30100) arrive over MQTT.
// Without a broker configured (or with SENSOR_SIMULATE=1) a built-in simulator
// produces realistic readings so the dashboard works fully offline.
const mqttConfigured = Boolean(process.env.MQTT_HOST);
const simulate = process.env.SENSOR_SIMULATE === "1" || !mqttConfigured;

function handleReading(data, from) {
  latestSensorData = data;
  lastReceivedAt = new Date().toISOString();
  source = from;
  broadcastSensorData(latestSensorData);
}

if (mqttConfigured) {
  const mqttClient = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: Number(process.env.MQTT_PORT || 8883),
    protocol: process.env.MQTT_PROTOCOL || "mqtts",
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  mqttClient.on("connect", () => {
    console.log("✅ Connected to MQTT broker");
    mqttClient.subscribe(TOPIC, (err) => {
      if (err) console.error("❌ Subscription error:", err);
      else console.log(`📡 Subscribed to topic: ${TOPIC}`);
    });
  });

  mqttClient.on("message", (topic, message) => {
    try {
      handleReading(JSON.parse(message.toString()), "mqtt");
      console.log("📩 Received sensor data:", latestSensorData.pulseoximeter);
    } catch (error) {
      console.error("❌ Error parsing MQTT message:", error);
    }
  });

  mqttClient.on("error", (err) => console.error("❌ MQTT Connection Error:", err.message));
  mqttClient.on("close", () => console.log("⚠️ MQTT Connection Closed"));
}

// Simulated wearable: resting most of the time, occasional movement bursts
let simTick = 0;
function simulatedReading() {
  simTick += 1;
  const moving = simTick % 15 > 10;
  const jitter = (range) => Number((Math.random() * range * 2 - range).toFixed(2));
  return {
    accelerometer: { x: moving ? jitter(1.5) : jitter(0.1), y: moving ? jitter(1.5) : jitter(0.1), z: jitter(0.2) },
    gyroscope: { x: moving ? jitter(150) : jitter(5), y: moving ? jitter(150) : jitter(5), z: jitter(5) },
    pulseoximeter: {
      heartRate: Math.round((moving ? 95 : 74) + Math.random() * 8),
      SpO2: Math.round(96 + Math.random() * 3),
    },
    simulated: true,
  };
}

if (simulate) {
  console.log("🧪 Sensor simulator enabled (no MQTT_HOST or SENSOR_SIMULATE=1)");
  setInterval(() => handleReading(simulatedReading(), "simulator"), Number(process.env.SIM_INTERVAL_MS || 2000));
}

app.get("/", (req, res) => res.json(latestSensorData));
app.get("/health", (req, res) =>
  res.json({ ok: true, source, mqtt: mqttConfigured, simulate, lastReceivedAt, clients: wss.clients.size })
);

const server = app.listen(PORT, () =>
  console.log(`🚀 Sensor hub running on http://localhost:${PORT} (WebSocket on the same port)`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Set SENSOR_PORT in backend/.env (and EXPO_PUBLIC_SENSOR_WS_URL in the app .env).`);
    process.exit(1);
  }
  throw err;
});

const wss = new WebSocketServer({ server });
wss.on("error", () => {}); // listen errors are reported by the HTTP server handler above

wss.on("connection", (ws) => {
  console.log("🔗 New WebSocket Connection");
  ws.send(JSON.stringify({ message: "Connected to WebSocket Server" }));
  if (lastReceivedAt) ws.send(JSON.stringify(latestSensorData));

  ws.on("close", () => {
    console.log("❌ WebSocket Connection Closed");
  });
});

function broadcastSensorData(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}
