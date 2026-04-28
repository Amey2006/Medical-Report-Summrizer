// ============================================================
// BABY SCAN APP - RESULT DETAIL SCREEN
// ============================================================
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SIZES, SHADOW } from "../theme";
import ResultCard from "../components/ResultCard";

export default function ResultScreen({ route, navigation }) {
  const { scan } = route.params || {};

  if (!scan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No scan data found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Result</Text>
          <View style={{ width: 60 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan Image */}
        {(scan.imageUrl || scan.imageUri) && (
          <View style={styles.imageCard}>
            <Text style={styles.imageLabel}>📷 Medical Image or Document</Text>
            <Image
              source={{ uri: scan.imageUrl || scan.imageUri }}
              style={styles.scanImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Result */}
        <ResultCard
          explanation={scan.explanation}
          language={scan.language}
          analyzedAt={scan.analyzedAt || scan.createdAt || scan.savedAt}
        />

        <View style={{ height: SIZES.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    paddingVertical: SIZES.xs,
    paddingRight: SIZES.sm,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: SIZES.textBase,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: SIZES.textXl,
    fontWeight: "800",
    color: COLORS.white,
  },
  content: {
    padding: SIZES.md,
  },
  imageCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOW.sm,
  },
  imageLabel: {
    fontSize: SIZES.textSm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scanImage: {
    width: "100%",
    height: 220,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.textLg,
    color: COLORS.textSecondary,
  },
  backLink: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: SIZES.textBase,
  },
});
