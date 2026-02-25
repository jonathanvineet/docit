import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { supabase } from "@/SupabaseConfig";

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ProfilePage: undefined;
  EditInfo: { from?: string };
  Dashboard: undefined;
};
type NavigationProp = StackNavigationProp<RootStackParamList, "EditInfo">;
type RouteProps = {
  key: string;
  name: string;
  params?: { from?: string };
};

function EditInfo() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const navigatedFrom = route.params?.from || "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

      if (data) {
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setHeight(data.height || "");
        setWeight(data.weight || "");
        setAge(data.age || "");
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const createProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("User not authenticated");
      return;
    }

    const userEmail = user.email!.toLowerCase();
    setEmail(userEmail);

    const { error } = await supabase.from("users").upsert({
      email: userEmail,
      name,
      phone,
      height,
      weight,
      age,
    }, { onConflict: "email" });

    if (error) {
      alert("Error saving Profile: " + error.message);
      return;
    }

    alert("Profile Saved Successfully");
    if (navigatedFrom === "profile") {
      navigation.navigate("ProfilePage");
    } else {
      navigation.navigate("Dashboard");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigatedFrom === "profile") {
              navigation.navigate("ProfilePage");
            } else {
              navigation.goBack();
            }
          }}
        >
          <FontAwesome
            name="chevron-left"
            size={25}
            onPress={() => navigation.navigate("ProfilePage")}
          ></FontAwesome>
        </TouchableOpacity>
        <Text style={{ fontWeight: "bold", fontSize: 22 }}>Edit Info</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading profile data...</Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <Text style={styles.label}>Name :</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Enter Name"
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <Text style={styles.label}>E-mail :</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Enter Email"
              editable={false}
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <View style={styles.phoneLabel}>
              <Text style={{ textAlign: "left", width: 55, marginLeft: 8 }}>
                Phone
              </Text>
              <Text style={{ textAlign: "left", width: 55, marginLeft: 8 }}>
                num :
              </Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="Enter phone no"
              keyboardType="phone-pad"
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <Text style={styles.label}>Height :</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              style={styles.input}
              placeholder="Enter Height"
              keyboardType="numeric"
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <Text style={styles.label}>Weight:</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              style={styles.input}
              placeholder="Enter Weight"
              keyboardType="numeric"
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 15 }}>
            <Text style={styles.label}>Age :</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              style={styles.input}
              placeholder="Enter Age"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={createProfile}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export default EditInfo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F5F1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 75,
    marginBottom: 10,
    paddingHorizontal: 30,
  },
  label: {
    textAlign: "left",
    padding: 10,
    width: 70,
    marginLeft: 8,
  },
  phoneLabel: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
    marginLeft: 10,
  },
  input: {
    flex: 1,
    marginLeft: 5,
    marginRight: 5,
    paddingLeft: 15,
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 30,
  },
  button: {
    backgroundColor: "#26C3A6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    width: 150,
    alignSelf: "center",
    borderRadius: 25,
    marginTop: 30,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
