/* eslint-disable react-hooks/exhaustive-deps */
// app/dashboard.tsx
import NetworkError from "@/components/NetworkError";
import QuickAccessCard from "@/components/QuickAccessCard";
import ThemeText from "@/components/ui/theme-text";
import { useNetwork } from "@/context/NetworkContext";
import { apiFetch } from "@/utils/apiFetch";
import { logoutWithServer } from "@/utils/logout";
import { bufferToBase64 } from "@/utils/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  AppWindowMac,
  Bell,
  BookA,
  BookOpen,
  ChevronLeft,
  ClipboardPenLine,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Power,
  ReceiptText,
  RefreshCcw,
  ScrollText,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// -------------------- TYPES --------------------
interface Student {
  id: string;
  familyId: string;
  rollNo: string;
  name: string;
  class: string;
  section: string;
  photo?: string;
}

interface HomeWorkType {
  id: string;
  title: string;
  badge: number;
  readCount: number;
}

interface QuickAccessItem {
  id?: string | null;
  icon: any;
  title: string;
  badge: number;
  // newCount?: number;
  readCount?: number;
  bgColor: string;
  badgeColor: string;
  onPress?: () => void;
}

// -------------------- QUICK ACCESS TEMPLATE --------------------
const quickAccessTemplate: QuickAccessItem[] = [
  {
    icon: Bell,
    title: "Notifications",
    badge: 0,
    bgColor: "#fee2e2",
    badgeColor: "#E74B3D",
  },
  {
    icon: MessageSquare,
    title: "Latest Updates",
    badge: 0,
    bgColor: "#ffedd5",
    badgeColor: "#FF8C42",
  },
  {
    icon: ScrollText,
    title: "Syllabus",
    badge: 0,
    bgColor: "#E8EDF5",
    badgeColor: "#0D2647",
  },
  {
    icon: FileText,
    title: "Daily Diary With Solution",
    badge: 0,
    bgColor: "#fef9c3",
    badgeColor: "#ca8a04",
  },
  {
    icon: ClipboardPenLine,
    title: "Question Papers",
    badge: 0,
    bgColor: "#dbeafe",
    badgeColor: "#2663A8",
  },
  {
    icon: ReceiptText,
    title: "Fee Vouchers & Results",
    badge: 0,
    bgColor: "#ffe4e6",
    badgeColor: "#e11d48",
  },
  {
    icon: Clock,
    title: "Time Table",
    badge: 0,
    bgColor: "#dcfce7",
    badgeColor: "#0DB981",
  },
  {
    icon: BookOpen,
    title: "Rules & Regulations",
    badge: 0,
    bgColor: "#e0f2fe",
    badgeColor: "#0369a1",
  },
  {
    icon: BookA,
    title: "English Sentences",
    badge: 0,
    bgColor: "#fef0c3ff",
    badgeColor: "#f08b39ff",
  },
  {
    icon: GraduationCap,
    title: "Noor Boys Campus",
    badge: 0,
    bgColor: "#8287c536",
    badgeColor: "#3E3F9B",
  },
];

