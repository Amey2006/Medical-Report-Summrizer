// ============================================================
// BABY SCAN APP - NODE.JS BACKEND SERVER
// ============================================================
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Multer: store image in memory (no disk write needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// ── Firebase Admin Initialization ─────────────────────────
let db, bucket;

function loadFirebaseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(
      __dirname,
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account file not found at ${serviceAccountPath}`);
    }

    return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }

  throw new Error(
    "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}
try {
  const serviceAccount = loadFirebaseServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(process.env.FIREBASE_STORAGE_BUCKET
      ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
      : {}),
  });

  db = admin.firestore();
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    bucket = admin.storage().bucket();
  } else {
    console.log(
      "Warning: Firebase Storage bucket not configured. Results can still be saved without image uploads."
    );
  }
  console.log("✅ Firebase initialized successfully");
} catch (err) {
  console.error("❌ Firebase initialization failed:", err.message);
  console.log("⚠️  Running without Firebase (results won't be saved)");
}

// ── Gemini AI Initialization ───────────────────────────────
const groqApiKey = process.env.GROQ_API_KEY;
const groqBaseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const groqPrimaryModel =
  process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const groqFallbackModel = process.env.GROQ_FALLBACK_MODEL || "";
const aiConfigured = Boolean(groqApiKey);

if (!aiConfigured) {
  console.log(
    "Warning: GROQ_API_KEY is missing. AI analysis is disabled until it is configured."
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const seconds = parseFloat(headerValue.replace(/s$/i, ""));
  return Number.isFinite(seconds) ? seconds : null;
}

function createApiError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

function extractGroqText(responseData) {
  const content = responseData?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

async function generateGroqResponse(prompt, imageBase64, mimeType) {
  const modelsToTry = [
    groqPrimaryModel,
    ...(groqFallbackModel && groqFallbackModel !== groqPrimaryModel
      ? [groqFallbackModel]
      : []),
  ];

  const imageUrl = `data:${mimeType};base64,${imageBase64}`;
  let lastError = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        if (attempt > 1) {
          console.log(`Retrying Groq with model=${modelName}, attempt=${attempt}`);
        } else {
          console.log(`Calling Groq with model=${modelName}`);
        }

        const response = await fetch(`${groqBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.4,
            max_completion_tokens: 1024,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                    },
                  },
                ],
              },
            ],
          }),
        });

        const rawBody = await response.text();
        let responseData = null;

        if (rawBody) {
          try {
            responseData = JSON.parse(rawBody);
          } catch {
            responseData = null;
          }
        }

        if (!response.ok) {
          const apiMessage =
            responseData?.error?.message ||
            responseData?.error ||
            rawBody ||
            `Groq request failed with status ${response.status}`;

          throw createApiError(apiMessage, {
            status: response.status,
            body: responseData,
            retryAfterSeconds: parseRetryAfterSeconds(
              response.headers.get("retry-after")
            ),
            code: responseData?.error?.code,
          });
        }

        const explanation = extractGroqText(responseData);
        if (!explanation) {
          throw createApiError("Groq response did not include analysis text.", {
            status: 502,
            body: responseData,
          });
        }

        return { explanation, modelName };
      } catch (err) {
        lastError = err;
        const retryableOverload = err?.status === 503;
        const unsupportedModel =
          err?.status === 404 &&
          /model|not found|not supported/i.test(err?.message || "");
        const canRetrySameModel = retryableOverload && attempt < 2;

        if (canRetrySameModel) {
          await sleep(1200);
          continue;
        }

        if (!retryableOverload && !unsupportedModel) {
          throw err;
        }

        if (unsupportedModel) {
          console.log(
            `Groq model ${modelName} is unavailable for this endpoint. Trying next option if available.`
          );
        } else {
          console.log(`Groq model ${modelName} is overloaded. Trying next option if available.`);
        }
        break;
      }
    }
  }

  throw lastError;
}

