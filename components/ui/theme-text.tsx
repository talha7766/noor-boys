import React from "react";
import { Text, TextProps, TextStyle } from "react-native";

const weightToFont: Record<string, string> = {
  // Numbers
  "100": "Blink-Thin",
  "200": "Blink-Ultralight",
  "300": "Blink-Light",
  "400": "Blink-Regular",
  "500": "Blink-Medium",
  "600": "Blink-Semibold",
  "700": "Blink-Bold",
  "800": "Blink-Heavy",
  "900": "Blink-Black",

  // Names
  thin: "Blink-Thin",
  extralight: "Blink-Ultralight",
  ultralight: "Blink-Ultralight",
  light: "Blink-Light",
  normal: "Blink-Regular",
  regular: "Blink-Regular",
  medium: "Blink-Medium",
  semibold: "Blink-Semibold",
  demibold: "Blink-Semibold",
  bold: "Blink-Bold",
  extrabold: "Blink-Heavy",
  heavy: "Blink-Heavy",
  black: "Blink-Black",
};

interface ThemeTextProps extends TextProps {
  style?: TextStyle | TextStyle[];
}

export default function ThemeText({
  style,
  children,
  ...rest
}: ThemeTextProps) {
  const flat: TextStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : style || {};

  const { fontWeight, fontStyle, fontFamily, ...other } = flat;

  // If user provided fontFamily → do not override
  if (fontFamily) {
    return (
      <Text {...rest} style={[{ fontFamily }, other]}>
        {children}
      </Text>
    );
  }

  // Convert weight to lower string
  const weightKey = fontWeight ? fontWeight.toString().toLowerCase() : "400";

  // Resolve base font
  const baseFont = weightToFont[weightKey] ?? weightToFont["400"];

  // Italic support
  const italic = fontStyle?.toString().toLowerCase() === "italic";
  const finalFontFamily = italic ? `${baseFont}Italic` : baseFont;

  return (
    <Text {...rest} style={[{ fontFamily: finalFontFamily }, other]}>
      {children}
    </Text>
  );
}
