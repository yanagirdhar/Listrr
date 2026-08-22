# Listrr

**Listrr** is a responsive, cross-platform task and list management app built with React Native and Expo Router. Designed with a tab-based navigation architecture, dynamic dark mode support, drag-and-drop reordering, fast prefix search indexing, and flexible list formatting options.

---

## Features

- **Multi-Format Lists**: Create and manage checklists, bulleted lists, and numbered lists.
- **Fast Prefix Search**: In-memory Trie index (`ListSearchIndex`) supporting rapid search across titles, tags, and item contents.
- **Drag & Drop Reordering**: Reorder pinned and unpinned lists using drag-and-drop capabilities.
- **Archiving System**: Archive lists to clean up your main view while maintaining access via a dedicated archived route.
- **Tagging & Filtering**: Categorize lists with custom tags and filter them instantly on the home screen.
- **Pinning & Detail Views**: Pin high-priority lists to the top of your view and inspect/edit lists in full detail.
- **Dynamic Dark Mode**: Automatic theme switcher with styled UI adjustments for status and navigation bars.
- **Responsive Design**: Dynamic layouts scaling across small smartphones, foldables, and large screen devices.

---

## Tech Stack

- **Framework**: React Native / Expo (SDK 52+)
- **Navigation**: Expo Router (File-based Routing)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Safe Area & Gestures**: `react-native-safe-area-context`, `react-native-gesture-handler`
- **Interactivity**: `react-native-draggable-flatlist`, `expo-clipboard`
- **State Management**: React Context API (`ListContext`)

---

## Getting Started

### Prerequisites

Ensure you have **Node.js** (v18+) and **npm** installed on your system.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Listrr.git
   cd Listrr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npx expo start -c
   ```

4. **Run on a device or emulator:**
   ```bash
   Scan the QR code using the Expo Go app on Android or iOS.
   Press a for Android Emulator or i for iOS Simulator.
   ```

### Project Structure
```
src/
├── app/                 # Expo Router file-based pages
│   ├── (tabs)/          # Bottom tab navigation screens
│   │   ├── _layout.tsx  # Tab bar setup and custom FAB
│   │   ├── index.tsx    # "My Lists" screen (Active lists view)
│   │   ├── create.tsx   # "Create/Edit List" form
│   │   └── profile.tsx  # Profile, Statistics & Dark Mode settings
│   ├── list/
│   │   └── [id].tsx     # List detail view (edit, copy, archive, delete)
│   ├── archived.tsx     # Archived lists screen with filtering & search
│   └── _layout.tsx      # Root Stack navigation and ListProvider setup
├── context/
│   └── ListContext.tsx  # Global state manager for lists and theme
├── types/
│   └── list.ts          # TypeScript interfaces for lists and items
└── utils/
    └── searchIndex.ts   # Trie data structure for fast prefix search indexing
```