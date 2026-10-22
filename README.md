# DocIT / ResQmate: Wearable Health Monitoring and Emergency Rescue

A React Native (Expo) app plus a wearable sensor rig. It streams a patient's heart rate, SpO₂ and motion to their doctor in real time. One SOS tap calls and texts emergency contacts with the patient's live location, alerts every connected doctor, and shows the nearest hospitals.

---

## The problem

- **Emergencies happen alone.** Elderly, cardiac and post-surgery patients often live by themselves. After a fall or a cardiac event, nobody knows until it is too late.
- **The first ten minutes decide the outcome.** Families lose precious time finding the location, calling the doctor and finding a hospital.
- **Doctors see patients only in snapshots.** Between visits there is no continuous vitals data, and no way to notice a deteriorating patient.
- **Scattered records.** Diagnostic history and medication lists live on paper and are unavailable during an emergency.

## What ResQmate solves

| Need | Feature |
|---|---|
| Continuous monitoring | ESP32 wearable (MAX30100 pulse oximeter + MPU6050 motion) → MQTT → sensor hub → live dashboard (heart rate, SpO₂, resting/moving) |
| Instant emergency response | **SOS**: 3-second cancel window, then an automated voice call and SMS (Twilio) with the GPS address and map link, an in-app alert to every connected doctor, and a one-tap ambulance call (108) |
| Find care fast | **Nearby hospitals**: map plus distance-sorted list with directions (OpenStreetMap, no API key needed) |
| Doctor in the loop | Doctors search for patients and send connection requests. They see live vitals, history and SOS alerts in real time, and can message patients |
| Medical records | Patients log diagnoses, medication and the treating doctor. Connected doctors can view them |
| Quick answers | First-aid **chatbot**: Claude when a key is configured, otherwise a built-in offline first-aid guide |

Everything works without paid services:
- **Without Twilio**, calls and SMS are simulated and logged.
- **Without the wearable or MQTT**, the backend generates realistic sensor readings.
- **Without a Claude key**, the chatbot uses the offline guide.

---

## Run it

### 1. Database (Supabase, one time)
Create a Supabase project. Open the **SQL editor** and run `supabase/schema.sql`, which creates the tables, row-level security, realtime publication and the two RPCs the app calls. Under Auth, turn off email confirmation for an easy demo.

### 2. Backend (laptop)
```bash
cd backend
npm install
cp .env.example .env      # optional: Twilio, MQTT, ANTHROPIC_API_KEY
npm start                 # sensor hub :3000 (WebSocket) + alert/chat server :3001
```
Check that it is up: `curl localhost:3001/health` and `curl localhost:3000/health`.

### 3. App
```bash
npm install
cp .env.example .env      # Supabase URL + anon key
npx expo start            # scan the QR code with Expo Go (phone on the same Wi-Fi)
```
The app finds the laptop automatically through the Expo dev host. If it can't, set `EXPO_PUBLIC_BACKEND_URL=http://<laptop-ip>:3001` and `EXPO_PUBLIC_SENSOR_WS_URL=ws://<laptop-ip>:3000`.

---

## How to show the demo

You need two devices: a **patient** phone and a **doctor** phone, emulator or browser (`npx expo start --web` works for the doctor side). Allow about 8 minutes.

Before you present:
1. Run `npm start` in `backend/` and confirm `/health` responds. Live readings come from the wearable, or from the simulator when it is off.
2. Register a patient (`patient@demo.in`) and fill in the profile (name, phone, age).
3. Create the doctor: **Doctor** on the home screen → **New doctor? Create an account**. Or tap **Demo**, which creates and signs in `doctor.test@docit.dev` the first time.
4. Optional: to show real calls and SMS, fill in `TWILIO_*`, `EMERGENCY_CALL_TO` and `EMERGENCY_SMS_TO` in `backend/.env` with a verified number of your own.

Live flow:

