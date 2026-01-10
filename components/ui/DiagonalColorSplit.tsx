import React from "react";
import { DimensionValue, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Polygon } from "react-native-svg";

interface DiagonalColorSplitProps {
  colors?: string[];
  angle?: number;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export default function DiagonalColorSplit({
  colors = ["#ff0000", "#00ff00"],
  width = "100%",
  height = 20,
  style,
  children,
}: DiagonalColorSplitProps) {
  if (!colors || colors.length === 0) return null;

  const colorCount = colors.length;

  // Single color optimization
  if (colorCount === 1) {
    return (
      <View style={[styles.container, { width, height, backgroundColor: colors[0] }, style]}>
        {children && <View style={styles.overlay}>{children}</View>}
      </View>
    );
  }

  // The simplified offset percentage for the slant
  const SLANT_OFFSET = 12;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {colors.map((color, index) => {
          const sectionWidth = 100 / colorCount;
          const leftX = index * sectionWidth;
          const rightX = (index + 1) * sectionWidth;

          let points = "";

          if (index === 0) {
            // First section (left side)
            // Right side is slanted inward at bottom (rightX - offset) and outward at top (rightX + offset)
            // TopRight: rightX + offset, BottomRight: rightX - offset
            points = `0,0 ${rightX + SLANT_OFFSET},0 ${rightX - SLANT_OFFSET},100 0,100`;
          } else if (index === colorCount - 1) {
            // Last section (right side)
            // Left side must match the previous section's right side
            // TopLeft: leftX + offset, BottomLeft: leftX - offset
            points = `${leftX + SLANT_OFFSET},0 100,0 100,100 ${leftX - SLANT_OFFSET},100`;
          } else {
            // Middle sections
            points = `${leftX + SLANT_OFFSET},0 ${rightX + SLANT_OFFSET},0 ${rightX - SLANT_OFFSET},100 ${leftX - SLANT_OFFSET},100`;
          }

          return <Polygon key={index} points={points} fill={color} />;
        })}
      </Svg>
      {children && <View style={styles.overlay}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  }
});