const INPUT_SCOPE_PROMPT = `You are analyzing one uploaded medical image or medical document.

Step 1: classify the upload as exactly one of these:
- fetal or prenatal ultrasound
- general X-ray
- hospital report or clinical document
- unclear, unrelated, or unsupported image

Do not assume the image is baby-related. Only mention baby, fetus, placenta, pregnancy, gestational age, or fetal development if the upload clearly shows a fetal ultrasound or a pregnancy-related document.

If the upload is a general X-ray:
- identify the likely body part and, if possible, the view
- focus on direct visual observations only
- specifically look for:
  - fracture line
  - cortical break or cortical discontinuity
  - crack in bone
  - displacement or translation of fracture fragments
  - angulation
  - step-off in bone alignment
  - dislocation or subluxation
  - joint alignment
  - soft-tissue swelling
  - degenerative change or other visible abnormality
- compare the visible structure with expected normal alignment in simple but medically accurate words
- if a finding is not certain, use phrases like "possible", "may represent", or "suspicious for"
- if no obvious fracture or dislocation is visible, say that clearly and mention that photo quality and single-view limitation can hide injury
- do not give treatment advice

If the upload is a fetal or prenatal ultrasound:
- describe only pregnancy-related structures that are reasonably visible
- only in this case may you mention baby or fetal observations
- do not invent measurements or findings that are not visible

If the upload is a hospital report or clinical document:
- extract the important visible text
- summarize findings, measurements, diagnoses, medicines, and follow-up advice
- mention unclear or unreadable text

If the upload is unclear, unrelated, or too blurry:
- say that clearly
- explain what clearer image would help

For every response:
- describe only what is reasonably visible
- do not pretend to see details that are not visible
- avoid definitive diagnosis language
- include a short educational note when useful, especially for medical students
- remind the user that important findings must be confirmed by a doctor or radiologist.`;

const ENGLISH_IMAGE_ANALYSIS_PROMPT = `Analyze the upload carefully and respond in English using exactly these section headers:

IMAGE TYPE:
[State whether this is a fetal ultrasound, a general X-ray with the likely body part, a medical document, or an unclear image.]

OBSERVATIONS:
[Describe only visible findings. For X-rays, be specific about fracture line, cortical break, crack, displacement, angulation, step-off, alignment, joint position, and soft-tissue swelling when visible. If there is no obvious acute fracture or dislocation, say that clearly.]

WHAT SEEMS ABNORMAL OR DIFFERENT FROM NORMAL:
[Explain how the visible structure differs from expected normal anatomy. If nothing clearly abnormal is seen, say that no obvious abnormality is visible in this image.]

MEDICAL MEANING:
[Briefly explain what the observed finding may mean in simple but medically useful language. Use cautious wording when uncertain.]

STUDY NOTE:
[Give 1 to 3 short educational points for a medical student, such as anatomy, fracture terminology, alignment terms, or radiology interpretation tips relevant to this image.]

LIMITS AND REMINDER:
[Mention image-quality, angle, cropping, or single-view limitations. Remind the user that this is AI-assisted observation and not a final diagnosis.]

Rules:
- If the image is a normal hand, leg, chest, spine, or other general X-ray, do not mention baby, fetus, placenta, pregnancy, or fetal development
- Mention baby-related information only if the image is clearly a fetal or prenatal ultrasound
- Stay observation-first and image-specific
- Do not invent findings
- Keep the wording concise, specific, and medically helpful`;

