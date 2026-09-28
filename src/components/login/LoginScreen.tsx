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
  Register: undefined;
  Dashboard: undefined;
  MPU: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

// Shared demo account (see Supabase auth users)
const DEMO_EMAIL = "patient.test@docit.dev";
const DEMO_PASSWORD = "Patient@123";

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Drop the login screens from history so Back can't return to them
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    } catch (error: any) {
      alert("Signin failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
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
            onPress={() => signIn(DEMO_EMAIL, DEMO_PASSWORD)}
          >
            <Text style={[styles.buttonText, styles.demoButtonText]}>Demo</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.signupButton}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
  signupButton: {
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: "#0F6D66",
    textDecorationLine: "underline",
  },
});

export default LoginScreen;
