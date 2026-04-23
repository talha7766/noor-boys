// components/QuickAccessCard.tsx
import React from "react";
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  Icon?: React.ComponentType<any>;
  title: string;
  badge?: number;
  // newCount?: number;
  readCount?: number;
  color?: "red" | "orange" | "blue" | "green" | "purple";
  bgColor?: string; // <-- new
  badgeColor?: string; // <-- new
  onPress?: (event: GestureResponderEvent) => void;
};

export default function QuickAccessCard({
  Icon,
  title,
  badge,
  // newCount,
  readCount,
  color = "blue",
  badgeColor,
  bgColor,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.8 } : null]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: bgColor ?? "#dbeafe" },
          ]}
        >
          {Icon && <Icon color={badgeColor} />}
        </View>

        {badge ? (
          <View
            style={[styles.badge, { backgroundColor: badgeColor ?? "#2663A8" }]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.statusRow}>
        {badge !== undefined && (
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
            <Text style={styles.statusText}>{badge} New</Text>
          </View>
        )}

        {readCount !== undefined && (
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: "#9ca3af" }]} />
            <Text style={styles.statusText}>{readCount} Read</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* ---------------------------- STYLES ---------------------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: "48%",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
