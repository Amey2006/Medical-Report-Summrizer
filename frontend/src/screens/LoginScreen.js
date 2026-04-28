import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { loginWithEmail, normalizeAuthError } from "../services/auth";
import { COLORS, SHADOW, SIZES } from "../theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your email and password to continue.");
      return;
    }

    try {
      setLoading(true);
      await loginWithEmail(email, password);
    } catch (error) {
      Alert.alert("Login failed", normalizeAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[COLORS.gradientMid, COLORS.gradientStart]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log In</Text>
        <Text style={styles.headerSubtitle}>Pick up where you left off.</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkButton}>
              <Text style={styles.linkText}>Need an account? Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xl,
    borderBottomLeftRadius: SIZES.radiusXl,
    borderBottomRightRadius: SIZES.radiusXl,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: SIZES.xs,
    marginBottom: SIZES.lg,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: SIZES.textBase,
    fontWeight: "700",
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.textDisplay,
    fontWeight: "900",
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: SIZES.textMd,
  },
  scrollContent: {
    padding: SIZES.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    marginTop: -SIZES.xl,
    ...SHADOW.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textSm,
    fontWeight: "700",
    marginBottom: SIZES.xs + 2,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    color: COLORS.textPrimary,
    fontSize: SIZES.textBase,
    marginBottom: SIZES.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusFull,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SIZES.sm,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.textMd,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  linkButton: {
    marginTop: SIZES.md,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontSize: SIZES.textBase,
    fontWeight: "700",
  },
});
