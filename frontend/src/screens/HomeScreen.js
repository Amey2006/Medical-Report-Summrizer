// ============================================================
// BABY SCAN APP - HOME SCREEN
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import LanguageSelector from "../components/LanguageSelector";
import ResultCard from "../components/ResultCard";
import { analyzeImage } from "../services/api";
import { logout } from "../services/auth";
import { COLORS, SHADOW, SIZES } from "../theme";
import {
  getAuthProfile,
  getSavedLanguage,
  getUserId,
  saveLanguage,
  saveLocalScan,
} from "../utils/storage";

const LOADING_MESSAGES = {
  english: [
    "Scanning your image...",
    "AI is analyzing the scan...",
    "Looking for baby details...",
    "Preparing your explanation...",
  ],
  hindi: [
    "Scanning your image...",
    "AI is analyzing the scan...",
    "Looking for baby details...",
    "Preparing your explanation...",
  ],
  marathi: [
    "Scanning your image...",
    "AI is analyzing the scan...",
    "Looking for baby details...",
    "Preparing your explanation...",
  ],
};

export default function HomeScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [language, setLanguage] = useState("english");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [userId, setUserId] = useState("anonymous");
  const [authProfile, setAuthProfile] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const msgIndex = useRef(0);
  const msgTimer = useRef(null);

  useEffect(() => {
    getUserId().then(setUserId);
    getSavedLanguage().then(setLanguage);
    getAuthProfile().then(setAuthProfile);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  const pickImage = async (fromCamera = false) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          fromCamera
            ? "Camera permission is needed to take photos."
            : "Photo library permission is needed to select images."
        );
        return;
      }

      const pickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
        aspect: [4, 3],
      };

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        setSelectedImage(pickerResult.assets[0].uri);
        setResult(null);
      }
    } catch (error) {
      Alert.alert("Error", `Could not open image picker. ${error.message}`);
    }
  };

  const showImageOptions = () => {
    Alert.alert("Select Medical Image", "Choose how to add your X-ray, scan, or document photo:", [
      { text: "Take Photo", onPress: () => pickImage(true) },
      { text: "Choose from Gallery", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const startLoadingMessages = () => {
    const messages = LOADING_MESSAGES[language] || LOADING_MESSAGES.english;
    msgIndex.current = 0;
    setLoadingMsg(messages[0]);

    msgTimer.current = setInterval(() => {
      msgIndex.current = (msgIndex.current + 1) % messages.length;
      setLoadingMsg(messages[msgIndex.current]);
    }, 2500);
  };

  const stopLoadingMessages = () => {
    if (msgTimer.current) {
      clearInterval(msgTimer.current);
      msgTimer.current = null;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select a medical image or document photo first.");
      return;
    }

    setLoading(true);
    setResult(null);
    startLoadingMessages();

    try {
      const data = await analyzeImage(selectedImage, language, userId);
      setResult(data);

      await saveLocalScan({
        explanation: data.explanation,
        language,
        imageUri: selectedImage,
        analyzedAt: data.analyzedAt,
      });
    } catch (error) {
      let message = "Analysis failed. Please check your connection and try again.";

      if (error.message?.includes("Network")) {
        message =
          "Cannot connect to server. Make sure the backend is running and the API URL in frontend/.env is correct.";
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert("Analysis Failed", message);
    } finally {
      setLoading(false);
      stopLoadingMessages();
    }
  };

  const handleClear = () => {
    Alert.alert("Clear Scan", "Remove the current image and result?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setSelectedImage(null);
          setResult(null);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Do you want to sign out of BabyScan AI?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Logout failed", error.message || "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>BabyScan AI</Text>
              <Text style={styles.headerSubtitle}>
                {authProfile?.displayName || authProfile?.email
                  ? `Signed in as ${authProfile.displayName || authProfile.email}`
                  : "Baby scans, X-rays, and reports explained simply"}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate("History")}>
                <Text style={styles.historyBtnText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.card}>
            <LanguageSelector selected={language} onSelect={handleLanguageSelect} />
          </View>
        </Animated.View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Medical Image or Document</Text>

          {selectedImage ? (
            <View>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.changeBtn} onPress={showImageOptions}>
                  <Text style={styles.changeBtnText}>Change Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Text style={styles.clearBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.uploadZone} onPress={showImageOptions} activeOpacity={0.8}>
                <LinearGradient colors={[COLORS.primaryPale, "#FFE4EE"]} style={styles.uploadGradient}>
                  <Text style={styles.uploadIcon}>Upload</Text>
                  <Text style={styles.uploadTitle}>Tap to Upload Image</Text>
                  <Text style={styles.uploadSubtitle}>
                    X-rays, scans, or report photos{"\n"}Camera or Gallery
                  </Text>
                  <View style={styles.uploadArrow}>
                    <Text style={styles.uploadArrowText}>Select Image</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {selectedImage && !result && (
          <TouchableOpacity
            style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={loading ? ["#D1D5DB", "#9CA3AF"] : [COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyzeBtnGradient}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={styles.analyzeBtnText}>{loadingMsg || "Analyzing..."}</Text>
                </View>
              ) : (
                <Text style={styles.analyzeBtnText}>Analyze Image</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.progressBar}>
            <Animated.View style={styles.progressFill} />
          </View>
        )}

        {result && (
          <View>
            <ResultCard
              explanation={result.explanation}
              language={language}
              analyzedAt={result.analyzedAt}
            />
            <TouchableOpacity style={styles.reAnalyzeBtn} onPress={handleAnalyze} disabled={loading}>
              <Text style={styles.reAnalyzeBtnText}>Re-analyze in {language}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!selectedImage && (
          <View style={[styles.card, styles.tipsCard]}>
            <Text style={styles.tipsTitle}>Tips for best results</Text>
            {[
              "Use a clear, well-lit photo of the X-ray, scan, or hospital document",
              "Make sure the full image or page is visible in the frame",
              "Avoid blurry or rotated images",
              "Works best with baby-related scans, X-rays, and medical report photos",
            ].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Text style={styles.tipDot}>-</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: SIZES.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.lg + 8,
    paddingHorizontal: SIZES.md,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SIZES.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.textXxl,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: SIZES.textSm,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: SIZES.xs,
  },
  historyBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  historyBtnText: {
    color: COLORS.white,
    fontSize: SIZES.textSm,
    fontWeight: "700",
  },
  logoutBtn: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
  },
  logoutBtnText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: SIZES.textSm,
    fontWeight: "700",
  },
  decorCircle1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorCircle2: {
    position: "absolute",
    right: 60,
    bottom: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: SIZES.md, paddingTop: SIZES.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOW.sm,
  },
  cardLabel: {
    fontSize: SIZES.textSm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  uploadZone: {
    borderRadius: SIZES.radiusMd,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.primaryPale,
    borderStyle: "dashed",
  },
  uploadGradient: {
    alignItems: "center",
    paddingVertical: SIZES.xxl,
    paddingHorizontal: SIZES.lg,
  },
  uploadIcon: {
    fontSize: SIZES.textLg,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  uploadTitle: {
    fontSize: SIZES.textLg,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  uploadSubtitle: {
    fontSize: SIZES.textSm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SIZES.md,
  },
  uploadArrow: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
  },
  uploadArrowText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: SIZES.textBase,
  },
  previewImage: {
    width: "100%",
    height: 240,
    borderRadius: SIZES.radiusMd,
    backgroundColor: "#F3F4F6",
  },
  imageActions: {
    flexDirection: "row",
    gap: SIZES.sm,
    marginTop: SIZES.sm,
  },
  changeBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryPale,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
  },
  changeBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: SIZES.textSm },
  clearBtn: {
    backgroundColor: COLORS.errorLight,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
  },
  clearBtnText: { color: COLORS.error, fontWeight: "700", fontSize: SIZES.textSm },
  analyzeBtn: {
    borderRadius: SIZES.radiusLg,
    overflow: "hidden",
    marginBottom: SIZES.md,
    ...SHADOW.md,
  },
  analyzeBtnDisabled: { opacity: 0.8 },
  analyzeBtnGradient: {
    paddingVertical: SIZES.md + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeBtnText: {
    color: COLORS.white,
    fontSize: SIZES.textMd,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "60%",
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusFull,
  },
  reAnalyzeBtn: {
    backgroundColor: COLORS.primaryPale,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
  },
  reAnalyzeBtnText: { color: COLORS.primary, fontWeight: "700" },
  tipsCard: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  tipsTitle: {
    fontSize: SIZES.textBase,
    fontWeight: "700",
    color: COLORS.success,
    marginBottom: SIZES.sm,
  },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tipDot: { color: COLORS.success, fontWeight: "700", fontSize: SIZES.textBase },
  tipText: { flex: 1, fontSize: SIZES.textSm, color: COLORS.textSecondary, lineHeight: 20 },
});
