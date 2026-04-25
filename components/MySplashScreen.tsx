import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

export default function MySplashScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/splash-icon2.png")}
      style={styles.container}
      resizeMode="cover" // full screen cover karega
    >
      {/* Optional Overlay (agar text readable karna ho) */}
      <View style={styles.overlay} />

      {/* Footer Text */}
      <View style={styles.footer}>
        <Text style={styles.poweredByText}>Powered by</Text>
        <Text style={styles.SoftwareLinkers}>SoftwareLinkers</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)", // optional dark overlay
  },

  footer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
  },

  poweredByText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Blink-Regular",
  },

  SoftwareLinkers: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: "Blink-Bold",
    marginTop: 4,
  },
});