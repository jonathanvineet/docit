# DocIT - Healthcare Rescue Platform

## Overview

**DocIT** (Let's Rescue Lives) is a comprehensive healthcare application that connects patients with doctors and enables real-time health monitoring with emergency response capabilities. The app bridges the gap between patients seeking medical care and doctors providing professional healthcare services.

## Key Features

### For Patients
- **User Authentication**: Secure login and registration system
- **Real-time Health Monitoring**: Collect and display vital signs including:
  - Heart rate monitoring
  - Blood oxygen levels
  - Motion detection via accelerometer and gyroscope sensors
- **Doctor Connections**: Request and manage connections with healthcare providers
- **Emergency SOS**: One-touch emergency button that:
  - Shares real-time GPS location
  - Triggers emergency calls to connected doctors
  - Sends SMS alerts with patient location
- **Medical History Management**: Track and log diagnostic history, medications, and medical records
- **Doctor Messages**: Direct communication with connected doctors
- **Location Sharing**: Real-time map integration for emergency responders

### For Doctors
- **Patient Management Dashboard**: View all connected patients
- **Patient Search & Connection**: Search and request to connect with patients
- **Patient Details**: Access comprehensive patient information including:
  - Real-time health data
  - Medical history
  - Diagnostic records
  - Medication information
- **Emergency Response**: Receive SOS alerts from patients with location data
- **Patient Communication**: Send messages to patients

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router with stack and tab navigation
- **Backend**: Express.js server for emergency calls/SMS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Sensors**: Expo Location, Accelerometer, Gyroscope
- **API Communication**: Axios, WebSocket for real-time sensor data

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

3. Choose a platform to run on:
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Android emulator](https://docs.expo.dev/workflow/android-emulator/)
   - [Expo Go](https://expo.dev/go) for quick testing

## Project Structure

- **app/**: Main application screens and components
  - `_components/dashboard/`: Patient dashboard with health data
  - `_components/doctor/`: Doctor-specific screens
  - `_components/login/`: Authentication screens
  - `_components/profile/`: User profile and history management
  - `_components/location/`: Map and location services
- **services/**: Sensor data collection and processing
- **backend/**: Express server for emergency alerts

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [React Native docs](https://reactnative.dev/)
- [Supabase docs](https://supabase.com/docs)
