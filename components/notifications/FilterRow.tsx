import ThemeText from "@/components/ui/theme-text";
import { Pressable, StyleSheet, View } from "react-native";

export default function FilterRow({ filter, setFilter, counts }: any) {
  const Btn = ({ id, text }: any) => (
    <Pressable
      onPress={() => setFilter(id)}
      style={[styles.btn, filter === id ? styles.active : styles.inactive]}
    >
      <ThemeText style={filter === id ? styles.activeText : styles.text}>
        {text}
      </ThemeText>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <Btn id="all" text="All" />
      <Btn id="unread" text={`Unread (${counts.new})`} />
      <Btn id="read" text={`Read (${counts.read})`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#163B69",
  },
  btn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 999 },
  active: { backgroundColor: "white" },
  inactive: { backgroundColor: "#385577" },
  activeText: { color: "#1E293B", fontWeight: "600" },
  text: { color: "white" },
});
