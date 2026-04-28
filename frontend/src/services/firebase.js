// ============================================================
// BABY SCAN APP - FIREBASE CLIENT CONFIG
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const REQUIRED_FIREBASE_KEYS = Object.entries({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
}).filter(([, value]) => !value || String(value).startsWith("YOUR_"));

export const isFirebaseConfigured = REQUIRED_FIREBASE_KEYS.length === 0;

export const missingFirebaseEnvKeys = REQUIRED_FIREBASE_KEYS.map(([key]) => {
  const envKeyMap = {
    apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
    authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  };

  return envKeyMap[key];
});

export const googleAuthConfig = {
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "",
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
};

export const missingGoogleEnvKeys = Object.entries(googleAuthConfig)
  .filter(([, value]) => !value || String(value).startsWith("YOUR_"))
  .map(([key]) => {
    const envKeyMap = {
      expoClientId: "EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID",
      androidClientId: "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
      iosClientId: "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
      webClientId: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
    };

    return envKeyMap[key];
  });

export const isGoogleAuthConfigured = Boolean(
  googleAuthConfig.webClientId &&
    (googleAuthConfig.androidClientId ||
      googleAuthConfig.iosClientId ||
      googleAuthConfig.expoClientId)
);

export const app = isFirebaseConfigured
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

export const db = app ? getFirestore(app) : null;

export const auth = (() => {
  if (!app) {
    return null;
  }

  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // If auth was already initialized elsewhere, reuse the instance.
    const message = String(error?.message || "");
    if (/already exists|already initialized/i.test(message)) {
      return getAuth(app);
    }

    console.warn("Firebase auth initialization failed:", error);
    return null;
  }
})();

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export default app;
