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

import { normalizeAuthError, registerWithEmail } from "../services/auth";
import { COLORS, SHADOW, SIZES } from "../theme";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing details", "Complete all fields to create your account.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Use at least 6 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await registerWithEmail({ name, email, password });
    } catch (error) {
      Alert.alert("Registration failed", normalizeAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[COLORS.gradientEnd, COLORS.gradientMid]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <Text style={styles.headerSubtitle}>Set up your BabyScan space in a minute.</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Parent or caregiver name"
              placeholderTextColor={COLORS.textMuted}
            />

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
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter your password"
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkButton}>
              <Text style={styles.linkText}>Already have an account? Log in</Text>
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
