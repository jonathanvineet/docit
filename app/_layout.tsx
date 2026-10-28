import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RootLayout() {
  // Android draws edge-to-edge, so keep screens clear of the system navigation bar
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: insets.bottom,
        backgroundColor: "#FFFFFF",
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
