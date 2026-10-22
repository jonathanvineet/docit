import "./polyfill.js";
import express from "express";
import cors from "cors";
import twilio from "twilio";
import axios from "axios";
import ip from "ip";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ---------------------------------------------------------------------------
// Configuration (all from backend/.env — see .env.example)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.ALERTS_PORT || 3001);
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;
const CALL_TO = splitNumbers(process.env.EMERGENCY_CALL_TO);
const SMS_TO = splitNumbers(process.env.EMERGENCY_SMS_TO);
const GEOCODE = process.env.REVERSE_GEOCODE !== "off";

// Twilio is only used when fully configured; otherwise alerts are simulated
// (logged + stored) so the SOS flow can be demonstrated without a paid account.
const twilioReady = Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
const client = twilioReady ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "data");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

function splitNumbers(value) {
  return (value || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function loadAlerts() {
  try {
    return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveAlert(alert) {
  const alerts = loadAlerts();
  alerts.unshift(alert);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts.slice(0, 200), null, 2));
}

function escapeXml(text) {
  return String(text).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}

function parseCoords(latitude, longitude) {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw Object.assign(new Error("latitude/longitude are out of range"), { status: 400 });
  }
  return { lat, lon };
}

// Address lookup is best effort: offline we still send coordinates + a maps link
async function describeLocation(coords) {
  if (!coords) return "";
  const link = `https://maps.google.com/?q=${coords.lat},${coords.lon}`;
  if (!GEOCODE) return link;
  try {
    const geo = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat: coords.lat, lon: coords.lon, format: "json" },
      headers: { "User-Agent": "resqmate-emergency-app" },
      timeout: 5000,
    });
    return geo.data?.display_name ? `${geo.data.display_name}\n${link}` : link;
  } catch {
    return link;
  }
}

async function placeCalls(message) {
  if (!twilioReady || CALL_TO.length === 0) {
    console.log(`📞 [simulated] call to ${CALL_TO.join(", ") || "<no EMERGENCY_CALL_TO>"}: ${message}`);
    return { simulated: true, sids: [] };
  }
  const twiml = `<Response><Say voice="alice">${escapeXml(message)}</Say><Pause length="1"/><Say voice="alice">${escapeXml(message)}</Say></Response>`;
  const calls = await Promise.all(CALL_TO.map((to) => client.calls.create({ twiml, to, from: TWILIO_FROM })));
  return { simulated: false, sids: calls.map((c) => c.sid) };
}

async function sendSms(body) {
  if (!twilioReady || SMS_TO.length === 0) {
    console.log(`📩 [simulated] SMS to ${SMS_TO.join(", ") || "<no EMERGENCY_SMS_TO>"}:\n${body}`);
    return { simulated: true, sids: [] };
  }
  const sms = await Promise.all(SMS_TO.map((to) => client.messages.create({ body, to, from: TWILIO_FROM })));
  return { simulated: false, sids: sms.map((s) => s.sid) };
}

function buildSmsBody({ message, patient, address }) {
  const who = patient?.name || patient?.email ? `Patient: ${[patient.name, patient.email, patient.phone].filter(Boolean).join(" | ")}\n` : "";
  return `${message}\n${who}${address ? `\nPatient's Last Known Location:\n${address}` : ""}`.trim();
}

const DEFAULT_MESSAGE = "Your patient might be in dire need of an emergency, Please respond immediately";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    twilio: twilioReady ? "live" : "simulated",
    callTargets: CALL_TO.length,
    smsTargets: SMS_TO.length,
    chatbot: process.env.ANTHROPIC_API_KEY ? "claude" : "offline",
  });
});

// Call with dynamic message
app.post("/call", async (req, res) => {
  const message = String(req.body?.message || DEFAULT_MESSAGE).slice(0, 500);
  try {
    const call = await placeCalls(message);
    res.json({ success: true, simulated: call.simulated, callSid: call.sids[0] || null, callSids: call.sids });
  } catch (error) {
    console.error("Call error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SMS with editable message + optional location
app.post("/sms", async (req, res) => {
  try {
    const message = String(req.body?.message || DEFAULT_MESSAGE).slice(0, 500);
    const coords = parseCoords(req.body?.latitude, req.body?.longitude);
    const address = await describeLocation(coords);
    const sms = await sendSms(buildSmsBody({ message, patient: req.body?.patient, address }));
    res.json({ success: true, simulated: sms.simulated, sid: sms.sids[0] || null, sids: sms.sids });
  } catch (error) {
    console.error("SMS error:", error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// One-shot SOS: call + SMS + stored alert record
app.post("/sos", async (req, res) => {
  try {
    const message = String(req.body?.message || DEFAULT_MESSAGE).slice(0, 500);
    const coords = parseCoords(req.body?.latitude, req.body?.longitude);
    const patient = req.body?.patient || {};
    const address = await describeLocation(coords);

    const [call, sms] = await Promise.allSettled([
      placeCalls(message),
      sendSms(buildSmsBody({ message, patient, address })),
    ]);

    const alert = {
      id: `sos_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      patient: { name: patient.name || null, email: patient.email || null, phone: patient.phone || null },
      location: coords,
      address,
      call: call.status === "fulfilled" ? call.value : { error: call.reason?.message },
      sms: sms.status === "fulfilled" ? sms.value : { error: sms.reason?.message },
    };
    saveAlert(alert);

    const ok = call.status === "fulfilled" && sms.status === "fulfilled";
    res.status(ok ? 200 : 502).json({ success: ok, simulated: !twilioReady, alert });
  } catch (error) {
    console.error("SOS error:", error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get("/alerts", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 200);
  res.json(loadAlerts().slice(0, limit));
});

// ---------------------------------------------------------------------------
// Chatbot: Claude when ANTHROPIC_API_KEY is set, otherwise 503 so the app
// falls back to its built-in offline first-aid guide.
// ---------------------------------------------------------------------------
const CHAT_SYSTEM = `You are ResQmate Assistant inside a patient health-monitoring app.
Give short, practical first-aid and general health guidance in plain language (under 120 words).
You are not a doctor: never diagnose or prescribe. For anything that could be an emergency
(chest pain, breathing difficulty, stroke signs, severe bleeding, unconsciousness, suicidal thoughts)
tell the user to press the SOS button in the app and call 108/112 immediately.`;

let anthropicClient = null;
async function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

app.post("/chat", async (req, res) => {
  const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "messages must end with a user message" });
  }
  // The API requires the conversation to start with a user turn
  while (messages.length && messages[0].role !== "user") messages.shift();

  const anthropic = await getAnthropic();
  if (!anthropic) return res.status(503).json({ error: "Chatbot model not configured", source: "none" });

  try {
    const response = await anthropic.beta.messages.create({
      model: process.env.CHAT_MODEL || "claude-opus-5-5",
      max_tokens: 1024,
      system: CHAT_SYSTEM,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });
    if (response.stop_reason === "refusal") {
      return res.json({ reply: "I can't help with that here. If this is an emergency, press SOS or call 108/112.", source: "claude" });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    res.json({ reply, source: "claude" });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(502).json({ error: "Chatbot request failed", source: "none" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Alert server running at http://${ip.address()}:${PORT}`);
  console.log(`  Twilio: ${twilioReady ? "live" : "SIMULATED (set TWILIO_* in backend/.env)"}`);
  console.log(`  Chatbot: ${process.env.ANTHROPIC_API_KEY ? "Claude" : "offline fallback (app-side)"}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Set ALERTS_PORT in backend/.env (and EXPO_PUBLIC_BACKEND_URL in the app .env).`);
    process.exit(1);
  }
  throw err;
});
