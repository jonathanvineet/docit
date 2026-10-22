import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "expo-router/react-navigation";
import { useNearbyHospitals } from "./useNearbyHospitals";
import HospitalList from "./HospitalList";

// react-native-maps has no web support, so web shows the same hospitals as a list
export default function MapScreen() {
  const navigation = useNavigation();
  const { hospitals, loading, error, reload } = useNearbyHospitals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome name="chevron-left" size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Nearby Hospitals</Text>
        <TouchableOpacity onPress={reload}>
          <FontAwesome name="refresh" size={20} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#0F6D66" style={{ flex: 1 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <HospitalList hospitals={hospitals} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 40, paddingBottom: 12, paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "bold" },
  error: { color: "#C62828", textAlign: "center", padding: 20 },
});
