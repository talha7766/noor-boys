// components/CustomSplashScreen.tsx
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function MySplashScreen() {
  return (
    <View style={styles.container}>
      {/* Your App Logo */}
      <Image
        source={require("../assets/images/splash-icon2.png")} // Update path to your logo
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Loading Indicator */}
      {/* <ActivityIndicator size="large" color="#007AFF" style={styles.loader} /> */}

      {/* Powered by Wezsol Text */}
      <View style={styles.footer}>
        <Text style={styles.poweredByText}>Powered by</Text>
        <Text style={styles.wezsol}>Wezsol</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Change to your brand color
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
  },
  loader: {
    marginTop: 20,
  },
  footer: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
  },
  poweredByText: {
    fontSize: 14,
    color: "#666666",
    fontFamily: "Blink-Regular",
  },
  wezsol: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF", // Change to Wezsol brand color
    fontFamily: "Blink-Bold",
    marginTop: 4,
  },
});
