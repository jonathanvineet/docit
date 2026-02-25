import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  FirstAidList: undefined;
  FirstAid: { type: string };
  ProfilePage: undefined;
  EditInfo: undefined;
  Map: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "Map">;
const GOOGLE_PLACES_API_KEY = "AlzaSyeyvc8WDVt04Rlv0Gp3BbIGKeOw7grIICd"; // Replace with your API Key

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        setLoading(false);
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({});
      const coords = userLocation.coords;

      setLocation(coords);
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Fetch nearby hospitals
      fetchHospitals(coords.latitude, coords.longitude);
      setLoading(false);
    })();
  }, []);

  const fetchHospitals = async (latitude: number, longitude: number) => {
    try {
      const response = await axios.get(
        `https://maps.gomaps.pro/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=10000&type=hospital&key=${GOOGLE_PLACES_API_KEY}`
      );
      setHospitals(response.data.results.slice(0, 5)); // Get only 5 hospitals
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
          <FontAwesome name="chevron-left" size={25} />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : region ? (
        <MapView
          style={styles.map}
          region={region}
          showsUserLocation={true}
          onRegionChangeComplete={setRegion}
        >
          {/* User Marker (Blue) */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              description="This is your current location"
              pinColor="blue"
            />
          )}

          {/* Hospital Markers with FontAwesome5 Icons */}
          {hospitals.map((hospital, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: hospital.geometry.location.lat,
                longitude: hospital.geometry.location.lng,
              }}
              title={hospital.name}
              description={hospital.vicinity}
            >
              <FontAwesome5 name="hospital" size={32} color="red" />
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.errorView}>
          <FontAwesome name="exclamation-triangle" size={24} color="red" />
          <TouchableOpacity onPress={() => navigation.navigate("Map")}>
            <FontAwesome name="refresh" size={24} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 75,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  map: { width: "100%", height: "100%" },
  loader: { flex: 1, justifyContent: "center" },
  errorView: { flex: 1, justifyContent: "center", alignItems: "center" },
});