| # | Device | Action | What to say |
|---|---|---|---|
| 1 | Patient | Open the **Dashboard**. Heart rate, SpO₂ and motion update every 2 s | "The wearable streams over MQTT to our hub, then over WebSocket to the app. Each reading is also saved to Supabase for the doctor." |
| 2 | Wearable | Shake the sensor, or wait for the simulated movement burst | "Motion state switches from Resting to Moving. A sudden spike followed by stillness suggests a fall." |
| 3 | Doctor | **Connect with Patient** → search `patient@demo.in` → send the request | "Doctors can't see anyone's data without the patient's consent." |
| 4 | Patient | A popup appears → **Accept** | "Realtime: the request arrives instantly." |
| 5 | Doctor | Tap the patient → live vitals and history → send a message | "Continuous monitoring between visits." |
| 6 | Patient | **Mine → Diagnostic History** → add an entry; **Doctor Messages** shows the doctor's note | "Records travel with the patient." |
| 7 | Patient | Chatbot → "How do I do CPR?" | "First-aid guidance. Real emergencies are pointed to SOS and 108." |
| 8 | Patient | **SOS** → the 3-second countdown (show that a tap cancels it) → let it fire | "One tap: voice call plus SMS with the street address, and every connected doctor is alerted." |
| 9 | Doctor | A red **SOS alerts** panel and popup appear → **Open location** | "The doctor sees who, when and exactly where." |
| 10 | Patient | SOS screen → **Nearest hospitals** → tap one for directions | "Distance-sorted hospitals from OpenStreetMap, no key required." |
| 11 | Laptop | Show the backend terminal: `📞 [simulated] call…` / `📩 SMS…`, or the real phone ringing | "With Twilio configured, these are real calls." |

**If something fails live:**
- Vitals show "Loading...": the phone can't reach the laptop. Set `EXPO_PUBLIC_SENSOR_WS_URL` and restart Expo.
- SOS shows "Alert server unreachable": same cause. Point `EXPO_PUBLIC_BACKEND_URL` at the laptop IP.
- "No connected doctors": complete steps 3–4 first.

---

## Presentation guide

Use 8–10 slides.

1. **Title.** ResQmate: wearable monitoring and one-tap emergency rescue.
2. **Problem.** Patients who live alone, golden-hour delays and episodic doctor visits. Add statistics on cardiac events and falls in the elderly in India if you have them.
3. **Existing solutions and their gaps.** Smartwatches are expensive and alert only the wearer. Ambulance apps lack the patient's vitals. Hospital EHRs don't reach the patient's home.
4. **Our solution.** Wearable, app, doctor and emergency services in one loop.
5. **Architecture.** ESP32 (MAX30100 + MPU6050) → HiveMQ MQTT → Node sensor hub → WebSocket → Expo app → Supabase (Postgres, realtime, auth, RLS) ↔ doctor app. Node alert server → Twilio voice and SMS, plus OpenStreetMap geocoding.
6. **Hardware.** Photo of the wearable, sensor list and cost (well under a smartwatch).
7. **Live demo.** Follow the flow above.
8. **Security and privacy.** Doctors see data only after consent. Row-level security is enforced in the database (`supabase/schema.sql`). Secrets live in `.env`, not in code.
9. **Impact and SDGs.** SDG 3 (Good Health and Well-being). Faster emergency response for elderly and chronic patients.
10. **Future work.** On-device fall detection, an automatic SOS when vitals cross thresholds, hospital bed availability, and integration with the 108 dispatch API.

Likely viva questions:
- *How is motion classified?* By acceleration and gyroscope magnitude thresholds (`services/SensorData.ts`, `determineMotionState`).
- *What if the patient has no data network?* The SMS path needs only GSM on Twilio's side. The 108 button uses the phone dialer directly.
- *Why MQTT?* It is lightweight publish/subscribe for low-power devices and works over flaky links.

---

## Code map

- `src/navigation/EntryNavigation.tsx`: all screens
- `src/components/dashboard/`: patient dashboard and SOS
- `src/components/doctor/`: doctor dashboard (patients and SOS inbox), patient details, connect, profile
- `src/components/profile/`: patient profile, history, doctor messages
- `src/components/location/`: nearby hospitals (native map; list on web)
- `src/components/chatbot/`: first-aid chatbot (Claude or offline)
- `services/SensorData.ts`: WebSocket sensor client, motion classification, Supabase upsert
- `backend/index.js`: sensor hub (MQTT or simulator → WebSocket)
- `backend/backend.js`: alert server (`/sos`, `/call`, `/sms`, `/alerts`, `/chat`, `/health`)
- `backend/simulate.js`: publishes fake readings to a real MQTT broker
- `supabase/schema.sql`: database schema, RLS, RPCs