// -------------------- DASHBOARD --------------------
export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sid, fromNotification } = useLocalSearchParams();

  const [student, setStudent] = useState<Student | null>(null);
  const [homeworkTypes, setHomeworkTypes] = useState<HomeWorkType[]>([]);

  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingHW, setLoadingHW] = useState(true);


  const [schoolName, setSchoolName] = useState("Loading...");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isConnected } = useNetwork();

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

  // -------------------- BACK BUTTON HANDLER --------------------
  const handleBackPress = () => {
    // Check if we came from a notification
    if (fromNotification === "true") {
      // Always go to dashboard when coming from notification
      router.replace({
        pathname: "/",
      });
    } else if (router.canGoBack()) {
      // Normal back navigation
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.replace({
        pathname: "/",
      });
    }
  };
  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBackPress();
        return true; // Prevent default behavior
      }
    );

    return () => backHandler.remove();
  }, [fromNotification, router]);

  useEffect(() => {
    if (!sid) {
      router.replace("/");
      return;
    }
    const loadCachedData = async () => {
      setLoadingStudent(true);
      setLoadingHW(true);

      // 1️⃣ Load cached student
      const cachedStudent = await AsyncStorage.getItem(`student_${sid}`);
      if (cachedStudent) {
        setStudent(JSON.parse(cachedStudent));
        setLoadingStudent(false);
      }

      // 2️⃣ Load cached homework
      const cachedHW = await AsyncStorage.getItem(`homework_${sid}`);
      if (cachedHW) {
        setHomeworkTypes(JSON.parse(cachedHW));
        setLoadingHW(false);
      }

      // 3️⃣ Background fresh fetch
      fetchData();
    };
    const fetchData = async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const familyId = await SecureStore.getItemAsync("family_id");
        if (!token) return router.replace("/(auth)/login");

        // ---------- Fetch Student ----------
        const resStudent = await apiFetch(
          // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
          `${process.env.EXPO_PUBLIC_API_ENDPOINT}/student/${sid}`,
          {},
          token
        );
        const dataStudent = await resStudent.json();
        if (dataStudent.success && dataStudent.data?.length > 0) {
          const s = dataStudent.data[0];
          const photo = s.Image?.data
            ? `data:image/png;base64,${bufferToBase64(s.Image.data)}`
            : "https://randomuser.me/api/portraits/lego/1.jpg";

          const formattedStudent = {
            id: s.ID,
            rollNo: s.RollNo,
            familyId: familyId!,
            name: s.Name,
            class: s.Class,
            section: s.Section,
            photo,
          };
          setStudent(formattedStudent);
          await AsyncStorage.setItem(
            `student_${sid}`,
            JSON.stringify(formattedStudent)
          );
        }
        setLoadingStudent(false);

        // ---------- Fetch Homework Types ----------
        const resHW = await apiFetch(
          // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
          `${process.env.EXPO_PUBLIC_API_ENDPOINT}/notifications/types/${sid}`,
          {},
          token
        );
        const dataHW = await resHW.json();
        if (dataHW.success && dataHW.data) {
          const formattedHW = dataHW.data.map((h: any) => ({
            id: h.ID,
            title: h.Name,
            badge: Number(h.New),
            readCount: Number(h.Read),
          }));
          setHomeworkTypes(formattedHW);
          await AsyncStorage.setItem(
            `homework_${sid}`,
            JSON.stringify(formattedHW)
          );
        }

        // ---------- Fetch School Name ----------

const resSchool = await apiFetch(
  `${process.env.EXPO_PUBLIC_API_ENDPOINT}/school-setting/particular`,
  {},
  token
);

const dataSchool = await resSchool.json();

if (dataSchool.success) {
  setSchoolName(dataSchool.data); // 👈 yahan data hai
}
        setLoadingHW(false);
      } catch (err) {
        console.error(err);
        router.replace("/");
      }
    };

    loadCachedData();
  }, [sid, isConnected]);


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

  
  // 2️⃣ USE FOCUS EFFECT: Fetch homework types when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!homeworkTypes) return;
      const fetchHomeworkTypes = async () => {
        try {
          const token = await SecureStore.getItemAsync("auth_token");
          if (!token) return;

          // ---------- Fetch Homework Types ----------
          // setLoadingHW(true);
          const resHW = await apiFetch(
            // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
            `${process.env.EXPO_PUBLIC_API_ENDPOINT}/notifications/types/${sid}`,
            {},
            token
          );
          const dataHW = await resHW.json();
          if (dataHW.success && dataHW.data) {
            const formattedHW = dataHW.data.map((h: any) => ({
              id: h.ID,
              title: h.Name,
              badge: Number(h.New),
              readCount: Number(h.Read),
            }));
            setHomeworkTypes(formattedHW);
            await AsyncStorage.setItem(
              `homework_${sid}`,
              JSON.stringify(formattedHW)
            );
          }
          // setLoadingHW(false);
        } catch (err) {
          console.error(err);
        }
      };

      fetchHomeworkTypes();
    }, [sid])
  );
  const refreshHW = async () => {
    try {
      setIsRefreshing(true);
      startRotation();
      // 🔔 Show toast
      if (Platform.OS === "android") {
        ToastAndroid.show("Reloading Data…", ToastAndroid.SHORT);
      } else {
        alert("Reloading Data…");
      }

      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) return;

      // 🔄 Only fetch homework types
      const resHW = await apiFetch(
        // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
        `${process.env.EXPO_PUBLIC_API_ENDPOINT}/notifications/types/${sid}`,
        {},
        token
      );

      const dataHW = await resHW.json();

      if (dataHW.success && dataHW.data) {
        setHomeworkTypes(
          dataHW.data.map((h: any) => ({
            id: h.ID,
            title: h.Name,
            badge: Number(h.New),
            readCount: Number(h.Read),
          }))
        );
      }
    } catch (err) {
      console.log("Refresh HW Error:", err);
    } finally {
      setIsRefreshing(false);
      stopRotation();
    }
  };

  // ---------- MERGE TEMPLATE & API DATA ----------
  const mergedQuickAccess: QuickAccessItem[] = useMemo(() => {
    if (!homeworkTypes.length) return [];

    // 1️⃣ Keep only template items that exist in homework
    const templateMatched: QuickAccessItem[] = quickAccessTemplate
      .map((template) => {
        const match = homeworkTypes.find((h) =>
          h.title.toLowerCase().includes(template.title.toLowerCase())
        );

        if (!match) return null; // use null instead of undefined
        return {
          ...template,
          id: match.id,
          badge: match.badge,
          newCount: match.badge,
          readCount: match.readCount,
        } as QuickAccessItem;
      })
      .filter((item): item is QuickAccessItem => item !== null);

    // 2️⃣ Add extra homework items not in template
    const extraItems = homeworkTypes
      .filter(
        (h) =>
          !quickAccessTemplate.some((t) =>
            h.title.toLowerCase().includes(t.title.toLowerCase())
          )
      )
      .map((h) => ({
        id: h.id,
        title: h.title,
        badge: h.badge,
        newCount: h.badge,
        readCount: h.readCount,
        icon: AppWindowMac, // default icon
        bgColor: "#8287c536", // default
        // badgeColor: "#2427d8ff",
        badgeColor: "#3E3F9B",
      }));

    return [...templateMatched, ...extraItems];
  }, [homeworkTypes]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            
              <View style={styles.schoolLogo}>
  {logoLoading ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : schoolLogo ? (
    <Image
      source={{ uri: schoolLogo }}
      style={styles.logoImage}
      resizeMode="contain"
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
        </View>

        <View style={styles.studentWrap}>
          {loadingStudent ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Pressable
                onPress={() => {
                  handleBackPress();
                }}
                style={styles.backButton}
              >
                <ChevronLeft color="white" size={28} />
              </Pressable>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  backgroundColor: "#e5e7eb",
                }}
              />
              <View>
                <View
                  style={{
                    width: 140,
                    height: 12,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                />
                <View
                  style={{
                    width: 180,
                    height: 12,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 6,
                    marginBottom: 4,
                  }}
                />
                <View
                  style={{
                    width: 160,
                    height: 12,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 6,
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.studentRow}>
              <Pressable
                onPress={() => {
                  handleBackPress();
                }}
                style={styles.backButton}
              >
                <ChevronLeft color="white" size={28} />
              </Pressable>
              <View style={styles.studentAvatar}>
                {student?.photo ? (
                  <Image
                    source={{ uri: student.photo }}
                    style={{ width: 48, height: 48, borderRadius: 999 }}
                  />
                ) : (
                  <ThemeText style={styles.studentAvatarEmoji}>👤</ThemeText>
                )}
              </View>
              <View>
                <ThemeText style={styles.studentName}>
                  {student?.name}
                </ThemeText>
                <ThemeText style={styles.studentInfo}>
                  Family ID: {student?.familyId} | Roll No: {student?.rollNo}
                </ThemeText>
                <ThemeText style={styles.studentInfo}>
                  Class: {student?.class}
                </ThemeText>
                <ThemeText style={styles.studentInfo}>
                  Section: {student?.section}
                </ThemeText>
              </View>
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start", // <-- THIS is the fix
              gap: 10, // optional spacing
            }}
          >
            <View>
              <Pressable onPress={refreshHW} style={styles.refreshBtn}>
                <ThemeText style={styles.logoutIcon}>
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <RefreshCcw size={18} color="white" />
                  </Animated.View>
                </ThemeText>
              </Pressable>
              {/* <ThemeText style={styles.logoutText}>Refresh</ThemeText> */}
            </View>
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

      {/* BODY */}
      <ScrollView style={styles.body}>
        {/* Announcement */}
        {/* <View style={styles.announcementCard}>
          <View style={styles.announcementRow}>
            <Calendar color="white" size={36} />
            <View>
              <ThemeText style={styles.announcementTitle}>
                Iqbal Day Holiday
              </ThemeText>
              <ThemeText style={styles.announcementSubtitle}>
                School Will Remain Close on 9th November
              </ThemeText>
              <ThemeText style={styles.announcementDate}>
                9 Nov 2025 →
              </ThemeText>
            </View>
          </View>
        </View> */}

        {/* Quick Access */}
        <View style={styles.quickAccessSection}>
          <NetworkError />

          <ThemeText style={styles.quickAccessTitle}>Quick Access</ThemeText>
          <ThemeText style={styles.quickAccessSubtitle}>
            Tap any section to view details
          </ThemeText>

          {loadingHW ? (
            <View style={styles.quickGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <View
                  key={i}
                  style={{
                    width: "48%",
                    height: 140,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 16,
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.quickGrid}>
              {mergedQuickAccess.map((item, index) => (
                <QuickAccessCard
                  key={index}
                  Icon={item.icon}
                  title={item.title}
                  badge={item.badge}
                  readCount={item.readCount}
                  badgeColor={item.badgeColor}
                  bgColor={item.bgColor}
                  onPress={() =>
                    router.push({
                      pathname: "/notifications",
                      params: {
                        title: item.title,
                        badge: item.badgeColor,
                        bgColor: item.bgColor,
                        icon: `${item.icon.displayName}`,
                        studentId: sid,
                        typeId: item.id,
                      },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------------------- STYLES ---------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    padding: 16,
    backgroundColor: "#602e67",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  schoolLogo: {
    width: 44,
    height: 44,
    backgroundColor: "white",
    overflow: "hidden",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    padding: 0,
  },
  logoImage: { width: "100%", height: "100%" },

  schoolName: {
    color: "white",
    // fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Cuckoo-Regular",
  },
  schoolTagline: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "right",
    fontFamily: "segoesc",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 0,
    marginRight: 12,
    backgroundColor: "blue",
    textAlign: "auto",
  },
  studentWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  backButton: {
    marginRight: 2,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "white",
    // padding: 10,
    borderColor: "white",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studentAvatarEmoji: { fontSize: 28 },
  studentName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  studentInfo: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: "#6868B7",
    borderRadius: 8,
  },
  refreshBtn: {
    padding: 8,
    // backgroundColor: "#4ade80", // green
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
  body: {
    padding: 16,
  },
  announcementCard: {
    backgroundColor: "#f472b6",
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  announcementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  announcementTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  announcementSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  announcementDate: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  quickAccessSection: {
    marginBottom: 16,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  quickAccessSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 48,
  },
});
