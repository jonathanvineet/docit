import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "expo-router/react-navigation";
import { NativeStackNavigationProp } from "expo-router/native-stack";
import { supabase } from "@/SupabaseConfig";

type RootStackParamList = {
  Login: undefined;
  DoctorDashboard: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

// Shared demo account (see Supabase auth users)
const DEMO_EMAIL = "doctor.test@docit.dev";
const DEMO_PASSWORD = "Doctor@123";

const DoctorLogin = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Every doctor needs a row in `doctors` (connections, alerts and search depend on it)
  const ensureDoctorRow = async (doctorEmail: string) => {
    const { data } = await supabase.from("doctors").select("id").eq("email", doctorEmail).maybeSingle();
    if (!data) {
      await supabase.from("doctors").insert({
        email: doctorEmail, name: "New Doctor", specialty: "General", connected_patients: [],
      });
    }
  };

  const signIn = async (email: string, password: string, isDemo = false) => {
    setLoading(true);
    try {
      let { data, error } = await supabase.auth.signInWithPassword({ email, password });
      // First run on a fresh Supabase project: create the shared demo doctor
      if (error && isDemo) {
        ({ data, error } = await supabase.auth.signUp({ email, password }) as any);
      }
      if (error) throw error;
      if (!data.session) {
        alert("Account created. Confirm the email, or disable email confirmation in Supabase Auth, then log in.");
        return;
      }
      await ensureDoctorRow(email.trim().toLowerCase());
      // Drop the login screens from history so Back can't return to them
      navigation.reset({ index: 0, routes: [{ name: "DoctorDashboard" }] });
    } catch (error: any) {
      alert("Signin failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Create account", "Enter an email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (!data.session) {
        alert("Account created. Confirm the email, or disable email confirmation in Supabase Auth, then log in.");
        return;
      }
      await ensureDoctorRow(email.trim().toLowerCase());
      navigation.reset({ index: 0, routes: [{ name: "DoctorDashboard" }] });
    } catch (error: any) {
      alert("Sign up failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doctor Login</Text>
      <Text style={styles.subtitle}>Enter your credentials to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0F6D66" />
      ) : (
        <>
          <TouchableOpacity style={styles.button} onPress={() => signIn(email, password)}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.demoButton]}
            onPress={() => signIn(DEMO_EMAIL, DEMO_PASSWORD, true)}
          >
            <Text style={[styles.buttonText, styles.demoButtonText]}>Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signUp} style={styles.signUpLink}>
            <Text style={styles.signUpText}>New doctor? Create an account</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  signUpLink: { marginTop: 16 },
  signUpText: { color: "#0F6D66", fontWeight: "600" },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F6D66",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#0F6D66",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  demoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0F6D66",
  },
  demoButtonText: {
    color: "#0F6D66",
  },
});

export default DoctorLogin;
