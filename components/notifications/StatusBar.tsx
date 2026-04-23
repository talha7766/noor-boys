import ThemeText from "@/components/ui/theme-text";
import { StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton";

export default function StatsBar({ loading, counts }: any) {
  const Stat = ({ label, value, middle }: any) => (
    <View style={[styles.box, middle && styles.middle]}>
      {loading ? (
        <Skeleton width={32} height={20} />
      ) : (
        <ThemeText style={styles.num}>{value}</ThemeText>
      )}
      <ThemeText style={styles.label}>{label}</ThemeText>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Stat label="NEW" value={counts.new} />
      <Stat label="READ" value={counts.read} middle />
      <Stat label="TOTAL" value={counts.total} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  box: { flex: 1, alignItems: "center" },
  middle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.3)",
  },
  num: { fontSize: 22, fontWeight: "bold", color: "#3E3F9B" },
  label: { fontSize: 12, fontWeight: "600", color: "#3E3F9B" },
});
