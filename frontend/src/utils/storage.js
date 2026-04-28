// ============================================================
// BABY SCAN APP - LOCAL STORAGE UTILITY
// ============================================================
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

const KEYS = {
  USER_ID: "@babyscan_user_id",
  LANGUAGE: "@babyscan_language",
  LOCAL_HISTORY: "@babyscan_local_history",
  AUTH_PROFILE: "@babyscan_auth_profile",
};

// Get or create a persistent anonymous user ID
export const getUserId = async () => {
  try {
    const authProfile = await getAuthProfile();
    if (authProfile?.uid) {
      return authProfile.uid;
    }

    let id = await AsyncStorage.getItem(KEYS.USER_ID);
    if (!id) {
      id = uuid.v4();
      await AsyncStorage.setItem(KEYS.USER_ID, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
};

export const saveAuthProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_PROFILE, JSON.stringify(profile));
  } catch {}
};

export const getAuthProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AUTH_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearAuthProfile = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.AUTH_PROFILE);
  } catch {}
};

// Persist preferred language
export const saveLanguage = async (lang) => {
  try {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  } catch {}
};

export const getSavedLanguage = async () => {
  try {
    return (await AsyncStorage.getItem(KEYS.LANGUAGE)) || "english";
  } catch {
    return "english";
  }
};

// Save scan to local history (fallback when Firebase is unavailable)
export const saveLocalScan = async (scan) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LOCAL_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({ ...scan, id: uuid.v4(), savedAt: new Date().toISOString() });
    // Keep last 50 scans locally
    await AsyncStorage.setItem(KEYS.LOCAL_HISTORY, JSON.stringify(history.slice(0, 50)));
  } catch {}
};

export const getLocalHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LOCAL_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearLocalHistory = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.LOCAL_HISTORY);
  } catch {}
};
