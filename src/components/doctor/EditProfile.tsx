import React, { useState, useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  DoctorProfile: undefined;
  EditProfile: { from?: string };
  DoctorDashboard: undefined;
  ConnectPatient: undefined;
  Appointments: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "EditProfile">;
type EditProfileRouteProp = RouteProp<RootStackParamList, "EditProfile">;

const EditProfile = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditProfileRouteProp>();
  const from = route.params?.from || "profile";

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [hospital, setHospital] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.replace("Login");
        return;
      }

      try {
        // First check AsyncStorage for quick loading
        const cachedName = await AsyncStorage.getItem("doctorName");
        const cachedSpecialty = await AsyncStorage.getItem("doctorSpecialty");
        const cachedQualification = await AsyncStorage.getItem("doctorQualification");
        const cachedExperience = await AsyncStorage.getItem("doctorExperience");
        const cachedHospital = await AsyncStorage.getItem("doctorHospital");
        const cachedBio = await AsyncStorage.getItem("doctorBio");

        if (cachedName) setName(cachedName);
        if (cachedSpecialty) setSpecialty(cachedSpecialty);
        if (cachedQualification) setQualification(cachedQualification || "");
        if (cachedExperience) setExperience(cachedExperience || "");
        if (cachedHospital) setHospital(cachedHospital || "");
        if (cachedBio) setBio(cachedBio || "");

        // Fetch fresh data from Supabase
        const { data: doctor, error } = await supabase
          .from("doctors")
          .select("*")
          .eq("email", user.email)
          .single();

        if (doctor) {
          setName(doctor.name || "");
          setSpecialty(doctor.specialty || "");
          setQualification(doctor.qualification || "");
          setExperience(doctor.experience || "");
          setHospital(doctor.hospital || "");
          setBio(doctor.bio || "");

          await AsyncStorage.setItem("doctorName", doctor.name || "");
          await AsyncStorage.setItem("doctorSpecialty", doctor.specialty || "");
          await AsyncStorage.setItem("doctorQualification", doctor.qualification || "");
          await AsyncStorage.setItem("doctorExperience", doctor.experience || "");
          await AsyncStorage.setItem("doctorHospital", doctor.hospital || "");
          await AsyncStorage.setItem("doctorBio", doctor.bio || "");
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to load doctor information: " + error.message);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchDoctorInfo();
  }, []);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return false;
    }
    if (!specialty.trim()) {
      Alert.alert("Error", "Specialty is required");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigation.replace("Login");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          name,
          specialty,
          qualification,
          experience,
          hospital,
          bio,
        })
        .eq("email", user.email);

      if (error) throw error;

      await AsyncStorage.setItem("doctorName", name);
      await AsyncStorage.setItem("doctorSpecialty", specialty);
      await AsyncStorage.setItem("doctorQualification", qualification);
      await AsyncStorage.setItem("doctorExperience", experience);
      await AsyncStorage.setItem("doctorHospital", hospital);
      await AsyncStorage.setItem("doctorBio", bio);

      Alert.alert("Success", "Your profile has been updated successfully", [
        {
          text: "OK",
          onPress: () => {
            if (from === "initial") {
              navigation.replace("DoctorDashboard");
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", "Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E6F5F1" }}>
        <ActivityIndicator size="large" color="#0F6D66" />
        <Text style={{ marginTop: 10, color: "#0F6D66" }}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#E6F5F1" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome name="chevron-left" size={25} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {[
            { label: "Full Name", value: name, onChange: setName, placeholder: "Dr. Full Name" },
            { label: "Specialty", value: specialty, onChange: setSpecialty, placeholder: "e.g. Cardiologist, Pediatrician" },
            { label: "Qualification", value: qualification, onChange: setQualification, placeholder: "e.g. MD, MBBS, PhD" },
            { label: "Years of Experience", value: experience, onChange: setExperience, placeholder: "e.g. 10 years", keyboard: "number-pad" },
            { label: "Hospital/Clinic", value: hospital, onChange: setHospital, placeholder: "e.g. City General Hospital" },
          ].map(({ label, value, onChange, placeholder, keyboard }) => (
            <View key={label} style={styles.inputContainer}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#999"
                keyboardType={keyboard as any || "default"}
              />
            </View>
          ))}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Professional Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a short bio about your experience and approach to patient care"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 75, marginBottom: 20, paddingHorizontal: 30 },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  container: { flex: 1, padding: 20 },
  formSection: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 20, color: "#0F6D66" },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, color: "#333", marginBottom: 5, fontWeight: "500" },
  input: { backgroundColor: "#F9F9F9", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#EEEEEE", fontSize: 16 },
  textArea: { height: 100 },
  saveButton: { backgroundColor: "#0F6D66", paddingVertical: 16, borderRadius: 10, alignItems: "center", marginBottom: 20 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

export default EditProfile;
