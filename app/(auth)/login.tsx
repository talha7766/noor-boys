// app/index.tsx
import ThemeText from "@/components/ui/theme-text";
import { apiFetch } from "@/utils/apiFetch";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ArrowRight, Eye, EyeOff, Lock, Sparkles, UserRound } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

async function registerForPushToken() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Permission for notifications NOT granted.");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "4d09e9c6-4b08-4e29-a868-950137ef205f",
  });

  return tokenData.data;
}

export default function Login() {
  const router = useRouter();

  const [familyId, setFamilyId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [schoolName, setSchoolName] = useState("Loading...");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

  const passwordRef = useRef<TextInput>(null);
  const shift = useState(new Animated.Value(0))[0];
  const logoAnim = useState(new Animated.Value(1))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const loadRememberedCredentials = async () => {
      const savedFamilyId = await SecureStore.getItemAsync("remember_family_id");
      const savedPassword = await SecureStore.getItemAsync("remember_password");
      const remembered = await SecureStore.getItemAsync("remember_me");

      if (remembered === "true" && savedFamilyId && savedPassword) {
        setFamilyId(savedFamilyId);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    };

    loadRememberedCredentials();
  }, []);

  useEffect(() => {
    const fetchSchoolName = async () => {
      try {
        const res = await apiFetch(
          `${process.env.EXPO_PUBLIC_API_ENDPOINT}/school-setting/particular`,
          {}
        );

        const data = await res.json();

        if (data.success) {
          setSchoolName(data.data);
        }
      } catch (err) {
        console.error("School name error:", err);
      }
    };

    fetchSchoolName();
  }, []);

  useEffect(() => {
    const fetchSchoolLogo = async () => {
      try {
        setLogoLoading(true);

        const response = await apiFetch(
          `${process.env.EXPO_PUBLIC_API_ENDPOINT}/school-setting/logo`,
          {}
        );

        if (!response.ok) {
          throw new Error("Logo fetch failed");
        }

        const blob = await response.blob();
        const reader = new FileReader();

        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        setSchoolLogo(base64);
      } catch (err) {
        console.error("School logo error:", err);
        setSchoolLogo(null);
      } finally {
        setLogoLoading(false);
      }
    };

    fetchSchoolLogo();
  }, []);

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", (e) => {
      const shiftValue = Math.min(0, -e.endCoordinates.height + 140);
      Animated.timing(shift, {
        toValue: shiftValue,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      Animated.timing(logoAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(shift, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const signIn = async () => {
    if (!familyId || !password) {
      alert("Please enter Family ID and Password");
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch(
        `${process.env.EXPO_PUBLIC_API_ENDPOINT}/login`,
        {
          method: "POST",
          body: JSON.stringify({
            familyId,
            password,
          }),
        }
      );

      const json = await response.json();
      console.log("Login response:", json);
      if (!json.success) {
        alert(json.error || "Login failed");
        setLoading(false);
        return;
      }

      const pushToken = await registerForPushToken();
      if (!pushToken) {
        throw new Error("Push notification permission not granted");
      }

      const tokenRes = await apiFetch(
        `${process.env.EXPO_PUBLIC_API_ENDPOINT}/device-token`,
        {
          method: "POST",
          body: JSON.stringify({
            familyId: json.familyId,
            token: pushToken,
          }),
        },
        json.token
      );

      const tokenJson = await tokenRes.json();
      if (!tokenJson.success) {
        throw new Error(tokenJson.message || "Failed to save push token");
      }

      await Promise.all([
        SecureStore.setItemAsync("auth_token", json.token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
        SecureStore.setItemAsync("family_id", json.familyId, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
        SecureStore.setItemAsync("push_token", pushToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      ]);

      // Remember Me logic (saves both Family ID and Password)
      if (rememberMe) {
        await Promise.all([
          SecureStore.setItemAsync("remember_family_id", familyId),
          SecureStore.setItemAsync("remember_password", password),
          SecureStore.setItemAsync("remember_me", "true"),
        ]);
      } else {
        await Promise.all([
          SecureStore.deleteItemAsync("remember_family_id"),
          SecureStore.deleteItemAsync("remember_password"),
          SecureStore.setItemAsync("remember_me", "false"),
        ]);
      }

      setLoading(false);
      router.replace("/");
    } catch (err: any) {
      console.log("Network Error: " + err.message);
      alert("Please check your internet connection");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -100}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#602e67", "#14b89c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          <Animated.View
            style={[
              styles.centerWrapper,
              { transform: [{ translateY: shift }], opacity: fadeAnim },
            ]}
          >
            {/* Logo Section */}
            <Animated.View
              style={[
                styles.logoSection,
                { opacity: logoAnim, transform: [{ scale: logoAnim }] },
              ]}
            >
              <View style={styles.logoBox}>
                {logoLoading ? (
                  <ActivityIndicator size="large" color="#14b89c" />
                ) : schoolLogo ? (
                  <Image
                    source={{ uri: schoolLogo }}
                    style={styles.logoImage}
                    resizeMode="contain"
                    onError={(e) => {
                      console.log("Image load error:", e.nativeEvent.error);
                      setSchoolLogo(null);
                    }}
                  />
                ) : (
                  <Image
                    source={require("@/assets/images/splash-icon2.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.schoolInfoContainer}>
                <View style={styles.schoolNameRow}>
                  <ThemeText style={styles.schoolName}>
                    {schoolName}
                  </ThemeText>
                  <View style={styles.trademarkBadge}>
                    <ThemeText style={styles.trademarkText}>
                      {"\u2122"}
                    </ThemeText>
                  </View>
                </View>
                <ThemeText style={styles.schoolTagline}>
                  Empowering Education
                </ThemeText>
              </View>
            </Animated.View>

            {/* Login Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles color="#14b89c" size={24} />
                <ThemeText style={styles.heading}>Welcome</ThemeText>
                <ThemeText style={styles.subHeading}>
                  Sign in to access your child's progress
                </ThemeText>
              </View>

              <View style={styles.form}>
                {/* Family ID Input */}
                <View>
                  <ThemeText style={styles.label}>FAMILY ID</ThemeText>
                  <View style={styles.inputRow}>
                    <UserRound color="#14b89c" size={20} />
                    <TextInput
                      value={familyId}
                      onChangeText={setFamilyId}
                      placeholder="Enter your Family ID"
                      placeholderTextColor="#999"
                      style={styles.textInput}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View>
                  <ThemeText style={styles.label}>PASSWORD</ThemeText>
                  <View style={styles.inputRow}>
                    <Lock color="#14b89c" size={20} />
                    <TextInput
                      ref={passwordRef}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      placeholderTextColor="#999"
                      placeholder="Enter your password"
                      style={styles.textInput}
                      onSubmitEditing={signIn}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff color="#14b89c" size={20} />
                      ) : (
                        <Eye color="#14b89c" size={20} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Remember Me Checkbox - Now below password */}
                <Pressable
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.checkboxContainer}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <ThemeText style={styles.checkboxLabel}>
                    Remember Me
                  </ThemeText>
                </Pressable>

                {/* Sign In Button */}
                <Pressable
                  onPress={signIn}
                  style={styles.button}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ThemeText style={styles.buttonText}>Sign In</ThemeText>
                      <ArrowRight color="#fff" size={20} />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  // Decorative elements
  decorCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorCircle3: {
    position: "absolute",
    top: height * 0.3,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(20,184,156,0.2)",
  },
  // Logo Section
  logoSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoBox: {
    width: 120,
    height: 120,
    backgroundColor: "white",
    borderRadius: 60,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  logoImage: {
    width: "80%",
    height: "80%",
  },
  schoolInfoContainer: {
    alignItems: "center",
  },
  schoolNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  schoolName: {
    fontSize: 24,
    fontFamily: "Cuckoo-Regular",
    color: "white",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  trademarkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  trademarkText: {
    color: "white",
    fontSize: 10,
  },
  schoolTagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1,
  },
  // Card
  card: {
    backgroundColor: "white",
    borderRadius: 40,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1a1a2e",
    textAlign: "center",
  },
  subHeading: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#602e67",
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a2e",
    padding: 0,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#14b89c",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#14b89c",
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    color: "#555",
    fontSize: 14,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#602e67",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#602e67",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});