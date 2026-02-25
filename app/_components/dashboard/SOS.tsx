import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Text, Alert } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";

export default function SOSButton() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required for emergency location sharing.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const makeEmergencyCall = async () => {
    try {
      // @ts-ignore
      const debuggerHost = Constants.manifest2?.extra?.expoClient?.hostUri || Constants.manifest?.debuggerHost;
      const devIP = debuggerHost?.split(":")[0];

      if (!devIP) throw new Error("Could not determine local IP address.");

      const backendBaseURL = `http://${devIP}:3001`;
      const message = "Your patient might be in dire need of an emergency, Please respond immediately";

      // Call
      const callResponse = await fetch(`${backendBaseURL}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const callData = await callResponse.json();

      // SMS
      const smsPayload = {
        message,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      const smsResponse = await fetch(`${backendBaseURL}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smsPayload),
      });
      const smsData = await smsResponse.json();

      if (callData.success && smsData.success) {
        Alert.alert(
          "Emergency Triggered",
          `📞 Call SID: ${callData.callSid}\n📩 SMS SID: ${smsData.sid}`
        );
      } else {
        Alert.alert(
          "Error",
          `Call: ${callData.error || "OK"}\nSMS: ${smsData.error || "OK"}`
        );
      }
    } catch (error: any) {
      Alert.alert("Request Failed", error.message || "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <TouchableOpacity
        onPress={makeEmergencyCall}
        style={{
          backgroundColor: "red",
          padding: 20,
          borderRadius: 50,
          width: 150,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
          🚨 SOS
        </Text>
      </TouchableOpacity>
    </View>
  );
}
