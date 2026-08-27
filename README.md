# Listrr

**Listrr** is a responsive, cross-platform task and list management app built with React Native and Expo Router. Designed with a tab-based navigation architecture, dynamic dark mode support, drag-and-drop reordering, fast prefix search indexing, and flexible list formatting options.

---

## Features

- **Multi-Tenant User Authentication**: Secure login and instant registration with username/email and password via Supabase Auth.
- **Isolated User Workspaces**: Strict Row-Level Security (RLS) ensures every user only sees and modifies their own private lists and data.
- **User Profiles & Avatars**: Customizable user profiles with avatar image uploads (< 500 KB limit enforced).
- **Realtime Database Synchronization**: Instant bi-directional live sync powered by Supabase PostgreSQL Realtime channels.
- **Multi-Format Lists**: Create and manage checklists, bulleted lists, and numbered lists.
- **Fast Prefix Search**: In-memory Trie index (`ListSearchIndex`) supporting rapid search across titles, tags, and item contents.
- **Drag & Drop Reordering**: Reorder pinned and unpinned lists using drag-and-drop capabilities.
- **Archiving System**: Archive lists to clean up your main view while maintaining access via a dedicated archived route.
- **Tagging & Filtering**: Categorize lists with custom tags and filter them instantly on the home screen.
- **Dynamic Dark Mode**: Automatic theme switcher with styled UI adjustments for status and navigation bars.
- **Responsive Design**: Dynamic layouts scaling across small smartphones, foldables, and desktop web.

---

## Tech Stack

- **Framework**: React Native / Expo (SDK 57)
- **Database & Auth**: Supabase PostgreSQL & Realtime with Row Level Security (RLS)
- **Navigation**: Expo Router (File-based Routing)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Safe Area & Gestures**: `react-native-safe-area-context`, `react-native-gesture-handler`
- **Interactivity & Media**: `react-native-draggable-flatlist`, `expo-image-picker`, `expo-clipboard`
- **State Management**: React Context API (`AuthContext`, `ListContext`)

---

## Getting Started

### Prerequisites

Ensure you have **Node.js** (v18+) and **npm** installed on your system.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/trynayash/Listrr.git
   cd Listrr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```

4. **Start the Expo development server:**
   ```bash
   npx expo start -c
   ```

5. **Run on a device or emulator:**
   - Press `w` for Web Browser
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator
   - Or scan the QR code using the **Expo Go** app

---

### Project Structure
```
src/
├── app/                 # Expo Router file-based pages
│   ├── (tabs)/          # Bottom tab navigation screens
│   │   ├── _layout.tsx  # Tab bar setup and custom FAB
│   │   ├── index.tsx    # "My Lists" screen (Active lists view)
│   │   ├── create.tsx   # "Create List" form
│   │   ├── edit.tsx     # "Edit List" form
│   │   ├── archived.tsx # Archived lists screen with filtering & search
│   │   └── profile.tsx  # Profile, Avatar (<500KB), Statistics & Settings
│   ├── list/
│   │   └── [id].tsx     # List detail view (edit, copy, archive, delete)
│   └── _layout.tsx      # Root Stack navigation with Auth & List Providers
├── components/
│   └── AuthScreen.tsx   # Sign In & Create Account authentication UI
├── context/
│   ├── AuthContext.tsx  # Authentication & user profile state management
│   └── ListContext.tsx  # Multi-tenant state manager for lists and theme
├── lib/
│   └── supabase.ts      # Cross-platform Supabase client singleton
├── types/
│   └── list.ts          # TypeScript interfaces for lists and items
└── utils/
    └── searchIndex.ts   # Trie data structure for fast prefix search indexing
```