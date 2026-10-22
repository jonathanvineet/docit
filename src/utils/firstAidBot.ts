// Offline first-aid assistant used by the Chatbot screen when the backend
// chatbot (Claude) is not configured or unreachable. Keyword-scored topics,
// so it always gives a useful, safe answer without network access.

type Topic = {
  id: string;
  keywords: string[];
  emergency?: boolean;
  answer: string;
};

const EMERGENCY_NOTE =
  "⚠️ This may be an emergency. Press the red SOS button on your Dashboard and call 108 (ambulance) / 112 now.";

const TOPICS: Topic[] = [
  {
    id: "chest-pain",
    emergency: true,
    keywords: ["chest pain", "chest", "heart attack", "left arm", "jaw pain", "pressure in chest"],
    answer:
      "Possible heart attack signs: chest pressure, pain spreading to arm/jaw, sweating, breathlessness.\n• Sit the person down and keep them calm.\n• Loosen tight clothing.\n• If not allergic and conscious, they may chew one 300 mg aspirin.\n• Be ready to start CPR if they become unresponsive.",
  },
  {
    id: "cpr",
    emergency: true,
    keywords: ["cpr", "not breathing", "unconscious", "unresponsive", "no pulse", "collapsed", "fainted and not"],
    answer:
      "Hands-only CPR:\n• Check response and breathing (max 10 s).\n• Place the heel of your hand in the centre of the chest, other hand on top.\n• Push hard and fast: 5–6 cm deep, 100–120 per minute.\n• Don't stop until help arrives or the person starts breathing.",
  },
  {
    id: "stroke",
    emergency: true,
    keywords: ["stroke", "face drooping", "slurred", "numb", "one side", "paralysis", "speech"],
    answer:
      "Think F.A.S.T.: Face drooping, Arm weakness, Speech difficulty, Time to call.\n• Note the time symptoms started.\n• Keep the person lying with head slightly raised.\n• Give nothing by mouth.",
  },
  {
    id: "bleeding",
    emergency: true,
    keywords: ["bleeding", "blood", "cut", "wound", "deep cut", "laceration"],
    answer:
      "Bleeding control:\n• Press firmly on the wound with a clean cloth for at least 10 minutes.\n• Raise the injured part above heart level if possible.\n• Add more cloth on top if it soaks through — don't remove the first layer.\n• Seek care for deep, gaping or spurting wounds.",
  },
  {
    id: "breathing",
    emergency: true,
    keywords: ["breath", "breathing", "asthma", "wheezing", "short of breath", "breathless", "inhaler", "oxygen low", "spo2"],
    answer:
      "Breathing difficulty:\n• Sit upright, leaning slightly forward; loosen clothing.\n• If asthmatic, use the reliever inhaler (1 puff every 30–60 s, up to 10).\n• SpO₂ below 92% on your ResQmate dashboard is a warning sign — seek care.",
  },
  {
    id: "choking",
    emergency: true,
    keywords: ["choking", "choke", "something stuck", "swallowed", "heimlich"],
    answer:
      "Choking (adult):\n• Encourage coughing if they can.\n• If they can't breathe/speak: 5 firm back blows between shoulder blades.\n• Then 5 abdominal thrusts (Heimlich). Repeat until it clears.\n• If they become unconscious, start CPR.",
  },
  {
    id: "burn",
    keywords: ["burn", "burnt", "scald", "hot water", "fire"],
    answer:
      "Burns:\n• Cool under cool running water for 20 minutes.\n• Remove rings/tight items near the area.\n• Cover loosely with cling film or a clean non-fluffy cloth.\n• Don't apply ice, toothpaste or butter. Seek care for large, deep or facial burns.",
  },
  {
    id: "fracture",
    keywords: ["fracture", "broken", "bone", "sprain", "twisted", "ankle", "fall", "fell"],
    answer:
      "Suspected fracture or sprain:\n• Keep the injured part still; support it in the position found.\n• Apply a cold pack wrapped in cloth for 15–20 minutes.\n• Don't try to straighten a deformed limb. Get an X-ray if pain or swelling is severe.",
  },
  {
    id: "fever",
    keywords: ["fever", "temperature", "hot body", "chills"],
    answer:
      "Fever:\n• Rest and drink plenty of fluids.\n• Paracetamol can reduce fever (follow the dose on the pack).\n• See a doctor if above 39.5 °C, lasting over 3 days, or with stiff neck, rash or confusion.",
  },
  {
    id: "heart-rate",
    keywords: ["heart rate", "pulse", "bpm", "palpitation", "racing heart", "fast heartbeat"],
    answer:
      "Heart rate:\n• Normal resting adult range is about 60–100 BPM.\n• Above 100 at rest or below 50 with dizziness — sit down and re-check after 5 minutes.\n• Persistent abnormal readings on your dashboard: message your connected doctor.",
  },
  {
    id: "spo2",
    keywords: ["blood oxygen", "oxygen", "saturation", "o2"],
    answer:
      "Blood oxygen (SpO₂):\n• Normal is 95–100%.\n• 92–94%: rest, sit upright and re-check; contact your doctor.\n• Below 92% or with breathlessness/blue lips: treat as an emergency.",
  },
  {
    id: "diabetes",
    keywords: ["sugar", "diabetes", "hypo", "glucose", "sweating shaking"],
    answer:
      "Low blood sugar (shaky, sweaty, confused):\n• Give 15–20 g fast sugar: juice, glucose tablets or 3–4 teaspoons of sugar in water.\n• Re-check after 15 minutes; repeat if still low.\n• Then a snack with carbohydrates. Unconscious → nothing by mouth, call for help.",
  },
  {
    id: "seizure",
    emergency: true,
    keywords: ["seizure", "fits", "convulsion", "epilepsy"],
    answer:
      "Seizure:\n• Move hard objects away; cushion the head.\n• Don't hold them down or put anything in the mouth.\n• Time the seizure. After it stops, roll them onto their side.\n• Call for help if it lasts over 5 minutes or repeats.",
  },
  {
    id: "poison",
    emergency: true,
    keywords: ["poison", "overdose", "swallowed chemical", "bite", "snake"],
    answer:
      "Poisoning / bites:\n• Don't induce vomiting.\n• Keep the container or note what was taken.\n• Snake bite: keep the limb still and below heart level, remove rings, no cutting or sucking.",
  },
  {
    id: "app-help",
    keywords: ["sos", "how to use", "app", "doctor connect", "connect doctor", "history", "message"],
    answer:
      "Using ResQmate:\n• SOS (red button, Dashboard) shares your location and alerts your emergency contacts and connected doctor.\n• Doctors connect by sending a request — accept it on your Dashboard.\n• Mine → Diagnostics History to log diagnoses and medication.\n• Mine → Doctor Messages for notes from your doctor.\n• Nearby Hospitals on the Dashboard shows the closest hospitals.",
  },
];

const GREETING = /^(hi|hello|hey|good (morning|evening|afternoon))\b/i;

export const OFFLINE_DISCLAIMER =
  "I'm the offline ResQmate first-aid guide. I can't diagnose — for anything serious, contact your doctor.";

export const getOfflineReply = (question: string): string => {
  const text = question.toLowerCase().trim();
  if (!text) return "Please type a question.";
  if (GREETING.test(text)) {
    return "Hello! Ask me about first aid (bleeding, burns, CPR, choking), your vitals (heart rate, SpO₂) or how to use ResQmate.";
  }

  let best: { topic: Topic; score: number } | null = null;
  for (const topic of TOPICS) {
    const score = topic.keywords.reduce((sum, k) => (text.includes(k) ? sum + k.length : sum), 0);
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }

  if (!best) {
    return `I don't have guidance on that yet. Try asking about chest pain, bleeding, burns, CPR, choking, fever, heart rate or SpO₂.\n\n${OFFLINE_DISCLAIMER}`;
  }
  return best.topic.emergency ? `${EMERGENCY_NOTE}\n\n${best.topic.answer}` : best.topic.answer;
};
