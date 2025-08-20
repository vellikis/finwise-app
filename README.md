# FinWise – Personal Finance (React Native + Expo)

A tidy, portfolio-friendly budgeting app built with **React Native + Expo**.  
Track transactions, set budgets, create recurring rules, and tweak a few thoughtful settings — all in a clean, mobile-first UI.

---

## ✨ Features

- **Transactions**
  - Quick Add modal (floating + button)
  - Swipe to delete, tap to expand, inline edit
  - Filters: Today / Week / Month / Custom range
  - Pull-to-refresh & auto-refresh on focus

- **Budgets**
  - Weekly / Monthly budgets with progress bars
  - Anchor start date (polished iOS date wheel on iOS)

- **Recurring**
  - Daily / Weekly / Monthly rules
  - “Run due” action & automatic materialization

- **Home**
  - At-a-glance income/expense cards
  - Handy quick-action tiles
  - Friendly welcome + tip section

- **Settings**
  - Theme: **Light / Dark / System**
  - **Show cents** toggle
  - **App Lock**: Biometric / Passcode (passcode is placeholder for demo)
  - **Auto-lock after**: 30s / 1m / 5m
  - **Daily reminder** (time picker) via `expo-notifications`
  - **Export CSV**: Transactions / Budgets / Recurring
  - **Reset all data** (guarded placeholder)
  - “About & Support” stubs

- **Tech niceties**
  - SQLite via `expo-sqlite`
  - Themed React Navigation (colors adapt to theme)
  - iOS “spinner” date wheel where it matters

---

## 🚀 Getting Started

### 1) Clone the repo
`git clone https://github.com/vellikis/finwise-app.git
cd finwise-app`

### 2) Install dependencies
` npm install`
If you need the optional packages used by Settings features:
`npx expo install expo-local-authentication expo-notifications expo-file-system expo-sharing expo-constants @react-native-async-storage/async-storage @react-native-community/datetimepicker`
### 3) Run the app (Expo)
` npx expo start`
Press i to run iOS Simulator (macOS), a for Android emulator,
or scan the QR with the Expo Go app on a device.

## 🧩 Tech Stack

- React Native + Expo

- TypeScript

- SQLite (expo-sqlite)

- React Navigation

**@expo/vector-icons`

Optional / used in features:

expo-local-authentication (App Lock – biometrics)

expo-notifications (daily reminder)

expo-file-system + expo-sharing (CSV export)

@react-native-async-storage/async-storage (settings)

@react-native-community/datetimepicker (date/time pickers)

## 📁 Project Structure (high-level)
.
├─ App.tsx
├─ app.json
├─ navigation/
│  └─ TabNavigator.tsx
├─ screens/
│  ├─ HomeScreen.tsx
│  ├─ TransactionsScreen.tsx
│  ├─ BudgetsScreen.tsx
│  ├─ RecurringScreen.tsx
│  └─ SettingsScreen.tsx
├─ components/
│  └─ QuickAddModal.tsx
├─ database/
│  └─ index.ts (initDB, CRUD, materializeRecurring, etc.)
├─ theme.ts (ThemeProvider, useTheme, useThemeMode)
└─ utils/
   └─ money.ts (formatAmount helper)

## ⚙️ Useful Scripts
# Start Metro / Expo
`npx expo start`

# Run on Android (emulator)
`npx expo run:android`

# Run on iOS (simulator; macOS only)
`npx expo run:ios`

## 🔒 iOS / Android Notes

System Theme: Ensure app.json has:

`{ "expo": { "userInterfaceStyle": "automatic" } }`


- Notifications: On iOS, test on a physical device for scheduled alerts.

- Biometrics: Requires Face ID/Touch ID/Android biometrics configured on device.

## 🧾 CSV Export

Exports open the system share sheet where available. If sharing isn’t available, files are written to Expo’s cache directory and an alert shows the path.

## 🧰 Troubleshooting

CRLF warnings on Windows: It’s safe. To normalize:

`git config core.autocrlf true`


- New transactions not visible immediately: The list auto-refreshes when the screen regains focus and via pull-to-refresh. If you modified DB helpers, ensure they resolve successfully.

## 🤝 Contributing

Pull requests welcome!
Find a bug or want a small improvement? Open an issue.

## 📜 License

MIT

Made by Evan

