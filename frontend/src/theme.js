// ============================================================
// BABY SCAN APP - DESIGN TOKENS & THEME
// ============================================================

export const COLORS = {
  // Primary palette — warm mauve/rose (maternal, caring)
  primary: "#C2185B",
  primaryLight: "#E91E8C",
  primaryPale: "#FCE4EC",

  // Accent — soft teal (medical, calm)
  accent: "#00897B",
  accentLight: "#B2DFDB",

  // Neutrals
  white: "#FFFFFF",
  background: "#FFF5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF0F3",
  border: "#F0D6DE",

  // Text
  textPrimary: "#1A1A2E",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnPrimary: "#FFFFFF",

  // Status
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  info: "#2563EB",
  infoLight: "#DBEAFE",

  // Gradient stops
  gradientStart: "#E91E63",
  gradientMid: "#C2185B",
  gradientEnd: "#880E4F",

  // Language pills
  english: "#6366F1",
  hindi: "#F59E0B",
  marathi: "#10B981",
};

export const FONTS = {
  // Using system fonts for Expo compatibility
  heading: "System",
  body: "System",
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Border radius
  radiusSm: 8,
  radiusMd: 16,
  radiusLg: 24,
  radiusXl: 32,
  radiusFull: 999,

  // Typography
  textXs: 11,
  textSm: 13,
  textBase: 15,
  textMd: 17,
  textLg: 20,
  textXl: 24,
  textXxl: 28,
  textDisplay: 34,
};

export const SHADOW = {
  sm: {
    shadowColor: "#C2185B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#C2185B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#C2185B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const LANGUAGES = [
  {
    key: "english",
    label: "English",
    nativeLabel: "English",
    flag: "🇬🇧",
    color: COLORS.english,
  },
  {
    key: "hindi",
    label: "Hindi",
    nativeLabel: "हिंदी",
    flag: "🇮🇳",
    color: COLORS.hindi,
  },
  {
    key: "marathi",
    label: "Marathi",
    nativeLabel: "मराठी",
    flag: "🏳️",
    color: COLORS.marathi,
  },
];
