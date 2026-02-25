import React, { useEffect, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const profileImg = require("@/assets/images/photo.jpeg");

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ProfilePage: undefined;
  EditInfo: { from?: string };
  Dashboard: undefined;
  Chatbot: undefined;
  DoctorMessages: undefined;
  DiagnosticHistory: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "ProfilePage">;

const ProfilePage = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isModalVisible, setModalVisible] = useState(false);
  const [username, setUsername] = useState<string | null>(" ");
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.replace("Login");
        return;
      }
      try {
        const cached = await AsyncStorage.getItem("username");
        if (cached) {
          setUsername(cached);
          setFetching(false);
          updateInBackground(user.email!);
        } else {
          await fetchFromSupabase(user.email!);
        }
      } catch (error: any) {
        alert("Error fetching Profile: " + error.message);
        setUsername("User");
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  const updateInBackground = async (email: string) => {
    const { data } = await supabase
      .from("users")
      .select("name")
      .eq("email", email)
      .single();
    if (data?.name && data.name !== username) {
      setUsername(data.name);
      AsyncStorage.setItem("username", data.name);
    }
  };

  const fetchFromSupabase = async (email: string) => {
    const { data } = await supabase
      .from("users")
      .select("name")
      .eq("email", email)
      .single();
    if (data?.name) {
      setUsername(data.name);
      await AsyncStorage.setItem("username", data.name);
    } else {
      setUsername("User");
    }
    setFetching(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#E6F5F1" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 75,
          marginBottom: 10,
          paddingHorizontal: 30,
        }}
      >
        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
          <FontAwesome name="chevron-left" size={25} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>Your Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <View
        style={{
          alignItems: "center",
          paddingVertical: 40,
          backgroundColor: "#0F6D66",
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <Image
          source={profileImg}
          style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 10 }}
        />
        <Text style={{ fontSize: 20, color: "#fff", fontWeight: "600" }}>
          {username}
        </Text>
      </View>

      <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("EditInfo", { from: "profile" })}
        >
          <Text style={{ fontSize: 16, color: "#333" }}>Edit Information</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("DoctorMessages")}
        >
          <Text style={{ fontSize: 16, color: "#333" }}>Doctor Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.navigate("DiagnosticHistory")}
        >
          <Text style={{ fontSize: 16, color: "#333" }}>
            Diagnostics History
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoutContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0F6D66" />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              setLoading(true);
              try {
                await supabase.auth.signOut();
                await AsyncStorage.clear();
                navigation.replace("Login");
              } catch (error: any) {
                alert("Logout failed: " + error.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Chatbot")}
        >
          <FontAwesome name="comment-o" size={24} color="#999999" />
          <Text style={styles.navText}>Chatbot</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <FontAwesome name="home" size={24} color="#999999" />
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("ProfilePage")}
        >
          <FontAwesome name="user" size={24} color="#0F6D66" />
          <Text style={styles.activeNavText}>Mine</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfilePage;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
    height: 60,
    paddingBottom: 5,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingTop: 10,
  },
  navText: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  activeNavText: {
    fontSize: 12,
    color: "#0F6D66",
    fontWeight: "bold",
    marginTop: 4,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#0F6D66",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
