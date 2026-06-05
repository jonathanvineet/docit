import React, { useEffect, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  View, Text, TouchableOpacity, Image, Modal, Pressable,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const profileImg = require("@/assets/images/photo.jpeg");

type RootStackParamList = {
  Home: undefined; Login: undefined; Register: undefined;
  DoctorProfile: undefined; EditProfile: { from?: string };
  DoctorDashboard: undefined; ConnectPatient: undefined; Appointments: undefined;
};
type NavigationProp = StackNavigationProp<RootStackParamList, "DoctorProfile">;

const DoctorProfile = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isModalVisible, setModalVisible] = useState(false);
  const [doctorName, setDoctorName] = useState<string | null>("Doctor");
  const [specialty, setSpecialty] = useState<string | null>("Specialist");
  const [connectedPatients, setConnectedPatients] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const checkAndCreateDoctorProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigation.replace("Login"); return; }

      try {
        const cachedName = await AsyncStorage.getItem("doctorName");
        const cachedSpecialty = await AsyncStorage.getItem("doctorSpecialty");

        if (cachedName && cachedSpecialty) {
          setDoctorName(cachedName);
          setSpecialty(cachedSpecialty);
          fetchDoctorDataInBackground(user.email!);
        } else {
          const { data: doctor } = await supabase
            .from("doctors")
            .select("*")
            .eq("email", user.email)
            .single();

          if (doctor) {
            setDoctorName(doctor.name);
            setSpecialty(doctor.specialty || "General");
            setConnectedPatients((doctor.connected_patients || []).length);
            await AsyncStorage.setItem("doctorName", doctor.name);
            await AsyncStorage.setItem("doctorSpecialty", doctor.specialty || "General");
          } else {
            await createInitialDoctorProfile(user.email!);
          }
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to load doctor profile: " + error.message);
      } finally {
        setFetching(false);
      }
    };
    checkAndCreateDoctorProfile();
  }, []);

  const fetchDoctorDataInBackground = async (email: string) => {
    const { data: doctor } = await supabase.from("doctors").select("*").eq("email", email).single();
    if (doctor) {
      if (doctor.name !== doctorName) {
        setDoctorName(doctor.name);
        AsyncStorage.setItem("doctorName", doctor.name);
      }
      if (doctor.specialty !== specialty) {
        setSpecialty(doctor.specialty || "General");
        AsyncStorage.setItem("doctorSpecialty", doctor.specialty || "General");
      }
      setConnectedPatients((doctor.connected_patients || []).length);
    }
  };

  const createInitialDoctorProfile = async (email: string) => {
    const { error } = await supabase.from("doctors").insert({
      email, name: "New Doctor", specialty: "General", connected_patients: [],
    });
    if (!error) {
      setDoctorName("New Doctor"); setSpecialty("General");
      await AsyncStorage.setItem("doctorName", "New Doctor");
      await AsyncStorage.setItem("doctorSpecialty", "General");
      Alert.alert("Welcome", "Your doctor profile has been created. Please update your information.", [
        { text: "Update Now", onPress: () => navigation.navigate("EditProfile", { from: "initial" }) },
      ]);
    }
  };

  const confirmLogout = async () => {
    setModalVisible(false);
    try {
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      navigation.replace("Login");
    } catch (error: any) {
      Alert.alert("Error", "Failed to sign out: " + error.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#E6F5F1" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 75, marginBottom: 10, paddingHorizontal: 30 }}>
        <TouchableOpacity onPress={() => navigation.navigate("DoctorDashboard")}>
          <FontAwesome name="chevron-left" size={25} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>Doctor Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: "#0F6D66", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <Image source={profileImg} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 10 }} />
        <Text style={{ fontSize: 20, color: "#fff", fontWeight: "600" }}>Dr. {doctorName}</Text>
        <Text style={{ fontSize: 16, color: "#E6F5F1", marginTop: 5 }}>{specialty}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{connectedPatients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
        {[
          { icon: "user-md", label: "Edit Professional Information", onPress: () => navigation.navigate("EditProfile", { from: "profile" }) },
          { icon: "user-plus", label: "Connect with Patients", onPress: () => navigation.navigate("ConnectPatient") },
          { icon: "calendar", label: "Appointments Calendar", onPress: () => navigation.navigate("Appointments") },
        ].map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={{ backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15, flexDirection: "row", alignItems: "center" }} onPress={onPress}>
            <FontAwesome name={icon as any} size={20} color="#0F6D66" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 16, color: "#333" }}>{label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={{ backgroundColor: "#FF6B6B", padding: 15, borderRadius: 10, marginBottom: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 }} onPress={() => setModalVisible(true)}>
          <FontAwesome name="sign-out" size={20} color="#fff" style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 16, color: "#fff", fontWeight: "500" }}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNav}>
        {[
          { icon: "users", label: "Patients", nav: "ConnectPatient", active: false },
          { icon: "home", label: "Dashboard", nav: "DoctorDashboard", active: false },
          { icon: "user-md", label: "Profile", nav: "DoctorProfile", active: true },
        ].map(({ icon, label, nav, active }) => (
          <TouchableOpacity key={label} style={styles.navButton} onPress={() => navigation.navigate(nav as any)}>
            <FontAwesome name={icon as any} size={24} color={active ? "#0F6D66" : "#999999"} />
            <Text style={active ? styles.activeNavText : styles.navText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View style={{ width: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Confirm Logout</Text>
            <Text style={{ fontSize: 16, color: "#333", marginBottom: 20, textAlign: "center" }}>Are you sure you want to logout?</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <Pressable onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 10, paddingVertical: 10, backgroundColor: "#26C3A6", borderRadius: 5, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmLogout} style={{ flex: 1, marginLeft: 10, paddingVertical: 10, backgroundColor: "#FF6B6B", borderRadius: 5, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 16 }}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DoctorProfile;

const styles = StyleSheet.create({
  bottomNav: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EEEEEE", backgroundColor: "#FFFFFF", height: 60, paddingBottom: 5, position: "absolute", bottom: 0, left: 0, right: 0 },
  navButton: { alignItems: "center", justifyContent: "center", flex: 1, paddingTop: 10 },
  navText: { fontSize: 12, color: "#999999", marginTop: 4 },
  activeNavText: { fontSize: 12, color: "#0F6D66", fontWeight: "bold", marginTop: 4 },
  statsContainer: { flexDirection: "row", marginTop: 12, paddingHorizontal: 10 },
  statItem: { alignItems: "center", paddingHorizontal: 15 },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  statLabel: { fontSize: 12, color: "#E6F5F1", marginTop: 2 },
});
