// app/notifications.tsx
import ThemeText from "@/components/ui/theme-text";
import * as IntentLauncher from "expo-intent-launcher";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AppWindowMac,
  Bell,
  Book,
  BookA,
  BookOpen,
  Calendar,
  ChevronLeft,
  ClipboardPenLine,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Heart,
  LogOut,
  MessageSquare,
  ReceiptText,
  ScrollText,
  TrendingUp,
  User,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  ToastAndroid,
  View,
} from "react-native";

import Skeleton from "@/components/notifications/Skeleton";
import StatusBar from "@/components/notifications/StatusBar";
import { apiFetch, getSignedHeaders } from "@/utils/apiFetch";
import { downloadWithValidation } from "@/utils/utils";
import { BlurView } from "expo-blur";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NotificationItem {
  ID: number;
  ContentsID: number;
  Type: string;
  DateFrom: string;
  DateTo: string;
  ViewedOn: string | null;
  Teacher: string;
  FileName: string;
  Detail: string;
  UseForNotifications: boolean;
  MediaType: number;
}

const ICONS: Record<string, React.ComponentType<any>> = {
  Bell,
  Book,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Heart,
  LogOut,
  MessageSquare,
  TrendingUp,
  ClipboardPenLine,
  GraduationCap,
  User,
  BookA,
  ScrollText,
  ReceiptText,
  AppWindowMac,
};

/**
 * Marks a notification as read in the backend
 * @param contentId ID of the notification content
 * @param id ID of the Notfication
 * @param token Auth token
 */