// ── Language Prompts ───────────────────────────────────────
const LANGUAGE_CONFIG = {
  english: {
    name: "English",
    prompt: `You are a warm and caring medical assistant helping families understand baby-related medical images and hospital documents. 
    
Analyze this medical image or hospital document carefully and provide a clear, simple explanation. 

Please structure your response EXACTLY as follows (use these exact section headers with emojis):

🔍 **What I Can See:**
[Describe visible structures - baby size, position, and identifiable body parts in simple terms]

👶 **About Your Baby:**
[Describe baby's development stage, movement indicators, and anything notable about the baby]

💙 **Placenta & Amniotic Fluid:**
[Briefly mention placenta location and fluid levels if visible]

✅ **General Observations:**
[2-3 positive, reassuring observations in simple language a first-time mom can understand]

⚠️ **Important Reminder:**
[Always remind them this is AI analysis only and they should discuss all findings with their doctor/gynecologist]

Guidelines:
- Use very simple, non-medical language
- Be warm, supportive and reassuring in tone
- Avoid alarming or scary terminology
- Keep each section brief (2-4 sentences)
- RESPOND ENTIRELY IN ENGLISH`,
  },

  hindi: {
    name: "Hindi (हिंदी)",
    prompt: `आप एक गर्म और देखभाल करने वाले चिकित्सा सहायक हैं जो गर्भवती माताओं को उनके बच्चे के अल्ट्रासाउंड स्कैन को समझने में मदद कर रहे हैं।

इस अल्ट्रासाउंड छवि का ध्यानपूर्वक विश्लेषण करें और एक स्पष्ट, सरल स्पष्टीकरण प्रदान करें।

कृपया अपना जवाब बिल्कुल इस प्रकार दें (इन्हीं शीर्षकों का उपयोग करें):

🔍 **मुझे क्या दिख रहा है:**
[दिखाई देने वाली संरचनाओं का वर्णन करें - बच्चे का आकार, स्थिति और पहचान योग्य शरीर के अंग सरल भाषा में]

👶 **आपके बच्चे के बारे में:**
[बच्चे के विकास के चरण, हलचल के संकेतक का वर्णन करें]

💙 **नाल और एमनियोटिक द्रव:**
[यदि दिखाई दे तो प्लेसेंटा की स्थिति और तरल स्तरों का संक्षिप्त उल्लेख करें]

✅ **सामान्य अवलोकन:**
[2-3 सकारात्मक, आश्वस्त करने वाले अवलोकन सरल भाषा में जो एक नई माँ समझ सके]

⚠️ **महत्वपूर्ण याद दिलाना:**
[हमेशा याद दिलाएं कि यह केवल AI विश्लेषण है और सभी निष्कर्षों के बारे में अपने डॉक्टर से बात करें]

दिशानिर्देश:
- बहुत सरल, गैर-चिकित्सा भाषा का उपयोग करें
- गर्म, सहायक और आश्वस्त करने वाले स्वर में रहें
- हर अनुभाग संक्षिप्त रखें (2-4 वाक्य)
- पूरी तरह से हिंदी में जवाब दें`,
  },

  marathi: {
    name: "Marathi (मराठी)",
    prompt: `तुम्ही एक उबदार आणि काळजी घेणारे वैद्यकीय सहाय्यक आहात जे गर्भवती मातांना त्यांच्या बाळाचे अल्ट्रासाउंड स्कॅन समजण्यास मदत करत आहात।

या अल्ट्रासाउंड प्रतिमेचे काळजीपूर्वक विश्लेषण करा आणि स्पष्ट, सोपे स्पष्टीकरण द्या।

कृपया तुमचे उत्तर अगदी या प्रकारे द्या (हे शीर्षक वापरा):

🔍 **मला काय दिसत आहे:**
[दिसणाऱ्या संरचनांचे वर्णन करा - बाळाचा आकार, स्थिती आणि ओळखता येणारे शरीराचे अवयव सोप्या भाषेत]

👶 **तुमच्या बाळाबद्दल:**
[बाळाचा विकास टप्पा, हालचाल निर्देशकांचे वर्णन करा]

💙 **वार आणि गर्भजल:**
[दिसल्यास प्लेसेंटाचे स्थान आणि द्रव पातळीचा थोडक्यात उल्लेख करा]

✅ **सामान्य निरीक्षणे:**
[2-3 सकारात्मक, आश्वस्त करणारी निरीक्षणे सोप्या भाषेत जी नवीन आई समजू शकेल]

⚠️ **महत्त्वाची आठवण:**
[नेहमी आठवण करून द्या की हे फक्त AI विश्लेषण आहे आणि सर्व निष्कर्षांबद्दल डॉक्टरांशी बोला]

मार्गदर्शक तत्त्वे:
- अत्यंत सोपी, वैद्यकीय नसलेली भाषा वापरा
- उबदार, सहाय्यक आणि आश्वस्त करणाऱ्या स्वरात राहा
- प्रत्येक विभाग संक्षिप्त ठेवा (2-4 वाक्ये)
- संपूर्णपणे मराठीत उत्तर द्या`,
  },
};

// ── Routes ─────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Baby Scan API is running 🤱",
    timestamp: new Date().toISOString(),
  });
});

