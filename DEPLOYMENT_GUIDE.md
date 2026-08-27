# 🚀 Complete Deployment & Supabase Setup Guide for Listrr

This guide walks you through setting up your **Supabase Database with Realtime synchronization**, running the app locally, and deploying **Listrr** to the **Apple App Store** and **Google Play Store**.

---

## 📑 Table of Contents
1. [Part 1: Supabase Realtime Database Setup](#part-1-supabase-realtime-database-setup)
2. [Part 2: Running the Application Locally](#part-2-running-the-application-locally)
3. [Part 3: Google Play Store (Android) Release Guide](#part-3-google-play-store-android-release-guide)
4. [Part 4: Apple App Store (iOS) Release Guide](#part-4-apple-app-store-ios-release-guide)
5. [Part 5: Automated Store Submission with EAS Submit](#part-5-automated-store-submission-with-eas-submit)

---

## Part 1: Supabase Realtime Database Setup

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, select your organization, enter a name (e.g., `listrr-db`), and set a strong database password.
3. Choose your nearest region and click **Create new project**.

### Step 2: Run the SQL Schema & Enable Realtime
1. In your Supabase project dashboard, open the **SQL Editor** tab on the left sidebar.
2. Click **New query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql) in this repository, copy all the SQL content, and paste it into the Supabase SQL editor.
4. Click **Run** (or press `Ctrl+Enter`).
   - Enables `uuid-ossp` and `pgcrypto` extensions for reliable UUID generation.
   - Creates the `lists` and `list_items` tables with `user_id` support.
   - Sets up foreign keys with cascading deletes.
   - Configures indexes and Row Level Security (RLS) policies for anon and authenticated roles.
   - Adds the tables to `supabase_realtime` publication.
   - Seeds sample starting lists into your database.

### Step 3: Connect Supabase to the App
1. In the Supabase dashboard, navigate to **Project Settings** (gear icon) ➔ **API**.
2. Copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API Keys** ➔ `anon` `public` key (starts with `ey...`)
3. Open or create the [`.env`](./.env) file in the root of your project:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
4. Save the file. When you start the app, it will connect automatically and stream live Realtime updates!

---

## Part 2: Running the Application Locally

> **Important Note:** To run Expo commands locally, use `npx expo` or `npm run` so Windows resolves the project's local Expo CLI.

### Option A: Run on Web Browser
```bash
npm run web
# OR
npx expo start --web
```
Press `w` in the terminal to open the web interface in your browser.

### Option B: Run on iOS Simulator (macOS)
```bash
npm run ios
# OR
npx expo start --ios
```

### Option C: Run on Android Emulator / Physical Device
```bash
npm run android
# OR
npx expo start --android
```

### Option D: Run on Physical Phone with Expo Go
```bash
npx expo start
```
Scan the QR code displayed in the terminal using the **Expo Go** app on Android or the **Camera** app on iOS.

---

## Part 3: Google Play Store (Android) Release Guide

### Step 1: Install EAS CLI and Login
```bash
npm install -g eas-cli
eas login
```
*(If you don't have an Expo account, create one free at [expo.dev](https://expo.dev)).*

### Step 2: Configure EAS Project
In your project directory, run:
```bash
eas build:configure
```

### Step 3: Set Up Google Play Console Account
1. Register for a **Google Play Developer Account** at [play.google.com/console](https://play.google.com/console) (one-time $25 fee).
2. Complete developer identity verification.
3. Click **Create app**:
   - App Name: `Listrr`
   - Default Language: `English (United States)`
   - App / Game: `App`
   - Free / Paid: `Free`
4. Complete the required **Store Presence** sections:
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots for phone & 7-inch/10-inch tablets
   - Privacy Policy URL

### Step 4: Build the Android App Bundle (AAB)
Run EAS Build in the cloud to generate the production `.aab` file:
```bash
eas build --platform android --profile production
```
- EAS will ask if you want Expo to generate a Keystore for Android. Select **Yes** (recommended; Expo will securely manage your signing credentials).
- Once the cloud build completes, you can download the `.aab` file directly from the link provided or the expo.dev dashboard.

### Step 5: Upload AAB and Release
1. In **Google Play Console**, select your app.
2. Go to **Testing** ➔ **Internal testing** (or **Production**).
3. Click **Create new release**.
4. Upload the downloaded `.aab` bundle.
5. Provide release notes and click **Review release** ➔ **Start rollout**.

---

## Part 4: Apple App Store (iOS) Release Guide

### Step 1: Apple Developer Program Enrollment
1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Ensure you have an active Apple Developer Team.

### Step 2: Create App on App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. Navigate to **Apps** ➔ **+ (Add App)**.
   - Platform: `iOS`
   - Name: `Listrr`
   - Primary Language: `English (U.S.)`
   - Bundle ID: Select or register `com.listrr.app` (matching `app.json`)
   - SKU: `listrr-001`
   - User Access: `Full Access`

### Step 3: Build the iOS Production Binary (IPA)
Run EAS Build for iOS:
```bash
eas build --platform ios --profile production
```
- EAS will prompt you to log in with your Apple Developer Account.
- Select **Let EAS generate and manage your credentials** (Apple Distribution Certificate & Provisioning Profile).
- EAS will build the production `.ipa` in the cloud.

### Step 4: Submit via TestFlight & App Review
1. Once built, upload directly using EAS Submit or Transporter.
2. Open **TestFlight** in App Store Connect to test on real iOS devices.
3. Fill in required App Store metadata:
   - App screenshots (6.7" and 6.5" iPhone displays)
   - Promotional text, description, keywords
   - Support URL & Privacy Policy URL
4. Select the build and click **Submit for Review**.

---

## Part 5: Automated Store Submission with EAS Submit

You can automate submission directly from your terminal without manual downloads:

### Submit to Google Play Store
```bash
eas submit -p android --latest
```

### Submit to Apple App Store
```bash
eas submit -p ios --latest
```

### One-Command Build & Submit
```bash
eas build --platform all --profile production --auto-submit
```

---

## 🛠️ Summary Checklist

- [x] Dependencies installed (`@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`)
- [x] Relational database schema ready with Realtime (`supabase/schema.sql`)
- [x] Realtime CRUD integration in `ListContext.tsx`
- [x] Environment variable configuration template (`.env.example`)
- [x] EAS Build configuration ready (`eas.json`)
- [x] Bundle identifiers set in `app.json` (`com.listrr.app`)
