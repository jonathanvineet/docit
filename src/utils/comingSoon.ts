import { Alert } from "react-native";

// Placeholder for features whose screens haven't been built yet
export const showComingSoon = (feature: string) => {
  Alert.alert("Coming soon", `${feature} isn't available yet.`);
};
