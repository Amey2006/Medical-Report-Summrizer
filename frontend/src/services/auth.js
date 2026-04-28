// ============================================================
// BABY SCAN APP - AUTH SERVICE
// ============================================================

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "./firebase";
import { clearAuthProfile, saveAuthProfile } from "../utils/storage";

const FIREBASE_SETUP_MESSAGE =
  "Firebase auth is not configured yet. Add the EXPO_PUBLIC_FIREBASE_* values in frontend/.env.";

const GOOGLE_SETUP_MESSAGE =
  "Google sign-in still needs the EXPO_PUBLIC_GOOGLE_* client IDs in frontend/.env.";

const FIREBASE_AUTH_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
const FIREBASE_AUTH_BASE_URL = "https://identitytoolkit.googleapis.com/v1";
const sessionListeners = new Set();

function emitSession(profile) {
  sessionListeners.forEach((listener) => {
    try {
      listener(profile);
    } catch {}
  });
}

export function subscribeToSession(callback) {
  sessionListeners.add(callback);
  return () => {
    sessionListeners.delete(callback);
  };
}

function ensureAuth() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  return auth;
}

function createAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function mapRestErrorCode(restCode) {
  const normalizedCode = String(restCode || "").split(" : ")[0].trim();

  switch (normalizedCode) {
    case "EMAIL_EXISTS":
      return createAuthError(
        "That email is already registered. Try logging in instead.",
        "auth/email-already-in-use"
      );
    case "INVALID_EMAIL":
      return createAuthError("Enter a valid email address.", "auth/invalid-email");
    case "WEAK_PASSWORD":
      return createAuthError(
        "Use a stronger password with at least 6 characters.",
        "auth/weak-password"
      );
    case "EMAIL_NOT_FOUND":
      return createAuthError("Incorrect email or password.", "auth/user-not-found");
    case "INVALID_PASSWORD":
    case "INVALID_LOGIN_CREDENTIALS":
      return createAuthError("Incorrect email or password.", "auth/invalid-credential");
    case "USER_DISABLED":
      return createAuthError("This account has been disabled.", "auth/user-disabled");
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return createAuthError(
        "Too many attempts right now. Please wait a moment and try again.",
        "auth/too-many-requests"
      );
    case "OPERATION_NOT_ALLOWED":
      return createAuthError(
        "Email/password sign-in is not enabled for this Firebase project.",
        "auth/operation-not-allowed"
      );
    default:
      return createAuthError(restCode || "Authentication failed.", "auth/internal-error");
  }
}

async function callFirebaseAuthRest(endpoint, payload) {
  if (!FIREBASE_AUTH_API_KEY) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  let response;

  try {
    response = await fetch(
      `${FIREBASE_AUTH_BASE_URL}/${endpoint}?key=${encodeURIComponent(FIREBASE_AUTH_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  } catch {
    throw createAuthError(
      "Network error. Check your internet connection and try again.",
      "auth/network-request-failed"
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw mapRestErrorCode(data?.error?.message);
  }

  return data;
}

function toSessionProfile(user) {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    providerId: user.providerData?.[0]?.providerId || "password",
  };
}

export async function syncUserSession(user) {
  const profile = toSessionProfile(user);

  if (profile) {
    await saveAuthProfile(profile);
  } else {
    await clearAuthProfile();
  }

  emitSession(profile);
  return profile;
}

export async function loginWithEmail(email, password) {
  const normalizedEmail = email.trim();

  if (auth) {
    const authInstance = ensureAuth();
    const result = await signInWithEmailAndPassword(authInstance, normalizedEmail, password);
    return syncUserSession(result.user);
  }

  const result = await callFirebaseAuthRest("accounts:signInWithPassword", {
    email: normalizedEmail,
    password,
    returnSecureToken: true,
  });

  const profile = {
    uid: result.localId,
    email: result.email || normalizedEmail,
    displayName: result.displayName || "",
    photoURL: "",
    providerId: "password",
  };

  await saveAuthProfile(profile);
  emitSession(profile);
  return profile;
}

export async function registerWithEmail({ name, email, password }) {
  const normalizedEmail = email.trim();
  const trimmedName = name.trim();

  if (auth) {
    const authInstance = ensureAuth();
    const result = await createUserWithEmailAndPassword(authInstance, normalizedEmail, password);

    if (trimmedName) {
      await updateProfile(result.user, { displayName: trimmedName });
    }

    return syncUserSession(authInstance.currentUser || result.user);
  }

  const signUpResult = await callFirebaseAuthRest("accounts:signUp", {
    email: normalizedEmail,
    password,
    returnSecureToken: true,
  });

  let displayName = "";

  if (trimmedName) {
    const updateResult = await callFirebaseAuthRest("accounts:update", {
      idToken: signUpResult.idToken,
      displayName: trimmedName,
      returnSecureToken: true,
    });
    displayName = updateResult.displayName || trimmedName;
  }

  const profile = {
    uid: signUpResult.localId,
    email: signUpResult.email || normalizedEmail,
    displayName,
    photoURL: "",
    providerId: "password",
  };

  await saveAuthProfile(profile);
  emitSession(profile);
  return profile;
}

export async function loginWithGoogleIdToken(idToken) {
  if (!idToken) {
    throw new Error(GOOGLE_SETUP_MESSAGE);
  }

  const authInstance = ensureAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(authInstance, credential);
  return syncUserSession(result.user);
}

export async function logout() {
  if (auth) {
    await signOut(auth);
  }

  await clearAuthProfile();
  emitSession(null);
}

export function normalizeAuthError(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password to continue.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts right now. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
}

export { FIREBASE_SETUP_MESSAGE, GOOGLE_SETUP_MESSAGE };
