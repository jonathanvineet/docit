import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./_components/login/HomeScreen";
import LoginScreen from "./_components/login/LoginScreen";
import RegisterScreen from "./_components/login/RegisterScreen";
import Dashboard from "./_components/dashboard/Dashboard";
import ProfilePage from "./_components/profile/ProfilePage";
import EditInfo from "./_components/profile/EditInfo";
import MapScreen from "./_components/location/MapScreenWrapper";
import PatientScreen from "./_components/login/PatientScreen";
import DoctorLogin from "./_components/login/DoctorLogin";
import DoctorDashboard from "./_components/doctor/DoctorDashboard";
import ConnectPatient from "./_components/doctor/ConnectPatient";
import PatientDetails from "./_components/doctor/PatientDetails";
import DoctorProfile from "./_components/doctor/DoctorProfile";
import EditProfile from "./_components/doctor/EditProfile";
import SOSButton from "./_components/dashboard/SOS";
import DoctorMessages from "./_components/profile/DoctorMessages";
import DiagnosticHistory from "./_components/profile/DiagnosticHistory";
import MedicalHistoryModal from "./_components/doctor/MedicalHistoryModal";

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
