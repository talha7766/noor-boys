import { AnimatableNumericValue, DimensionValue, View } from "react-native";

export default function Skeleton({
  width,
  height,
  radius = 6,
}: {
  width: DimensionValue;
  height: DimensionValue;
  radius?: AnimatableNumericValue;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: "#E5E7EB",
      }}
    />
  );
}
