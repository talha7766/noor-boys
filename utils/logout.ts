import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./apiFetch";

export async function logoutWithServer(apiEndpoint: string, router: any) {
  const familyId = await SecureStore.getItemAsync("family_id");
  const pushToken = await SecureStore.getItemAsync("push_token");
  const token = await SecureStore.getItemAsync("auth_token");

  if (!familyId || !pushToken) {
    throw new Error("Missing credentials");
  }
  // 🔴 1️⃣ Remove token from server
  const res = await apiFetch(
    apiEndpoint,
    {
      method: "DELETE",
      body: JSON.stringify({
        familyId,
        token: pushToken,
      }),
    },
    token!
  );
  const json = await res.json();
  console.log("Logout response JSON:", json);

  // if (!json.success) {
  // throw new Error(json.message || "Server rejected logout");
  // }

  // 🧹 2️⃣ Clear ALL local data (ONLY after server success)
  await Promise.all([
    SecureStore.deleteItemAsync("auth_token"),
    SecureStore.deleteItemAsync("family_id"),
    SecureStore.deleteItemAsync("push_token"),

    // 🔥 Clear all cached data
    AsyncStorage.clear(),
  ]);

  // 🚀 3️⃣ Go to login
  router.replace("/(auth)/login");
}
