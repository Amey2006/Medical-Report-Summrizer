import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

import { COLORS, SHADOW, SIZES } from "../theme";
import {
  googleAuthConfig,
  isGoogleAuthConfigured,
  missingFirebaseEnvKeys,
  missingGoogleEnvKeys,
} from "../services/firebase";
import { loginWithGoogleIdToken, normalizeAuthError } from "../services/auth";

WebBrowser.maybeCompleteAuthSession();

function getGoogleRequestConfig() {
  const config = {
    scopes: ["profile", "email"],
    selectAccount: true,
  };

  if (googleAuthConfig.expoClientId) {
    config.expoClientId = googleAuthConfig.expoClientId;
    config.clientId = googleAuthConfig.expoClientId;
  }

  if (googleAuthConfig.androidClientId) {
    config.androidClientId = googleAuthConfig.androidClientId;
  }

  if (googleAuthConfig.iosClientId) {
    config.iosClientId = googleAuthConfig.iosClientId;
  }

  if (googleAuthConfig.webClientId) {
    config.webClientId = googleAuthConfig.webClientId;
  }

  return config;
}

function ConfiguredGoogleButton() {
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleRequestConfig = useMemo(getGoogleRequestConfig, []);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleRequestConfig);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type !== "success") {
      setGoogleBusy(false);
      return;
    }

    const idToken = response.params?.id_token;

    if (!idToken) {
      setGoogleBusy(false);
      Alert.alert(
        "Google sign-in failed",
        "Google did not return an ID token. Check the configured client IDs and try again."
      );
      return;
    }

    let active = true;

    (async () => {
      try {
        await loginWithGoogleIdToken(idToken);
      } catch (error) {
        Alert.alert("Google sign-in failed", normalizeAuthError(error));
      } finally {
        if (active) {
          setGoogleBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [response]);

  const handleGooglePress = async () => {
    try {
      setGoogleBusy(true);
      const result = await promptAsync();

      if (result.type !== "success") {
        setGoogleBusy(false);
      }
    } catch (error) {
      setGoogleBusy(false);
      Alert.alert("Google sign-in failed", normalizeAuthError(error));
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, (!request || googleBusy) && styles.buttonDisabled]}
      activeOpacity={0.88}
      onPress={handleGooglePress}
      disabled={!request || googleBusy}
    >
      {googleBusy ? (
        <ActivityIndicator color={COLORS.textPrimary} size="small" />
      ) : (
        <Text style={styles.googleGlyph}>G</Text>
      )}
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

function SetupGoogleButton() {
  const handlePress = () => {
    const missingKeys = [...new Set([...missingFirebaseEnvKeys, ...missingGoogleEnvKeys])];
    Alert.alert(
      "Google sign-in needs setup",
      `Add these values in frontend/.env:\n\n${missingKeys.join("\n")}`
    );
  };

  return (
    <TouchableOpacity style={styles.googleButton} activeOpacity={0.88} onPress={handlePress}>
      <Text style={styles.googleGlyph}>G</Text>
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

export default function WelcomeScreen({ navigation }) {

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[COLORS.gradientEnd, COLORS.gradientMid, COLORS.gradientStart]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.orbLarge} />
        <View style={styles.orbSmall} />

        <View style={styles.heroContent}>
          <Text style={styles.badge}>Trusted Scan Support</Text>
          <Text style={styles.title}>BabyScan AI</Text>
          <Text style={styles.subtitle}>
            Understand baby scans, X-rays, and hospital reports with a calmer first step.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.panel}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardText}>
            Sign in to keep your scan history together and continue from any session.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {isGoogleAuthConfigured ? <ConfiguredGoogleButton /> : <SetupGoogleButton />}
        </View>

        <Text style={styles.footerText}>
          Your existing scan analysis flow stays the same after sign-in.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    flex: 1.05,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    justifyContent: "center",
    overflow: "hidden",
  },
  heroContent: {
    zIndex: 2,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    color: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: SIZES.radiusFull,
    fontSize: SIZES.textSm,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.textDisplay + 4,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -1,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: SIZES.textMd,
    lineHeight: 25,
    maxWidth: 320,
  },
  orbLarge: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  orbSmall: {
    position: "absolute",
    bottom: 10,
    left: -35,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  panel: {
    flex: 1,
    marginTop: -SIZES.xl,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    ...SHADOW.lg,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textXl,
    fontWeight: "800",
    marginBottom: SIZES.xs,
  },
  cardText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textBase,
    lineHeight: 22,
    marginBottom: SIZES.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusFull,
    paddingVertical: SIZES.md,
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.textMd,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SIZES.md,
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMd,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
    marginVertical: SIZES.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.textSm,
    fontWeight: "600",
  },
  googleButton: {
    minHeight: 56,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
  },
  googleGlyph: {
    fontSize: SIZES.textLg,
    fontWeight: "900",
    color: COLORS.info,
  },
  googleButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMd,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  footerText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: SIZES.textSm,
    marginTop: SIZES.md,
    lineHeight: 20,
    paddingHorizontal: SIZES.md,
  },
});
