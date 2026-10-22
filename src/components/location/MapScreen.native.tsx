import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "expo-router/react-navigation";
import { directionsUrl } from "@/src/utils/hospitals";
import { useNearbyHospitals } from "./useNearbyHospitals";
import HospitalList from "./HospitalList";

export default function MapScreen() {
  const navigation = useNavigation();
  const { location, hospitals, loading, error, reload } = useNearbyHospitals();

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
        <ActivityIndicator size="large" color="#0F6D66" style={styles.loader} />
      ) : location ? (
        <>
          <MapView
            style={styles.map}
            initialRegion={{ ...location, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
            showsUserLocation
          >
            <Marker coordinate={location} title="You are here" pinColor="blue" />
            {hospitals.map((h) => (
              <Marker
                key={h.id}
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                title={h.name}
                description={`${h.distanceKm.toFixed(1)} km · tap for directions`}
                onCalloutPress={() => Linking.openURL(directionsUrl(h))}
              >
                <FontAwesome5 name="hospital" size={28} color="red" />
              </Marker>
            ))}
          </MapView>
          {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.list}><HospitalList hospitals={hospitals} /></View>}
        </>
      ) : (
        <View style={styles.errorView}>
          <FontAwesome name="exclamation-triangle" size={24} color="red" />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={reload} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 50, paddingBottom: 12, paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "bold" },
  map: { width: "100%", height: "50%" },
  list: { flex: 1 },
  loader: { flex: 1, justifyContent: "center" },
  errorView: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  error: { color: "#C62828", textAlign: "center", padding: 16 },
  retry: { backgroundColor: "#0F6D66", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "bold" },
});