async function markNotificationAsRead(
  contentId: number,
  id: number,
  token: string,
  studentID: number
) {
  try {
    const res = await apiFetch(
      // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
      `${process.env.EXPO_PUBLIC_API_ENDPOINT}/notifications/${id}/viewed`,
      {
        method: "PUT",
        body: JSON.stringify({
          contentId,
          studentID,
        }),
      },
      token
    );

    const data = await res.json();
    if (!data.success) {
      console.warn("Failed to mark notification as read:", data.error);
    } else {
      console.log(`Notification ${contentId} marked as read`);
    }
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
}

export default function Notifications() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { title, badge, bgColor, icon, studentId, typeId, fromNotification } =
    params;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [openingFileId, setOpeningFileId] = useState<number | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textModalContent, setTextModalContent] = useState("");
  const [slowInternetMessage, setSlowInternetMessage] = useState(false);
  const borderColor = badge?.toString() || "#0af";
  const Icon = ICONS[icon as string];

  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // -------------------- BACK BUTTON HANDLER --------------------
  const handleBackPress = () => {
    // Check if we came from a notification
    if (fromNotification === "true") {
      // Always go to dashboard when coming from notification
      router.replace({
        pathname: "/dashboard",
        params: { sid: studentId, fromNotification: "ture" },
      });
    } else if (router.canGoBack()) {
      // Normal back navigation
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.replace({
        pathname: "/dashboard",
        params: { sid: studentId, fromNotification: "ture" },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromNotification, router]);
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_token");
        if (!token) return router.replace("/(auth)/login");
        const res = await apiFetch(
          // "https://mssql-server-test-zwjm.vercel.app/api/mobile-api",
          `${process.env.EXPO_PUBLIC_API_ENDPOINT}/notifications/${studentId}/${typeId}`,
          {},
          token
        );

        const data = await res.json();
        if (data.success) {
          setNotifications(data.data);
        }
      } catch (err) {
        console.error("Notification error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, typeId]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (openingFileId) {
      timer = setTimeout(() => setSlowInternetMessage(true), 7000); // show message after 7s
    } else {
      setSlowInternetMessage(false); // reset when done
    }

    return () => clearTimeout(timer);
  }, [openingFileId]);

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.ViewedOn;
    return n.ViewedOn;
  });

  const counts = {
    new: notifications.filter((n) => !n.ViewedOn).length,
    read: notifications.filter((n) => n.ViewedOn).length,
    total: notifications.length,
  };

  // ---------------- HANDLE CARD PRESS ----------------
  const handleCardPress = async (item: NotificationItem) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) return router.replace("/(auth)/login");
      if (openingFileId) return;
      const studentID = Number(studentId.toString());
      setOpeningFileId(item.ID);
      if (!item.ViewedOn) {
        await markNotificationAsRead(
          item.ContentsID,
          item.ID,
          token,
          studentID
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.ID === item.ID ? { ...n, ViewedOn: new Date().toISOString() } : n
          )
        );
      }

      // ------------ CASE 1: TEXT MESSAGE ---------------
      if (item.MediaType === 1) {
        setTextModalContent(item.Detail || item.FileName);
        setTextModalVisible(true);
        setOpeningFileId(null);
        return;
      }

      ToastAndroid.show("Opening file...", ToastAndroid.SHORT);
      const lowerFileName = item.FileName.toLowerCase();
      const url = `${
        process.env.EXPO_PUBLIC_API_ENDPOINT
      }/download/${encodeURIComponent(item.FileName)}`;
      // ------------ CASE 2: IMAGES (png, jpg, jpeg) -> Navigate to file-viewer ---------------
      if (
        lowerFileName.endsWith(".png") ||
        lowerFileName.endsWith(".jpg") ||
        lowerFileName.endsWith(".jpeg")
      ) {
        router.push({
          pathname: "/file-viewer",
          params: {
            fileName: item.FileName,
            url,
          },
        });
        setOpeningFileId(null);
        return;
      }
      // ------------ CASE 3: PDF -> Download & Open with Intent ---------------
      if (lowerFileName.endsWith(".pdf")) {
        try {
          const localUri = FileSystemLegacy.cacheDirectory + item.FileName;
          const headers = await getSignedHeaders("GET", url, "{}", token);

          const uri = await downloadWithValidation(url, localUri, headers, 3);
          // // Check if file already exists
          // const fileInfo = await FileSystemLegacy.getInfoAsync(localUri);
          // let uri: string;
          // // Agar file exist karti hai LEKIN size 0 hai ya bahut chhoti hai, to dubara download karo
          // const needsDownload =
          //   !fileInfo.exists ||
          //   (fileInfo.exists && (!fileInfo.size || fileInfo.size < 1000));

          // if (needsDownload) {
          //   console.log("Downloading PDF file...");
          //   // Pehle purani file delete karo agar exist karti hai
          //   if (fileInfo.exists) {
          //     await FileSystemLegacy.deleteAsync(localUri, {
          //       idempotent: true,
          //     });
          //   }
          //   const headers = await getSignedHeaders("GET", url, "{}", token);
          //   const downloadRes = await FileSystemLegacy.downloadAsync(
          //     url,
          //     localUri,
          //     {
          //       headers,
          //     }
          //   );
          //   if (downloadRes.status !== 200) {
          //     throw new Error(
          //       `Download failed with status ${downloadRes.status}`
          //     );
          //   }
          //   uri = downloadRes.uri;
          //   console.log("PDF downloaded successfully");
          // } else {
          //   console.log(
          //     "PDF already cached, size:",
          //     fileInfo.size / (1024 * 1024)
          //   );
          //   uri = localUri;
          // }

          // Open PDF with Intent Launcher (Android)
          if (Platform.OS === "android") {
            const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: "application/pdf",
              }
            );
          } else if (Platform.OS === "ios") {
            // For iOS, you might want to use expo-sharing or a different approach

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri);
            } else {
              Alert.alert("Error", "Sharing is not available on this device");
            }
          }
        } catch (pdfError) {
          console.error("PDF open error:", pdfError);

          Alert.alert(
            "Unable to open PDF",
            "The file could not be opened. Please check your internet connection or ensure a PDF viewer is installed."
          );
        } finally {
          setOpeningFileId(null);
        }

        return;
      }
    } catch (err) {
      console.error("Error opening file:", err);
      Alert.alert(
        "Error",
        "Failed to open file. Please ensure you have a compatible app installed."
      );
    } finally {
      setOpeningFileId(null);
    }
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              handleBackPress();
            }}
            style={styles.backButton}
          >
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <View>
            <ThemeText style={styles.headerTitle}>{title}</ThemeText>
          </View>
        </View>

        {/* Stats */}
        <StatusBar loading={loading} counts={counts} />
      </View>

      {/* Body */}
      <View style={styles.content}>
        {/* Filter Buttons */}
        <View style={styles.filterRow}>
          {["all", "unread", "read"].map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f as any)}
              style={[
                styles.filterButton,
                filter === f ? styles.filterActive : styles.filterInactive,
              ]}
            >
              <ThemeText
                style={
                  filter === f
                    ? styles.filterActiveText
                    : styles.filterInactiveText
                }
              >
                {f === "all"
                  ? "All"
                  : f === "unread"
                  ? `Unread (${counts.new})`
                  : `Read (${counts.read})`}
              </ThemeText>
            </Pressable>
          ))}
        </View>

        {/* Notifications List */}
        {loading ? (
          <View style={{ padding: 16 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.skeletonCard, { marginBottom: 16 }]}>
                <Skeleton width={48} height={48} radius={24} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Skeleton width="60%" height={16} />
                  <View style={{ height: 8 }} />
                  <Skeleton width="90%" height={14} />
                  <View style={{ height: 8 }} />
                  <Skeleton width="70%" height={14} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: "#e5e8ecff" }}>
            <FlatList
              data={filtered}
              // style={{ flex: 1 }}
              keyExtractor={(i) => String(i.ID)}
              contentContainerStyle={{
                paddingBottom: 60,
                paddingHorizontal: 16, // Move horizontal padding here
                paddingTop: 16, // Add top padding here
              }}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCardPress(item)}
                  disabled={!!openingFileId}
                  style={{
                    opacity:
                      openingFileId && openingFileId !== item.ID ? 0.6 : 1,
                  }}
                >
                  <View
                    style={[
                      styles.card,
                      { borderColor: borderColor },
                      { backgroundColor: !item.ViewedOn ? "#FFF5F5" : "white" },
                      {
                        borderLeftWidth: item.ViewedOn ? 0 : 4,
                      },
                    ]}
                  >
                    <View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <ThemeText
                          style={[
                            styles.bellWrap,
                            {
                              backgroundColor: item.ViewedOn
                                ? "#E5E7EB"
                                : bgColor?.toString() ?? "",
                            },
                          ]}
                        >
                          <Icon
                            color={!item.ViewedOn ? borderColor : "#606E80"}
                            style={{}}
                          />
                        </ThemeText>
                        {!item.ViewedOn && (
                          <View>
                            <ThemeText
                              style={{
                                backgroundColor: borderColor,
                                alignItems: "center",
                                color: "white",
                                fontSize: 14,
                                fontWeight: "semibold",
                                paddingHorizontal: 16,
                                borderRadius: 20,
                                paddingVertical: 6,
                                marginRight: 8,
                              }}
                            >
                              New
                            </ThemeText>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <ThemeText style={[styles.cardTitle]}>
                          {item.Teacher}
                        </ThemeText>
                        <ThemeText style={styles.cardMessage}>
                          {item.Detail || item.FileName}
                        </ThemeText>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 8,
                        }}
                      >
                        {item.ViewedOn ? (
                          <Eye color={"green"} />
                        ) : (
                          <EyeOff color={"red"} />
                        )}
                        <ThemeText
                          style={[
                            styles.cardTitle,
                            {
                              color: item.ViewedOn ? "green" : "red",
                              marginLeft: 4,
                            },
                          ]}
                        >
                          {item.ViewedOn ? "Read" : "Not Read Yet"}
                        </ThemeText>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            />
            {openingFileId && (
              <BlurView
                intensity={50} // 0–100 (higher = stronger blur)
                tint="dark" // "light" | "dark" | "default"
                style={styles.flatListLoadingOverlay}
              >
                <ActivityIndicator size="large" color="#fff" />

                {/* <ActivityIndicator size="large" color="black" /> */}
                <ThemeText
                  style={{
                    marginTop: 12,
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Loading, Please wait...
                </ThemeText>
                {slowInternetMessage && (
                  <ThemeText
                    style={{
                      marginTop: 8,
                      color: "white",
                      fontSize: 14,
                      fontWeight: "400",
                      textAlign: "center",
                      paddingHorizontal: 20,
                    }}
                  >
                    This may take a while on slow internet...
                  </ThemeText>
                )}
              </BlurView>
            )}
          </View>
        )}
      </View>

      {/* -------- TEXT VIEWER MODAL -------- */}
      {textModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ThemeText style={styles.modalTitle}>Message</ThemeText>

            <View style={styles.modalScroll}>
              <ThemeText style={styles.modalText}>{textModalContent}</ThemeText>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setTextModalVisible(false)}
            >
              <ThemeText style={styles.modalCloseText}>Close</ThemeText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerWrapper: {
    backgroundColor: "#163B69",
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  statsWrapper: {
    marginTop: 12,
    flexDirection: "row",
    // backgroundColor: "#385577",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  statsBox: {
    flex: 1,
    alignItems: "center",
    // padding: 16,
    // backgroundColor: "white",
  },
  statsBoxMiddle: {
    flex: 1,
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    // padding: 16,
    // backgroundColor: "white",
    borderColor: "rgba(0, 0, 0, 0.3)",
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3E3F9B",
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: "semibold",
    color: "#3E3F9B",
  },
  content: {
    flex: 1,
  },
  filterRow: {
    backgroundColor: "#163B69",
    flexDirection: "row",
    padding: 16,
    gap: 8,
    justifyContent: "flex-start",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  filterActive: {
    backgroundColor: "white",
  },
  filterInactive: {
    backgroundColor: "#385577",
  },
  filterActiveText: {
    color: "#1E293B",
    fontWeight: "semibold",
  },
  filterInactiveText: {
    color: "white",
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingVertical: 18,
    backgroundColor: "white",
    borderRadius: 12,
  },
  card: {
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,

    // Android shadow
    elevation: 2,
  },
  bellWrap: {
    padding: 12,
    maxWidth: 48,
    borderRadius: 100,
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  cardDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDate: {
    color: "#6B7280",
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 4,
    color: "#4B5563",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 20,
    maxHeight: "80%",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1F2937",
  },
  modalScroll: {
    maxHeight: "70%",
  },
  modalText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  modalCloseButton: {
    marginTop: 18,
    padding: 12,
    backgroundColor: "#163B69",
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  flatListLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)", // dim the list
    paddingTop: 120,
    // justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
});
