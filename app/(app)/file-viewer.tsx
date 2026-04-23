// app/file-viewer.tsx
import ThemeText from "@/components/ui/theme-text";
import { getSignedHeaders } from "@/utils/apiFetch";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FileViewer() {
  const router = useRouter();
  const { fileName, url } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileUrl = url as string;

  useEffect(() => {
    loadImageWithAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  const loadImageWithAuth = async () => {
    try {
      setLoading(true);
      setError(false);
      setProgress(0);

      // Get auth token
      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) {
        Alert.alert("Error", "Authentication required");
        router.back();
        return;
      }

      // Define local file path
      const localPath = FileSystem.cacheDirectory + (fileName as string);

      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log("Image already cached");
        setLocalUri(localPath);
        setLoading(false);
        return;
      }

      // Download with auth header
      console.log("Downloading image...");
      const headers = await getSignedHeaders("GET", fileUrl, "{}", token);

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        localPath,
        { headers },
        (downloadProgress) => {
          const progressPercent =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          setProgress(Math.round(progressPercent * 100));
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result) {
        console.log("Download complete:", result.uri);
        setLocalUri(result.uri);
      } else {
        throw new Error("Download failed");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading image:", err);
      setError(true);
      setLoading(false);
      Alert.alert("Error", "Failed to load image. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="white" size={28} />
        </Pressable>
        <ThemeText style={styles.headerTitle} numberOfLines={1}>
          {fileName}
        </ThemeText>
      </View>

      <View style={styles.imageContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <ThemeText style={styles.errorText}>Failed to load image</ThemeText>
            <Pressable style={styles.retryButton} onPress={loadImageWithAuth}>
              <ThemeText style={styles.retryText}>Retry</ThemeText>
            </Pressable>
          </View>
        ) : localUri ? (
          <Image
            source={{ uri: localUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#163B69" />
            <ThemeText style={styles.loadingText}>
              {progress > 0
                ? `Downloading... ${progress}%`
                : "Loading image..."}
            </ThemeText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#163B69",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#163B69",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#163B69",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
