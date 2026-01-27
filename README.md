# ChitSync Admin

A comprehensive chit fund management Android app that serves as the complete "Operating System" for chit funds.

## Features

- 📊 **Master Dashboard** - Real-time overview of all groups, commissions, and pending collections
- 👥 **Group Management** - Create and manage multiple concurrent chit groups
- 💰 **Auction System** - Conduct monthly auctions with live calculations
- 📱 **Collections Tracking** - Mark payments, send receipts via WhatsApp
- 🔄 **Member Lifecycle** - Handle exits, replacements, and settlements
- 📈 **Profit Tracking** - Calculate foreman net profit and closure reports
- 📴 **Offline-First** - Full functionality without internet connection

## Mathematical Formulas

- **Dividend**: `(Bid Amount - Foreman Commission) / Total Members`
- **Next Payable**: `Base Installment - Dividend`
- **Prize Money**: `Pot Value - Bid Amount`
- **Surrender Value**: `Total Paid - (Pot Value * 5%)`
- **Catch-up Amount**: Sum of all net payable from Month 1 to current

## Tech Stack

- **Frontend**: React Native (Expo)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **Navigation**: React Navigation
- **Database**: SQLite (local, offline-first)
- **Build**: GitHub Actions (automated APK builds)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Android Studio (for emulator)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android
```

### Building APK

APKs are automatically built via GitHub Actions on every push to `main` branch.

To build locally:

```bash
# Generate Android native files
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease
```

## GitHub Actions Workflows

### Automated Builds
- Triggers on push to `main` and `develop` branches
- Builds both debug and release APKs
- Uploads artifacts for 30 days

### Manual Release
- Workflow dispatch with version input
- Creates signed APK (requires keystore secrets)
- Creates GitHub release with APK attachment

### Required Secrets

For signed releases, add these to your GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password
- `EXPO_TOKEN` (optional) - For Expo CLI authentication

## Project Structure

```
ChitSyncAdmin/
├── .github/
│   └── workflows/        # GitHub Actions workflows
├── src/
│   ├── components/
│   │   └── ui/          # Reusable UI components
│   ├── navigation/      # Navigation setup
│   ├── screens/         # App screens
│   ├── theme/           # Colors and theming
│   ├── database/        # SQLite operations
│   └── utils/           # Helper functions
├── assets/              # Images, icons, fonts
├── global.css           # Global styles
├── tailwind.config.js   # Tailwind configuration
└── App.tsx             # Root component
```

## UI Screens

1. **Master Dashboard** - Financial health, auction radar, active groups
2. **Group Creation** - 3-step wizard (financials, schedule, members)
3. **Auction Room** - Conduct auctions with live calculations
4. **Ledger** - Collection tracking and payment entry
5. **Member Profile** - Exit flow and replacement onboarding
6. **Group Closure** - Final reports and profit calculation

## License

Proprietary - All rights reserved

## Author

ChitSync Team
