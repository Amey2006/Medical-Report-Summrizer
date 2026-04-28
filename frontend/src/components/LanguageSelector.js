// ============================================================
// BABY SCAN APP - LANGUAGE SELECTOR COMPONENT
// ============================================================
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SIZES, SHADOW, LANGUAGES } from "../theme";

const LanguageSelector = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>🌐 Select Language</Text>
      <View style={styles.pillRow}>
        {LANGUAGES.map((lang) => {
          const isActive = selected === lang.key;
          return (
            <TouchableOpacity
              key={lang.key}
              style={[
                styles.pill,
                isActive && {
                  backgroundColor: lang.color,
                  ...SHADOW.sm,
                  borderColor: lang.color,
                },
                !isActive && { borderColor: COLORS.border },
              ]}
              onPress={() => onSelect(lang.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.pillFlag}>{lang.flag}</Text>
              <View>
                <Text
                  style={[
                    styles.pillLabel,
                    { color: isActive ? COLORS.white : COLORS.textSecondary },
                  ]}
                >
                  {lang.label}
                </Text>
                <Text
                  style={[
                    styles.pillNative,
                    { color: isActive ? "rgba(255,255,255,0.8)" : COLORS.textMuted },
                  ]}
                >
                  {lang.nativeLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.textSm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pillRow: {
    flexDirection: "row",
    gap: SIZES.sm,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.sm + 2,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  pillFlag: {
    fontSize: 16,
  },
  pillLabel: {
    fontSize: SIZES.textSm,
    fontWeight: "700",
    textAlign: "center",
  },
  pillNative: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 1,
  },
});

export default LanguageSelector;
