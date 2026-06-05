import React, { useEffect, useState } from "react";
import {
  Text,
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
const { width, height } = Dimensions.get("window");
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const PatientScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View style={styles.page}>
        <Text style={styles.welcomeText}>Let's get started!</Text>
        <Text style={styles.infoText}>
          Login to enjoy the features we've provided, and stay healthy!
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.signupButton]}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={[styles.buttonText, styles.signupButtonText]}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  splashScreen: {
    backgroundColor: "#147b72",
  },
  logo: {
    width: 150,
    height: 150,
  },
  appName: {
    marginTop: 20,
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  doctorImage: {
    width: 250,
    height: 400,
  },
  tagline: {
    fontSize: 20,
    marginTop: 10,
    fontWeight: "bold",
    color: "#333",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F6D66",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginHorizontal: 40,
    marginBottom: 30,
  },
  button: {
    width: "80%",
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
  signupButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#0F6D66",
    borderWidth: 2,
  },
  signupButtonText: {
    color: "#0F6D66",
  },
});

export default PatientScreen;
