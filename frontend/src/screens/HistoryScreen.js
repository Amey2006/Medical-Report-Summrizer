// ============================================================
// BABY SCAN APP - HISTORY SCREEN
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SIZES, SHADOW, LANGUAGES } from "../theme";
import { fetchHistory, deleteScan } from "../services/api";
import { getUserId, getLocalHistory } from "../utils/storage";

const HistoryItem = ({ item, onPress, onDelete }) => {
  const langInfo = LANGUAGES.find((l) => l.key === item.language) || LANGUAGES[0];

  const preview = item.explanation
    ? item.explanation.replace(/\*\*/g, "").replace(/[🔍👶💙✅⚠️]/g, "").slice(0, 100) + "..."
    : "No explanation available";

  const dateStr = item.analyzedAt || item.createdAt || item.savedAt;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown date";

  return (
    <TouchableOpacity style={styles.historyCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.historyCardInner}>
        {/* Image thumbnail */}
        {item.imageUrl || item.imageUri ? (
          <Image
            source={{ uri: item.imageUrl || item.imageUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailIcon}>🏥</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.historyContent}>
          <View style={styles.historyHeader}>
            <View style={[styles.langBadge, { backgroundColor: langInfo.color + "20" }]}>
              <Text style={styles.langBadgeFlag}>{langInfo.flag}</Text>
              <Text style={[styles.langBadgeText, { color: langInfo.color }]}>
                {langInfo.label}
              </Text>
            </View>
            <Text style={styles.historyDate}>{formattedDate}</Text>
          </View>
          <Text style={styles.historyPreview} numberOfLines={2}>
            {preview}
          </Text>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("anonymous");
  const [source, setSource] = useState("remote"); // 'remote' | 'local'

  useEffect(() => {
    getUserId().then((id) => {
      setUserId(id);
      loadHistory(id);
    });
  }, []);

  const loadHistory = async (uid = userId) => {
    setLoading(true);
    try {
      const scans = await fetchHistory(uid);
      setHistory(scans);
      setSource("remote");
    } catch {
      // Fallback to local storage
      try {
        const local = await getLocalHistory();
        setHistory(local);
        setSource("local");
      } catch {
        setHistory([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [userId]);

  const handleItemPress = (item) => {
    navigation.navigate("Result", { scan: item });
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Scan", "Remove this scan from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (item.id && source === "remote") {
              await deleteScan(item.id);
            }
            setHistory((prev) => prev.filter((s) => s.id !== item.id));
          } catch {
            setHistory((prev) => prev.filter((s) => s.id !== item.id));
          }
        },
      },
    ]);
  };

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
          <Text style={styles.headerTitle}>Scan History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{history.length}</Text>
          </View>
        </View>
        {source === "local" && (
          <View style={styles.localBanner}>
            <Text style={styles.localBannerText}>⚠️ Showing locally saved scans (server unavailable)</Text>
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>
            Analyze your first baby scan, X-ray, or hospital document to see it here
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.emptyBtnText}>➕ Analyze a Scan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={({ item }) => (
            <HistoryItem item={item} onPress={handleItemPress} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListFooterComponent={<View style={{ height: SIZES.xl }} />}
        />
      )}
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
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    minWidth: 30,
    alignItems: "center",
  },
  countText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: SIZES.textSm,
  },
  localBanner: {
    marginTop: SIZES.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: SIZES.radiusSm,
    padding: SIZES.xs + 2,
  },
  localBannerText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: SIZES.textXs,
    textAlign: "center",
  },
  list: {
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    ...SHADOW.sm,
    overflow: "hidden",
  },
  historyCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surfaceAlt,
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailIcon: { fontSize: 28 },
  historyContent: {
    flex: 1,
    marginLeft: SIZES.sm,
    marginRight: SIZES.xs,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  langBadgeFlag: { fontSize: 11 },
  langBadgeText: {
    fontSize: SIZES.textXs,
    fontWeight: "700",
  },
  historyDate: {
    fontSize: SIZES.textXs,
    color: COLORS.textMuted,
  },
  historyPreview: {
    fontSize: SIZES.textSm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.errorLight,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: COLORS.error,
    fontWeight: "700",
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textBase,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.xl,
  },
  emptyIcon: { fontSize: 56, marginBottom: SIZES.md },
  emptyTitle: {
    fontSize: SIZES.textXl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  emptySubtitle: {
    fontSize: SIZES.textBase,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SIZES.lg,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusFull,
  },
  emptyBtnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: SIZES.textBase,
  },
});