// ── POST /api/analyze ──────────────────────────────────────
// Accepts multipart/form-data with fields: image (file), language, userId
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!aiConfigured) {
      return res.status(503).json({
        success: false,
        error:
          "AI analysis is not configured on the backend. Add GROQ_API_KEY to backend/.env and restart the server.",
      });
    }

    const language = req.body.language || "english";
    const userId = req.body.userId || "anonymous";

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided. Please upload a medical image or a photo of a hospital document.",
      });
    }

    if (!LANGUAGE_CONFIG[language]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language. Use: ${Object.keys(LANGUAGE_CONFIG).join(", ")}`,
      });
    }

    console.log(
      `📸 Analyzing scan for userId=${userId}, language=${language}, size=${req.file.size} bytes`
    );

    const prompt =
      language === "english"
        ? ENGLISH_IMAGE_ANALYSIS_PROMPT
        : LANGUAGE_CONFIG[language].prompt;
    const finalPrompt = `${INPUT_SCOPE_PROMPT}\n\n${prompt}`;
    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    // ── Call Gemini Vision API ─────────────────────────────
    const result = await generateGroqResponse(finalPrompt, imageBase64, mimeType);

    const explanation = result.explanation;
    console.log(`✅ Groq analysis complete using model=${result.modelName}`);

    // ── Upload to Firebase Storage ─────────────────────────
    let imageUrl = null;
    let scanId = null;

    if (db) {
      try {
        let fileName = null;

        if (bucket) {
          fileName = `scans/${userId}/${Date.now()}_scan.jpg`;
          const file = bucket.file(fileName);
          await file.save(req.file.buffer, {
            metadata: { contentType: mimeType },
          });
          [imageUrl] = await file.getSignedUrl({
            action: "read",
            expires: "03-09-2491",
          });
        }

        // ── Save to Firestore ──────────────────────────────
        const docRef = await db.collection("scans").add({
          userId,
          language,
          explanation,
          imageUrl,
          fileName,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          analyzedAt: new Date().toISOString(),
        });
        scanId = docRef.id;
        console.log(`💾 Saved to Firestore: ${scanId}`);
      } catch (firebaseErr) {
        console.error("Firebase save error (non-fatal):", firebaseErr.message);
      }
    }

    return res.json({
      success: true,
      explanation,
      scanId,
      imageUrl,
      language,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Analysis error:", err);
    const invalidApiKey =
      err.status === 401 ||
      /api key|invalid api key|incorrect api key|unauthorized/i.test(
        err.message || ""
      ) ||
      /api key|invalid api key|incorrect api key|unauthorized/i.test(
        err.body?.error || ""
      );
    const retryAfterSeconds = err.retryAfterSeconds ?? null;

    // Friendly error messages
    if (err.message?.includes("SAFETY")) {
      return res.status(422).json({
        success: false,
        error:
          "The file could not be analyzed due to content safety filters. Please ensure you are uploading a baby-related medical image or hospital document photo.",
      });
    }
    if (invalidApiKey || err.message?.includes("API_KEY")) {
      return res.status(500).json({
        success: false,
        error:
          "The backend Groq API key is invalid. Update GROQ_API_KEY in backend/.env and restart the server.",
      });
    }
    if (
      err.status === 404 &&
      /model|not found|not supported/i.test(err.message || "")
    ) {
      return res.status(500).json({
        success: false,
        error:
          "The configured Groq model is not available. Update GROQ_MODEL/GROQ_FALLBACK_MODEL in backend/.env and restart the server.",
      });
    }
    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "Groq quota or rate limits have been exceeded for this API key or project. Check your Groq console limits and billing, or try again later.",
        retryAfterSeconds,
      });
    }
    if (err.status === 503) {
      return res.status(503).json({
        success: false,
        error:
          "The Groq model is temporarily overloaded. Please try again in a few seconds.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Analysis failed. Please try again with a clearer image.",
      detail:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ── GET /api/history/:userId ───────────────────────────────
app.get("/api/history/:userId", async (req, res) => {
  if (!db) {
    return res.json({ success: true, scans: [] });
  }

  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const snapshot = await db
      .collection("scans")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const scans = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      scans.push({
        id: doc.id,
        userId: data.userId,
        language: data.language,
        explanation: data.explanation,
        imageUrl: data.imageUrl,
        analyzedAt: data.analyzedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      });
    });

    return res.json({ success: true, scans, count: scans.length });
  } catch (err) {
    console.error("History fetch error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Could not fetch history." });
  }
});

// ── DELETE /api/scan/:scanId ───────────────────────────────
app.delete("/api/scan/:scanId", async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: "Firebase not configured." });
  }
  try {
    await db.collection("scans").doc(req.params.scanId).delete();
    return res.json({ success: true, message: "Scan deleted successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Delete failed." });
  }
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ success: false, error: "Image too large. Maximum size is 20MB." });
    }
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error." });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Baby Scan API running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔬 Analyze endpoint: POST http://localhost:${PORT}/api/analyze\n`);
});
