// ============================================================
// BABY SCAN APP - RESULT CARD COMPONENT
// ============================================================
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from "react-native";
import { COLORS, SIZES, SHADOW, LANGUAGES } from "../theme";

const SECTION_COLORS = {
  "🔍": { bg: COLORS.infoLight, border: COLORS.info, icon: "#2563EB" },
  "👶": { bg: "#FFF0F3", border: COLORS.primary, icon: COLORS.primary },
  "💙": { bg: "#E0F2FE", border: "#0284C7", icon: "#0284C7" },
  "✅": { bg: COLORS.successLight, border: COLORS.success, icon: COLORS.success },
  "⚠️": { bg: COLORS.warningLight, border: COLORS.warning, icon: COLORS.warning },
};

// Parse the formatted explanation into sections
const parseSections = (text) => {
  if (!text) return [];
  const lines = text.split("\n").filter((l) => l.trim());
  const sections = [];
  let current = null;

  for (const line of lines) {
    // Detect section header (contains emoji + ** bold **)
    const headerMatch = line.match(/^([🔍👶💙✅⚠️])\s*\*?\*?(.+?)\*?\*?:?\s*$/);
    if (headerMatch) {
      if (current) sections.push(current);
      const emoji = headerMatch[1];
      const title = headerMatch[2].replace(/\*\*/g, "").trim();
      current = { emoji, title, content: [], colorConfig: SECTION_COLORS[emoji] };
    } else if (current) {
      const cleaned = line.replace(/\*\*/g, "").replace(/\*/g, "").trim();
      if (cleaned) current.content.push(cleaned);
    }
  }
  if (current) sections.push(current);

  // Fallback: if no sections parsed, show raw text
  if (sections.length === 0 && text.trim()) {
    return [{ emoji: "📋", title: "Analysis Result", content: [text], colorConfig: SECTION_COLORS["✅"] }];
  }

  return sections;
};

const ResultCard = ({ explanation, language, analyzedAt, onShare }) => {
  const [expanded, setExpanded] = useState(true);
  const sections = parseSections(explanation);

  const langInfo = LANGUAGES.find((l) => l.key === language) || LANGUAGES[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `BabyScan AI Analysis\n\n${explanation}\n\n— Analyzed by BabyScan AI`,
        title: "My Baby Scan Analysis",
      });
    } catch (e) {
      Alert.alert("Share failed", e.message);
    }
  };

  const formattedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.aiChip}>
            <Text style={styles.aiChipText}>✨ AI Analysis</Text>
          </View>
          <View style={[styles.langChip, { backgroundColor: langInfo.color + "20", borderColor: langInfo.color }]}>
            <Text style={styles.langChipFlag}>{langInfo.flag}</Text>
            <Text style={[styles.langChipText, { color: langInfo.color }]}>{langInfo.label}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>↑ Share</Text>
        </TouchableOpacity>
      </View>

      {formattedDate && (
        <Text style={styles.timestamp}>🕐 {formattedDate}</Text>
      )}

      {/* Sections */}
      <View style={styles.sections}>
        {sections.map((section, idx) => {
          const colors = section.colorConfig || { bg: COLORS.surfaceAlt, border: COLORS.border, icon: COLORS.textSecondary };
          return (
            <View
              key={idx}
              style={[styles.section, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={[styles.sectionTitle, { color: colors.icon }]}>{section.title}</Text>
              </View>
              {section.content.map((line, lidx) => (
                <Text key={lidx} style={styles.sectionText}>
                  {line}
                </Text>
              ))}
            </View>
          );
        })}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          🏥 This analysis is for informational purposes only. Always consult your doctor or gynecologist for medical advice.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    ...SHADOW.md,
    marginVertical: SIZES.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  headerLeft: {
    flexDirection: "row",
    gap: SIZES.xs + 2,
    flexWrap: "wrap",
  },
  aiChip: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  aiChipText: {
    fontSize: SIZES.textXs,
    fontWeight: "700",
    color: COLORS.primary,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
  },
  langChipFlag: { fontSize: 12 },
  langChipText: { fontSize: SIZES.textXs, fontWeight: "700" },
  shareBtn: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: SIZES.sm + 2,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
  },
  shareBtnText: {
    fontSize: SIZES.textSm,
    fontWeight: "700",
    color: COLORS.primary,
  },
  timestamp: {
    fontSize: SIZES.textXs,
    color: COLORS.textMuted,
    marginBottom: SIZES.md,
  },
  sections: {
    gap: SIZES.sm,
  },
  section: {
    borderRadius: SIZES.radiusMd,
    padding: SIZES.sm + 4,
    borderLeftWidth: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: {
    fontSize: SIZES.textBase,
    fontWeight: "700",
  },
  sectionText: {
    fontSize: SIZES.textBase,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginTop: 2,
  },
  disclaimer: {
    marginTop: SIZES.md,
    backgroundColor: COLORS.warningLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.sm + 2,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  disclaimerText: {
    fontSize: SIZES.textXs + 1,
    color: "#92400E",
    lineHeight: 18,
    textAlign: "center",
  },
});

export default ResultCard;
