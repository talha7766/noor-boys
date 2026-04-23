/* eslint-disable react-hooks/exhaustive-deps */
// app/index.tsx
import NetworkError from "@/components/NetworkError";
import ThemeText from "@/components/ui/theme-text";
import { useNetwork } from "@/context/NetworkContext";
import { apiFetch } from "@/utils/apiFetch";
import { logoutWithServer } from "@/utils/logout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  Bell,
  ChevronRight,
  Power,
  RefreshCcw,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  ToastAndroid,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
interface Student {
  id: string;
  name: string;
  familyId: string;
  class: string;
  section: string;
  feeDues: string;
  unreadMessages: number;
  photo?: string;
}
function bufferToBase64(buffer: number[]) {
  const CHUNK_SIZE = 0x8000; // 32k
  let binary = "";
  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

const [schoolName, setSchoolName] = useState("Loading...");
const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  // Fetch students on mount
  const [loading, setLoading] = useState(true);
  const { isConnected } = useNetwork();

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startRotation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopRotation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const bgAnim = useRef(new Animated.Value(0)).current;
  const fetchStudents = async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const familyId = await SecureStore.getItemAsync("family_id");

      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      const res = await apiFetch(
        // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
        `${process.env.EXPO_PUBLIC_API_ENDPOINT}/students/${familyId}`,
        {},
        token
      );
      const data = await res.json();

      if (data.success && data.data) {
        const formatted = data.data.map((s: any) => {
          let photoUri = "https://randomuser.me/api/portraits/lego/1.jpg"; // default placeholder
          // Convert MongoDB buffer to base64 if Image exists
          if (s.Image?.data) {
            const base64 = bufferToBase64(s.Image.data);
            photoUri = `data:image/png;base64,${base64}`;
          }
          return {
            id: s.ID,
            familyId,
            name: s.Name,
            class: s.Class,
            section: s.Section,
            feeDues: s.TotalReceivableWithAdvance,
            unreadMessages: s.UnReadMessages,
            photo: photoUri,
          };
        });
        setStudents(formatted);
        setLoading(false);
        await AsyncStorage.setItem("students_cache", JSON.stringify(formatted));
      } else {
        // No students found or invalid token
        // await SecureStore.deleteItemAsync("auth_token");
        // router.replace("/(auth)/login");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      // router.replace("/(auth)/login");
    }
  };
  const refreshStudents = async () => {
    try {
      setIsRefreshing(true);
      startRotation();

      if (Platform.OS === "android") {
        ToastAndroid.show("Reloading students…", ToastAndroid.SHORT);
      }

      await fetchStudents();
    } finally {
      setIsRefreshing(false);
      stopRotation();
    }
  };

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);

      // 1) Load cached data instantly
      const cached = await AsyncStorage.getItem("students_cache");
      if (cached) {
        setStudents(JSON.parse(cached));
        setLoading(false); // show instantly
      }

      // 2) Background fetch to refresh data
      fetchStudents();
    };

    loadStudents();
  }, []);

  // For School Logo
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
  
        // 🔥 convert to blob
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
    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(bgAnim, {
          toValue: 2,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(bgAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ])
    );

    loopAnimation.start();

    // Optional cleanup (stop animation on unmount)
    return () => loopAnimation.stop();
  }, []);

  // useEffect (school name)
