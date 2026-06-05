import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../components/login/HomeScreen";
import LoginScreen from "../components/login/LoginScreen";
import RegisterScreen from "../components/login/RegisterScreen";
import Dashboard from "../components/dashboard/Dashboard";
import ProfilePage from "../components/profile/ProfilePage";
import EditInfo from "../components/profile/EditInfo";
import MapScreen from "../components/location/MapScreenWrapper";
import PatientScreen from "../components/login/PatientScreen";
import DoctorLogin from "../components/login/DoctorLogin";
import DoctorDashboard from "../components/doctor/DoctorDashboard";
import ConnectPatient from "../components/doctor/ConnectPatient";
import PatientDetails from "../components/doctor/PatientDetails";
import DoctorProfile from "../components/doctor/DoctorProfile";
import EditProfile from "../components/doctor/EditProfile";
import SOSButton from "../components/dashboard/SOS";
import DoctorMessages from "../components/profile/DoctorMessages";
import DiagnosticHistory from "../components/profile/DiagnosticHistory";
import MedicalHistoryModal from "../components/doctor/MedicalHistoryModal";

const Stack = createStackNavigator();

const EntryNavigation = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="DoctorLogin" component={DoctorLogin} />
      <Stack.Screen name="PatientScreen" component={PatientScreen} />
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} />
      <Stack.Screen name="ConnectPatient" component={ConnectPatient} />
      <Stack.Screen name="PatientDetails" component={PatientDetails} />
      <Stack.Screen name="DoctorProfile" component={DoctorProfile} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      {/* <Stack.Screen name="MPU" component={SensorDataScreen} /> */}
      <Stack.Screen name="ProfilePage" component={ProfilePage} />
      <Stack.Screen name="EditInfo" component={EditInfo} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="SOS" component={SOSButton} />
      <Stack.Screen name="DoctorMessages" component={DoctorMessages} />
      <Stack.Screen name="DiagnosticHistory" component={DiagnosticHistory} />
    </Stack.Navigator>
  );
};

export default EntryNavigation;
