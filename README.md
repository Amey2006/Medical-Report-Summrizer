# 🤱 BabyScan AI — Ultrasound Explainer App

A mobile app that analyzes baby ultrasound images and explains findings in simple language across **English**, **Hindi (हिंदी)**, and **Marathi (मराठी)** — built with React Native (Expo SDK 51), Node.js, Firebase, and Google Gemini AI.

---

## 📱 Screenshots Preview

```
┌──────────────────────┐    ┌──────────────────────┐
│  🌸 BabyScan AI      │    │  📋 Scan Result       │
│  ─────────────────── │    │  ─────────────────── │
│  🌐 Select Language  │    │  🔍 What I See:       │
│  [EN] [हिं] [मर]     │    │  Baby is in head-     │
│                      │    │  down position...     │
│  📷 Tap to Upload    │    │                      │
│  ┌────────────────┐  │    │  👶 About Your Baby:  │
│  │  🏥             │  │    │  The baby appears... │
│  │  Upload Scan   │  │    │                      │
│  └────────────────┘  │    │  ✅ General Notes:   │
│                      │    │  Everything looks... │
│  [🔬 Analyze Scan]   │    │                      │
└──────────────────────┘    └──────────────────────┘
```

---

## 🏗️ Architecture

```
baby-scan-app/
├── frontend/              # React Native (Expo SDK 51)
│   ├── App.js             # Navigation root
│   ├── app.json           # Expo config
│   └── src/
│       ├── screens/
│       │   ├── HomeScreen.js      # Main scan + upload
│       │   ├── HistoryScreen.js   # Past scan history
│       │   └── ResultScreen.js    # Full result view
│       ├── components/
│       │   ├── LanguageSelector.js
│       │   └── ResultCard.js
│       ├── services/
│       │   ├── api.js             # Axios API calls
│       │   └── firebase.js        # Firebase client (optional)
│       ├── utils/
│       │   └── storage.js         # AsyncStorage helpers
│       └── theme.js               # Colors, fonts, sizes
│
└── backend/               # Node.js + Express
    ├── server.js          # Main server with all routes
    ├── package.json
    └── .env.example       # Environment variable template
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo Go app on your phone (iOS or Android)
- Google Gemini API key (free)
- Firebase project (free Spark plan works)

---

## Step 1 — Get a Free Gemini API Key

1. Go to: **https://aistudio.google.com/app/apikey**
2. Click **"Create API Key"**
3. Copy the key — you'll use it in Step 3

---

## Step 2 — Set Up Firebase

1. Go to **https://console.firebase.google.com**
2. Click **"Add Project"** → name it (e.g., `baby-scan-ai`)
3. Disable Google Analytics (optional) → **Create Project**

### Enable Firestore:
- Left sidebar → **Firestore Database** → **Create database**
- Choose **"Start in test mode"** → Select a region → **Enable**

### Enable Storage:
- Left sidebar → **Storage** → **Get started**
- Choose **"Start in test mode"** → **Done**

### Get Service Account Key (for backend):
- Go to **Project Settings** (⚙️ gear icon)
- **Service Accounts** tab
- Click **"Generate new private key"**
- Download the JSON file

### Get Web App Config (for frontend, optional):
- **Project Settings** → **General** → **Your Apps**
- Click **"<> Web"** icon → Register app
- Copy the `firebaseConfig` object

---

## Step 3 — Backend Setup

```bash
cd baby-scan-app/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=AIza...your_key_here...

# Paste the ENTIRE content of your service account JSON as one line:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

PORT=3000
```

**Converting service account JSON to one line:**
```bash
# On Mac/Linux:
cat your-service-account.json | tr -d '\n' | pbcopy
# Then paste into FIREBASE_SERVICE_ACCOUNT=

# On Windows PowerShell:
(Get-Content your-service-account.json) -join '' | Set-Clipboard
```

Start the backend:
```bash
npm run dev     # with auto-reload (development)
# or
npm start       # production
```

Verify it's running:
```
✅ Firebase initialized successfully
🚀 Baby Scan API running on http://0.0.0.0:3000
```

Test: Open `http://localhost:3000/health` in browser — you should see `{"status":"ok"}`

---

## Step 4 — Frontend Setup

```bash
cd baby-scan-app/frontend

# Install dependencies  
npm install
```

### Update the API URL:
Edit `src/services/api.js` line 10:
```javascript
const BASE_URL = "http://YOUR_COMPUTER_IP:3000";
```

**Find your computer's local IP:**
- Mac: `System Preferences → Network` or run `ipconfig getifaddr en0`
- Windows: Run `ipconfig` → look for IPv4 Address (usually `192.168.x.x`)
- Linux: Run `hostname -I`

⚠️ **Important:** Use your LAN IP, not `localhost` — your phone can't reach `localhost` on your computer!

### (Optional) Update Firebase config:
Edit `src/services/firebase.js` with your web app config from Firebase Console.

### Start Expo:
```bash
npx expo start
```

This will show a QR code. **Scan it with Expo Go** on your phone.

> Make sure your phone and computer are on the **same Wi-Fi network!**

---

## 📋 Firebase Firestore Rules (for production)

When moving to production, update your Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scans/{scanId} {
      allow read, write: if true; // For development
      // For production, restrict to authenticated users:
      // allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| "Cannot connect to server" | Check that backend is running and API URL in `api.js` uses your LAN IP |
| "Firebase initialization failed" | Check your `.env` file — the JSON must be on one line with no line breaks |
| Image picker not working | Accept permissions when prompted; on iOS simulator, use "Choose from Library" |
| Gemini analysis fails | Ensure your GEMINI_API_KEY is valid and has quota remaining |
| Expo Go can't scan QR | Make sure both devices are on same Wi-Fi; try `npx expo start --tunnel` |

---

## 🌟 Features

- **📷 Image Upload** — Camera or gallery pick of ultrasound images
- **🤖 AI Analysis** — Powered by Google Gemini 1.5 Flash (free tier)
- **🌐 3 Languages** — English, Hindi (हिंदी), Marathi (मराठी)
- **📋 History** — Firebase-backed scan history with local fallback
- **🔄 Re-analyze** — Same scan in different languages
- **📤 Share** — Share results via native share sheet
- **💾 Offline Fallback** — Local AsyncStorage when server is unavailable

---

## 🔑 API Keys & Costs

| Service | Free Tier |
|---|---|
| Google Gemini API | 15 requests/minute, 1M tokens/day — FREE |
| Firebase Firestore | 50K reads, 20K writes/day — FREE (Spark plan) |
| Firebase Storage | 5GB storage, 1GB/day download — FREE |

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 51 |
| Navigation | React Navigation v6 |
| Backend | Node.js + Express |
| AI | Google Gemini 1.5 Flash |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Image Handling | expo-image-picker |
| HTTP Client | Axios |
| Local Storage | AsyncStorage |

---

## ⚠️ Medical Disclaimer

This app is for **informational and educational purposes only**. The AI analysis is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider (doctor, gynecologist, or radiologist) for interpretation of medical imaging.
