import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
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

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
          <FontAwesome name="chevron-left" size={25} />
        </TouchableOpacity>
      </View>

      {/* Web Message */}
      <View style={styles.messageView}>
        <FontAwesome name="map-marker" size={48} color="#666" />
        <Text style={styles.messageText}>Maps are not available on web</Text>
        <Text style={styles.subText}>
          Please use the mobile app to access map features
        </Text>
      </View>
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
  messageView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
  },
});
