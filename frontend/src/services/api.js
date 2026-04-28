// ============================================================
// BABY SCAN APP - API SERVICE
// ============================================================
import axios from "axios";
import Constants from "expo-constants";

// ⚠️ Replace with your backend server IP/URL
// For local dev: use your computer's LAN IP, e.g., http://192.168.1.5:3000
// For production: your deployed server URL
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:5000";

const BASE_URL = rawBaseUrl
  .trim()
  .replace(/\s+/g, "")
  .replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for AI analysis
});

function toReadableApiError(error) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error;
    const retryAfterSeconds = error.response?.data?.retryAfterSeconds;

    if (apiMessage) {
      const retrySuffix =
        typeof retryAfterSeconds === "number" && retryAfterSeconds > 0
          ? ` Retry after about ${Math.ceil(retryAfterSeconds)} seconds.`
          : "";

      return new Error(`${apiMessage}${retrySuffix}`);
    }
  }

  return error instanceof Error ? error : new Error("Request failed");
}

/**
 * Analyze a medical image or hospital document photo.
 * @param {string} imageUri - Local URI of the image (from image picker)
 * @param {string} language - 'english' | 'hindi' | 'marathi'
 * @param {string} userId - User identifier
 * @returns {Promise<{explanation, scanId, imageUrl, analyzedAt}>}
 */
export const analyzeImage = async (imageUri, language = "english", userId = "anonymous") => {
  try {
    const formData = new FormData();

    // Determine filename and mime type
    const uriParts = imageUri.split(".");
    const extension = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";
    const mimeTypeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const mimeType = mimeTypeMap[extension] || "image/jpeg";

    formData.append("image", {
      uri: imageUri,
      type: mimeType,
      name: `scan_${Date.now()}.${extension}`,
    });
    formData.append("language", language);
    formData.append("userId", userId);

    const response = await api.post("/api/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || "Analysis failed");
    }

    return response.data;
  } catch (error) {
    throw toReadableApiError(error);
  }
};

/**
 * Fetch scan history for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const fetchHistory = async (userId) => {
  try {
    const response = await api.get(`/api/history/${userId}`);
    if (!response.data.success) throw new Error(response.data.error);
    return response.data.scans;
  } catch (error) {
    throw toReadableApiError(error);
  }
};

/**
 * Delete a scan record.
 * @param {string} scanId
 */
export const deleteScan = async (scanId) => {
  try {
    const response = await api.delete(`/api/scan/${scanId}`);
    if (!response.data.success) throw new Error(response.data.error);
    return response.data;
  } catch (error) {
    throw toReadableApiError(error);
  }
};

/**
 * Check server health.
 */
export const checkHealth = async () => {
  try {
    const response = await api.get("/health", { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw toReadableApiError(error);
  }
};
