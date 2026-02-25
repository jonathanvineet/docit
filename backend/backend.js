import "./polyfill.js";
import express from "express";
import twilio from "twilio";
import axios from "axios";
import ip from "ip";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const app = express();
app.use(express.json());

// ✅ Call with dynamic message
app.post("/call", async (req, res) => {
  const message = req.body.message || "This is a default emergency message.";
  const twimlUrl = `https://resqdemo-6615.twil.io/dynamic-voice?message=${encodeURIComponent(
    message
  )}`;

  try {
    const call = await client.calls.create({
      url: twimlUrl,
      to: "+918484926697",
      from: "+19516217901",
    });
    res.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("Call error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ SMS with editable message + optional location
app.post("/sms", async (req, res) => {
  const to = "+919943375656";
  let { message, latitude, longitude } = req.body;

  try {
    let address = "";
    if (latitude && longitude) {
      const geoResponse = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: {
          lat: latitude,
          lon: longitude,
          format: "json",
        },
        headers: {
          "User-Agent": "resqmat-emergency-app"
        }
      });

      address = geoResponse.data.display_name || "";
    }

    const finalMessage = address
      ? `${message}\n\nPatient's Last Known Location:\n${address}`
      : message;

    const sms = await client.messages.create({
      body: finalMessage,
      to,
      from: "+19516217901",
    });

    res.json({ success: true, sid: sms.sid });
  } catch (error) {
    console.error("SMS error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () =>
  console.log(`Server running at http://${ip.address()}:3001`)
);
