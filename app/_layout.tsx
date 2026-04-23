// app/_layout.tsx
import MySplashScreen from "@/components/MySplashScreen";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

type NotificationData = {
  screen?: string;
  studentId?: string | number;
  typeId?: string | number;
  typeName?: string;
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Prevent auto-hide immediately
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  return (
    <NetworkProvider>
      <RootLayout />
    </NetworkProvider>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Blink-Regular": require("../assets/fonts/BlinkMacSystemFont-Regular.otf"),
    "Blink-Bold": require("../assets/fonts/BlinkMacSystemFont-Bold.otf"),
    "Blink-Medium": require("../assets/fonts/BlinkMacSystemFont-Medium.otf"),
    "Blink-Semibold": require("../assets/fonts/BlinkMacSystemFont-Semibold.otf"),
    "Blink-Light": require("../assets/fonts/BlinkMacSystemFont-Light.otf"),
    "Blink-Thin": require("../assets/fonts/BlinkMacSystemFont-Thin.otf"),
    "Cuckoo-Regular": require("../assets/fonts/CuckooRegular.ttf"),
    segoesc: require("../assets/fonts/segoesc.ttf"),
  });

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { isConnected } = useNetwork();
  const handledInitialNotification = useRef(false);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pendingNotification = useRef<NotificationData | null>(null);

  // Handle notification tap when app is in foreground/background
  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;
        console.log("Notification tapped:", data);

        if (data.screen === "notifications" && data.studentId && data.typeId) {
          router.replace({
            pathname: "/notifications",
            params: {
              title: data.typeName || "Notifications",
              badge: "#E74B3D",
              bgColor: "#fee2e2",
              icon: "Bell",
              studentId: String(data.studentId),
              typeId: String(data.typeId),
              fromNotification: "true",
            },
          });
        }
      });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || handledInitialNotification.current) return;

      handledInitialNotification.current = true;
      pendingNotification.current = response.notification.request.content
        .data as NotificationData;
      // const data = response.notification.request.content
      //   .data as NotificationData;
      // if (data.screen === "notifications" && data.studentId && data.typeId) {
      //   setTimeout(() => {
      //     router.replace({
      //       pathname: "/notifications",
      //       params: {
      //         title: data.typeName || "Notifications",
      //         badge: "#E74B3D",
      //         bgColor: "#fee2e2",
      //         icon: "Bell",
      //         studentId: String(data.studentId),
      //         typeId: String(data.typeId),
      //         fromNotification: "true",
      //       },
      //     });
      //     // setAppReady(true);
      //   }, 1000);
      // }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
  useEffect(() => {
    if (!appReady || !pendingNotification.current) return;

    const data = pendingNotification.current;
    pendingNotification.current = null;

    if (data.screen === "notifications" && data.studentId && data.typeId) {
      router.replace({
        pathname: "/notifications",
        params: {
          title: data.typeName || "Notifications",
          badge: "#E74B3D",
          bgColor: "#fee2e2",
          icon: "Bell",
          studentId: String(data.studentId),
          typeId: String(data.typeId),
          fromNotification: "true",
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appReady]);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isConnected) {
        setCheckingAuth(false);
        return;
      }

      try {
        const token = await SecureStore.getItemAsync("auth_token");
        const inAuthGroup = segments[0] === "(auth)";

        if (!token) {
          if (!inAuthGroup) router.replace("/(auth)/login");
          setCheckingAuth(false);
          return;
        }

        if (inAuthGroup) router.replace("/");
      } catch (e) {
        console.error("Error verifying auth token:", e);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, [segments, router, isConnected]);

  // Hide native splash and show app when ready
  useEffect(() => {
    if (fontsLoaded && !checkingAuth) {
      const hideNativeSplash = async () => {
        await SplashScreen.hideAsync();
        // Wait a bit to show custom splash
        setTimeout(() => {
          setAppReady(true);
        }, 3000); // Show custom splash for 3 seconds
      };

      hideNativeSplash();
    }
  }, [fontsLoaded, checkingAuth]);

  // Show custom splash screen while loading
  if (!appReady) {
    return <MySplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
