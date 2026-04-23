import ThemeText from "@/components/ui/theme-text";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

export default function NotificationCard({
  item,
  Icon,
  bgColor,
  borderColor,
  onPress,
  disabled,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: item.ViewedOn ? "white" : "#FFF5F5" },
          { borderLeftWidth: item.ViewedOn ? 0 : 4, borderColor },
        ]}
      >
        <View style={styles.row}>
          <ThemeText
            style={[
              styles.icon,
              { backgroundColor: item.ViewedOn ? "#E5E7EB" : bgColor },
            ]}
          >
            <Icon color={item.ViewedOn ? "#606E80" : borderColor} />
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

        <ThemeText style={styles.title}>{item.Teacher}</ThemeText>
        <ThemeText style={styles.msg}>{item.Detail || item.FileName}</ThemeText>

        <View style={styles.status}>
          {item.ViewedOn ? <Eye color="green" /> : <EyeOff color="red" />}
          <ThemeText style={{ color: item.ViewedOn ? "green" : "red" }}>
            {item.ViewedOn ? "Read" : "Not Read Yet"}
          </ThemeText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  icon: { padding: 12, borderRadius: 50 },
  new: { color: "white", paddingHorizontal: 16, borderRadius: 20 },
  title: { fontWeight: "bold", marginTop: 8 },
  msg: { fontSize: 14, color: "#374151", marginBottom: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontSize: 12, color: "#6B7280" },
  status: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
});
