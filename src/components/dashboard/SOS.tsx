import React, { useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Linking, ScrollView } from "react-native";
import * as Location from "expo-location";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useNavigation } from "expo-router/react-navigation";
import { supabase } from "@/SupabaseConfig";
import { getBackendUrl, fetchWithTimeout } from "@/src/utils/backend";

const COUNTDOWN_SECONDS = 3;
const MESSAGE = "Your patient might be in dire need of an emergency, Please respond immediately";

type ChannelStatus = { state: "pending" | "ok" | "simulated" | "failed"; detail: string };
type Patient = { name?: string; email?: string; phone?: string; connected_doctors?: string[] };

export default function SOSButton() {
  const navigation = useNavigation();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState("Getting your location...");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ alert?: ChannelStatus; doctors?: ChannelStatus } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationNote("Location permission denied — alert will be sent without location.");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setLocationNote(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
      } catch (e: any) {
        setLocationNote("Location unavailable — alert will be sent without location.");
      }
    })();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase
        .from("users")
        .select("name, email, phone, connected_doctors")
        .eq("email", user.email)
        .maybeSingle();
      setPatient(data || { email: user.email });
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    if (sending || countdown !== null) return;
    setResults(null);
    setCountdown(COUNTDOWN_SECONDS);
    let left = COUNTDOWN_SECONDS;
    timerRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        triggerEmergency();
      } else {
        setCountdown(left);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  };

  // 1) Call + SMS through the alert server (Twilio, or simulated when not configured)
  const sendBackendAlert = async (): Promise<ChannelStatus> => {
    try {
      const res = await fetchWithTimeout(`${getBackendUrl()}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: MESSAGE,
          latitude: location?.latitude,
          longitude: location?.longitude,
          patient: { name: patient?.name, email: patient?.email, phone: patient?.phone },
        }),
      }, 15000);
      const data = await res.json();
      if (!data.success) return { state: "failed", detail: data.error || "Alert server reported an error" };
      if (data.simulated) return { state: "simulated", detail: "Call + SMS logged by alert server (Twilio not configured)" };
      return { state: "ok", detail: `Call ${data.alert?.call?.sids?.[0] || "placed"} · SMS ${data.alert?.sms?.sids?.[0] || "sent"}` };
    } catch (error: any) {
      return { state: "failed", detail: `Alert server unreachable (${getBackendUrl()})` };
    }
  };

  // 2) In-app alert to every connected doctor (Supabase messages table)
  const notifyDoctors = async (): Promise<ChannelStatus> => {
    try {
      const doctorIds = patient?.connected_doctors || [];
      if (!patient?.email || doctorIds.length === 0) {
        return { state: "failed", detail: "No connected doctors to notify" };
      }
      const { data: doctors, error } = await supabase.from("doctors").select("email").in("id", doctorIds);
      if (error) throw error;
      const where = location
        ? `\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}`
        : "\nLocation: unavailable";
      const rows = (doctors || []).map((d) => ({
        from_email: patient.email,
        to_email: d.email,
        content: `🚨 SOS from ${patient.name || patient.email}${patient.phone ? ` (${patient.phone})` : ""}. ${MESSAGE}.${where}`,
        read: false,
        from_type: "patient",
        to_type: "doctor",
      }));
      const { error: insertError } = await supabase.from("messages").insert(rows);
      if (insertError) throw insertError;
      return { state: "ok", detail: `Alert sent to ${rows.length} connected doctor(s)` };
    } catch (error: any) {
      return { state: "failed", detail: `Doctor alert failed: ${error.message || "unknown error"}` };
    }
  };

  const triggerEmergency = async () => {
    setSending(true);
    setResults({ alert: { state: "pending", detail: "Contacting alert server..." }, doctors: { state: "pending", detail: "Notifying doctors..." } });
    const [alert, doctors] = await Promise.all([sendBackendAlert(), notifyDoctors()]);
    setResults({ alert, doctors });
    setSending(false);
  };

  const statusColor = (s?: ChannelStatus) =>
    !s ? "#999" : s.state === "ok" ? "#2E7D32" : s.state === "simulated" ? "#F57C00" : s.state === "failed" ? "#C62828" : "#666";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <FontAwesome name="chevron-left" size={22} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.subtitle}>
        Alerts your emergency contacts by call + SMS and notifies your connected doctors with your location.
      </Text>

      {countdown !== null ? (
        <>
          <TouchableOpacity style={[styles.sosButton, styles.counting]} onPress={cancelCountdown}>
            <Text style={styles.countText}>{countdown}</Text>
            <Text style={styles.sosSub}>Tap to cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={[styles.sosButton, sending && { opacity: 0.6 }]} onPress={startCountdown} disabled={sending}>
          {sending ? <ActivityIndicator size="large" color="#fff" /> : <Text style={styles.sosText}>🚨 SOS</Text>}
        </TouchableOpacity>
      )}

      <View style={styles.infoCard}>
        <FontAwesome name="map-marker" size={18} color="#0F6D66" />
        <Text style={styles.infoText}>{locationNote}</Text>
      </View>

      {results && (
        <View style={styles.resultCard}>
          {[["Call + SMS", results.alert], ["Connected doctors", results.doctors]].map(([label, s]) => (
            <View key={label as string} style={styles.resultRow}>
              <View style={[styles.dot, { backgroundColor: statusColor(s as ChannelStatus) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultLabel}>{label as string}</Text>
                <Text style={styles.resultDetail}>{(s as ChannelStatus)?.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.hospitalButton} onPress={() => navigation.navigate("Map" as never)}>
        <FontAwesome name="hospital-o" size={18} color="#0F6D66" />
        <Text style={styles.hospitalText}>Nearest hospitals</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL("tel:108")}>
        <FontAwesome name="phone" size={18} color="#fff" />
        <Text style={styles.callText}>Call Ambulance (108)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hospitalButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0F6D66", borderRadius: 10, paddingVertical: 12, marginTop: 16, alignSelf: "stretch" },
  hospitalText: { color: "#0F6D66", fontWeight: "bold", marginLeft: 8 },
  container: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 60, backgroundColor: "#FFFFFF" },
  back: { position: "absolute", top: 50, left: 20, padding: 6 },
  title: { fontSize: 24, fontWeight: "bold", color: "#C62828", marginTop: 10 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, marginBottom: 30 },
  sosButton: { backgroundColor: "red", width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#f00", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  counting: { backgroundColor: "#B71C1C" },
  sosText: { color: "white", fontSize: 28, fontWeight: "bold" },
  countText: { color: "white", fontSize: 56, fontWeight: "bold" },
  sosSub: { color: "white", fontSize: 13 },
  infoCard: { flexDirection: "row", alignItems: "center", marginTop: 30, backgroundColor: "#E6F5F1", padding: 12, borderRadius: 10, width: "100%" },
  infoText: { marginLeft: 10, color: "#333", flex: 1 },
  resultCard: { marginTop: 16, width: "100%", backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12 },
  resultRow: { flexDirection: "row", alignItems: "flex-start", marginVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 10 },
  resultLabel: { fontWeight: "bold", color: "#333" },
  resultDetail: { color: "#555", fontSize: 13, marginTop: 2 },
  callButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F6D66", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginTop: 24 },
  callText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
});