useEffect(() => {
  const fetchSchoolName = async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) return;

      const res = await apiFetch(
        `${process.env.EXPO_PUBLIC_API_ENDPOINT}/school-setting/particular`,
        {},
        token
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


  const backgroundColor = bgAnim.interpolate({
    inputRange: [1, 2],
    outputRange: ["#F68634", "#0199DC"],
  });

  const handleSelect = (studentId: string) => {
    router.push({ pathname: "/dashboard", params: { sid: studentId } });
    // alert("hello Nawaz");
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
  {logoLoading ? (
    <ActivityIndicator size="small" color="#3E3F9B" />
  ) : schoolLogo ? (
    <Image
      source={{ uri: schoolLogo }}
      style={styles.logoImage}
      resizeMode="contain"
      onError={(e) => {
        console.log("Header logo error:", e.nativeEvent.error);
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

            <View>
              <View style={{ flexDirection: "row", gap: 2 }}>
                <ThemeText style={styles.schoolName}>
                  {schoolName}
                </ThemeText>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemeText style={{ color: "white", fontSize: 14 }}>
                    {"\u2122"}
                  </ThemeText>
                </View>
              </View>
              <ThemeText style={styles.schoolTagline}>
                Empowering Education
              </ThemeText>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* 🔄 Refresh Button */}

            {/* 🔌 Logout */}
            <View>
              <Pressable
                onPress={async () => {
                  try {
                    await logoutWithServer(
                      `${process.env.EXPO_PUBLIC_API_ENDPOINT!}/device-token`,
                      router
                    );
                  } catch (err: any) {
                    console.error("Logout failed:", err);

                    if (Platform.OS === "android") {
                      ToastAndroid.show(
                        "Logout failed. Check internet & try again.",
                        ToastAndroid.SHORT
                      );
                    } else {
                      alert("Logout failed. Check internet & try again.");
                    }
                  }
                }}
                style={styles.logoutBtn}
              >
                <ThemeText style={styles.logoutIcon}>
                  <Power size={18} color={"white"} />
                </ThemeText>
              </Pressable>
              <ThemeText style={styles.logoutText}>Logout</ThemeText>
            </View>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <ThemeText style={styles.heading}>Select a Student</ThemeText>
            <View style={styles.headingBar} />
          </View>
          <Pressable onPress={refreshStudents} style={styles.refreshBtn}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <RefreshCcw size={22} color="#fb923c" />
            </Animated.View>
          </Pressable>
        </View>
        <NetworkError />
        {loading ? (
          <SkeletonList />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item.id)}
                disabled={!isConnected}
              >
                <View style={styles.card}>
                  <View style={{ width: "25%" }}>
                    <View style={styles.photoBox}>
                      <Image
                        source={{
                          uri: item.photo,
                        }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                    </View>
                    <ThemeText style={styles.subText}>
                      Family ID: {item.familyId}
                    </ThemeText>
                    <ThemeText style={styles.subText}>{item.class}</ThemeText>
                    <ThemeText style={styles.subText}>{item.section}</ThemeText>
                  </View>
                  <View style={{ width: "75%" }}>
                    {/* Top Row */}
                    <View style={styles.topRow}>
                      {/* Photo + Text */}
                      <View style={styles.photoRow}>
                        <View style={{ marginLeft: 12 }}>
                          {item.name.split(" ").map((word, index) => (
                            <ThemeText key={index} style={styles.name}>
                              {word}
                            </ThemeText>
                          ))}
                        </View>
                      </View>

                      {/* Select Button */}
                      <Animated.View
                        style={[styles.selectBtn, { backgroundColor }]}
                      >
                        <Pressable
                          style={{
                            flexDirection: "row",
                            alignItems: "center",

                            // paddingHorizontal: 12,
                            // paddingVertical: 6,
                          }}
                          disabled={isConnected ? false : true}
                          onPress={() => handleSelect(item.id)}
                        >
                          <ThemeText style={styles.selectBtnText}>
                            Open
                          </ThemeText>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <View>
                              <ChevronRight
                                size={12}
                                color="#fff"
                                style={{ marginRight: -3 }}
                              />
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    </View>

                    {/* Bottom Stats */}
                    <View style={styles.statsRow}>
                      {/* Fee Box */}
                      <View
                        style={[styles.statBox, { backgroundColor: "#F8FAFC" }]}
                      >
                        <ThemeText
                          style={[styles.statIcon, { color: "#dc2626" }]}
                        >
                          <Wallet size={20} color={"#dc2626"} />
                        </ThemeText>
                        <ThemeText style={styles.statTitle}>Fee Dues</ThemeText>
                        <ThemeText
                          style={[styles.statValue, { color: "#dc2626" }]}
                        >
                          Rs. {item.feeDues}
                        </ThemeText>
                      </View>

                      {/* Message Box */}
                      <View
                        style={[styles.statBox, { backgroundColor: "#F8FAFC" }]}
                      >
                        <ThemeText
                          style={[styles.statIcon, { color: "#f97316" }]}
                        >
                          <Bell size={20} color={"#f97316"} />
                        </ThemeText>
                        <ThemeText style={styles.statTitle}>
                          New Message
                        </ThemeText>
                        <ThemeText
                          style={[styles.statValue, { color: "#f97316" }]}
                        >
                          {item.unreadMessages} Unread
                        </ThemeText>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}
function SkeletonList() {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.skelCard]}>
          {/* Left skeleton column */}
          <View style={{ width: "25%" }}>
            <View style={styles.skelPhoto} />

            <View style={styles.skelLineSm} />
            <View style={styles.skelLineSm} />
            <View style={styles.skelLineSm} />
          </View>

          {/* Right skeleton column */}
          <View style={{ width: "73%" }}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.skelLineLg} />
                <View style={[styles.skelLineLg, { width: "55%" }]} />
              </View>

              <View style={styles.skelBtn} />
            </View>

            <View style={styles.skelStatsRow}>
              <View style={styles.skelStatBox} />
              <View style={styles.skelStatBox} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // gray-50
  },

  /* HEADER */
  header: {
    padding: 16,
    paddingVertical: 8,
    backgroundColor: "#602e67", // blue-600
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    padding: 0,
  },
  logoImage: { width: "100%", height: "100%" },
  logoEmoji: {
    fontSize: 24,
  },

  schoolName: {
    fontSize: 16,
    color: "white",
    fontFamily: "Cuckoo-Regular",
  },

  schoolTagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "right",
    fontFamily: "segoesc",
  },
  refreshBtn: {
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  logoutBtn: {
    padding: 8,
    backgroundColor: "#0199DC",
    borderRadius: 8,
  },

  logoutIcon: {
    color: "white",
    fontSize: 12,
  },
  logoutText: {
    marginTop: 2,
    color: "white",
    fontSize: 10,
    textAlign: "center",
  },

  /* BODY */
  body: {
    padding: 16,
    flex: 1,
  },

  heading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3E3F9B", // gray-800
    marginBottom: 4,
  },

  headingBar: {
    height: 4,
    width: 80,
    backgroundColor: "#fb923c", // orange-400
    borderRadius: 10,
    marginBottom: 10,
  },

  /* CARD */
  /* CARD */
  card: {
    backgroundColor: "white",
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  photoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  photoBox: {
    width: "auto",
    height: 110,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 8,
  },

  photoImg: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    display: "flex", // Make the container a flex container
    flexDirection: "column", // Stack items vertically
  },

  subText: {
    fontSize: 12,
    // color: "#6b7280",
  },

  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0199DC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 6,
  },

  selectBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginRight: 2,

    elevation: 2,
  },

  /* STATS */
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
    marginLeft: 8,
  },

  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderColor: "rgba(139, 139, 139, 0.19)",
    borderWidth: 1,
  },

  statIcon: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 100,
    // fontSize: 10,
    marginBottom: 4,
  },

  statTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "semibold",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#e5e7eb", // gray-200
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  avatarEmoji: {
    fontSize: 40,
  },

  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },

  studentDetail: {
    fontSize: 14,
    color: "#6b7280",
  },

  selectBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statEmoji: {
    marginBottom: 4,
    fontSize: 20,
  },

  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  skelCard: {
    backgroundColor: "white",
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
  },

  skelPhoto: {
    width: "92%",
    height: 105,
    backgroundColor: "#efefef9d",
    borderColor: "#e3e3e359",
    borderRadius: 14,
    marginBottom: 10,
  },

  skelLineSm: {
    height: 10,
    backgroundColor: "#efefef57",
    borderColor: "#e3e3e359",
    borderRadius: 6,
    marginTop: 6,
    width: "75%",
  },

  skelLineLg: {
    height: 12,
    backgroundColor: "#efefef57",
    borderColor: "#e3e3e359",
    borderRadius: 6,
    marginTop: 8,
    width: "90%",
  },

  skelBtn: {
    width: 65,
    height: 26,
    backgroundColor: "#efefef57",
    borderColor: "#e3e3e359",
    borderRadius: 20,
    marginLeft: 8,
  },

  skelStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },

  skelStatBox: {
    flex: 1,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#efefef57",
    borderColor: "#e3e3e359",
  },
});
