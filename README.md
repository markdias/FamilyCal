# FamilyCal - Family Calendar Application

A comprehensive family calendar application built with React Native + Expo, designed to help families coordinate schedules and events.

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI (installed automatically)

### Installation

```bash
# Install dependencies
npm install
```

### Running the App

#### Web Browser (Recommended for Development)

```bash
npm run web
# or
npx expo start --web
```

Then open `http://localhost:8082` in your browser.

#### iOS Simulator (macOS Only)

```bash
npm run ios
```

#### Android Emulator

```bash
npm run android
```

#### Physical Device

1. Install the **Expo Go** app:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run: `npm start`
3. Scan the QR code with your phone's camera or the Expo Go app

## 📁 Project Structure

```
src/
├── navigation/           # App navigation structure
│   └── AppNavigator.js   # Main navigator with auth flow and tabs
├── services/             # Core services (singletons)
│   ├── SupabaseClient.js     # Supabase client wrapper
│   ├── SupabaseAuthService.js  # Authentication state management
│   ├── SupabaseDataService.js  # CRUD operations
│   ├── AppSettingsService.js   # User preferences & Pro enforcement
│   └── index.js           # Services export
├── screens/              # Screen components
│   ├── OnboardingScreen.js     # First-time user welcome
│   ├── AuthScreen.js           # Sign up, sign in, guest mode
│   ├── FamilySetupScreen.js    # Initial family setup
│   ├── FamilyScreen.js         # Main family view
│   ├── MonthScreen.js          # Monthly calendar view
│   ├── DayScreen.js            # Daily timeline view
│   └── SettingsScreen.js       # App settings
├── styles/               # Design system
│   └── theme.js         # Theme tokens and design system
├── types/               # Type definitions
│   └── index.js         # Data model interfaces
├── components/          # Reusable UI components (to be added)
├── hooks/               # Custom React hooks (to be added)
├── utils/               # Helper functions (to be added)
└── types/               # TypeScript types (to be added)
```

## 🎨 Design System

The app follows a comprehensive design system defined in `DESIGN_SYSTEM.md`:

- **Colors**: Coral Red (#FF6B6B) primary accent, system colors for semantics
- **Typography**: San Francisco/Roboto/System with Dynamic Type support
- **Spacing**: 8pt grid system
- **Components**: Consistent patterns for cards, buttons, lists

## 🏗️ Architecture

### Service-Based Architecture

The app uses singleton services for core functionality:

1. **SupabaseAuthService**: Authentication state, login/logout, token management
2. **SupabaseDataService**: CRUD operations for families, events, attendees
3. **SupabaseClient**: Low-level Supabase client wrapper
4. **AppSettingsService**: User preferences, Pro feature enforcement

### Data Model

- **Families**: Top-level organization
- **Family Members**: People in families with colors for UI
- **Family Calendars**: Calendar containers (one default per family)
- **Calendar Events**: Events with attendee-based assignment
- **Event Attendees**: Links events to family members

### Pro Feature Enforcement

The app enforces Pro feature limits at both UI and data layers:

**Free Tier Limits:**
- Family Members: 2 max
- Shared Calendars: 1 max
- Storage: 0 MB (no attachments)
- Spotlight Events: 5 per person
- Themes: Default only
- Widgets: Disabled
- Drivers/Saved Places: Disabled

**Pro Features:**
- Unlimited family members
- Unlimited shared calendars
- 1GB storage for attachments
- Unlimited spotlight events
- Light/Dark/Auto themes
- Widgets support
- Saved places and drivers

## 📱 Features

### Implemented ✅

- ✅ Design system and theme
- ✅ Type definitions
- ✅ Core services architecture
- ✅ Navigation structure (stack + tabs)
- ✅ Onboarding flow
- ✅ Authentication screens (UI)
- ✅ Family setup flow (UI)
- ✅ Main app screens (Family, Month, Day, Settings)
- ✅ Pro feature enforcement UI

### To Be Implemented 🚧

- ⏳ Supabase backend integration
- ⏳ Actual authentication (email/password, OAuth)
- ⏳ Family creation and management
- ⏳ Event CRUD operations
- ⏳ Calendar views (Month grid, Day timeline)
- ⏳ Notifications system
- ⏳ Morning brief feature
- ⏳ Checklists
- ⏳ Recurring events
- ⏳ External calendar sync
- ⏳ Widgets
- ⏳ In-app purchases

## 🔧 Configuration

### Supabase Setup

To connect to Supabase, create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Or update the values directly in `src/services/SupabaseClient.js`.

## 📄 Documentation

- `DESIGN_SYSTEM.md` - Complete visual design specifications
- `FEATURES.md` - Feature specifications and constraints
- `USER_FLOWS.md` - Screen specs and user journeys
- `CLAUDE.md` - Developer guidance

## 🧪 Development Workflow

1. **Plan First**: Review specifications in the documentation
2. **Follow Design System**: Every UI component must adhere to the design tokens
3. **Use Services**: All data operations go through the service layer
4. **Verify No Breaking Changes**: Test affected flows end-to-end
5. **Update Documentation**: Keep docs in sync with implementation

## 🎯 Next Steps

To continue building the app:

1. Set up Supabase project and configure environment variables
2. Implement actual authentication flow with SupabaseAuthService
3. Build out event creation/editing screens
4. Implement calendar grid for Month view
5. Add timeline for Day view
6. Integrate notifications and morning brief
7. Add checklist functionality
8. Implement Pro purchase flow

## 📝 License

This project is in active development.

---

**Last Updated**: December 29, 2024
