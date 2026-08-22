# Listrr

**Listrr** is a responsive, cross-platform task and list management app built with React Native and Expo Router. Designed with a tab-based navigation architecture, dynamic dark mode support, and seamless list formatting options.

---

## Features

- **Multi-Format Lists**: Create and manage checklists, bulleted lists, and numbered lists.
- **Tagging & Filtering**: Categorize lists with custom tags and filter them instantly on the home screen.
- **Pinning & Reordering**: Pin high-priority lists to the top of your view.
- **Dynamic Dark Mode**: Automatic theme switcher with styled UI adjustments for status and navigation bars.
- **Responsive Design**: Built using dynamic layouts scaling across small smartphones, foldables, and large screen devices.

---

## Tech Stack

- **Framework**: React Native / Expo (SDK 52+)
- **Navigation**: Expo Router (File-based Routing)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Safe Area Management**: `react-native-safe-area-context`
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
│   │   ├── index.tsx    # "My Lists" screen (Filtered view)
│   │   ├── create.tsx   # "Create List" form
│   │   └── profile.tsx  # Settings & Statistics overview
│   └── _layout.tsx      # Root Stack and Context provider
├── context/
│   └── ListContext.tsx  # Global state for lists and dark mode
└── types/
    └── list.ts          # TypeScript interfaces
```