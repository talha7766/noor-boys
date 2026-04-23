import { useNetwork } from "@/context/NetworkContext";
import React from "react";
import { View } from "react-native";
import ThemeText from "./ui/theme-text";

// Wrap the component with React.memo
const NetworkError = React.memo(function NetworkError() {
  const { networkError, justRestored } = useNetwork();

  // Nothing to render if there's no error or restoration
  if (!networkError && !justRestored) return null;

  const isError = networkError;

  return (
    <View
      style={{
        backgroundColor: isError ? "#fee2e2" : "#dcfce7", // 🔴 / 🟢
        padding: 10,
        borderRadius: 8,
        margin: 16,
      }}
    >
      <ThemeText
        style={{
          color: isError ? "#b91c1c" : "#166534",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {isError
          ? "Please check your internet connection!"
          : "Your internet connection has been restored!"}
      </ThemeText>
    </View>
  );
});

export default NetworkError;
