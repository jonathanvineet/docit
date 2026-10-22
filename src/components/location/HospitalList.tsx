import React from "react";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { directionsUrl, Hospital } from "@/src/utils/hospitals";

export default function HospitalList({ hospitals }: { hospitals: Hospital[] }) {
  return (
    <FlatList
      data={hospitals}
      keyExtractor={(h) => h.id}
      ListEmptyComponent={<Text style={styles.empty}>No hospitals found within 10 km.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(directionsUrl(item))}>
          <FontAwesome5 name="hospital" size={20} color="#C62828" />
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {!!item.address && <Text style={styles.address}>{item.address}</Text>}
          </View>
          <Text style={styles.distance}>{item.distanceKm.toFixed(1)} km</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: "600", color: "#222" },
  address: { fontSize: 12, color: "#666", marginTop: 2 },
  distance: { fontSize: 13, color: "#0F6D66", fontWeight: "600" },
  empty: { textAlign: "center", color: "#666", padding: 20 },
});
