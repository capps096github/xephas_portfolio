# Run Instructions: <Project name>

<!--
Template from Apta Innovations Limited: https://xephas.me/code/prepare/
Save this as run_instruction.md at the ROOT of your repository and fill in
every section. Write it for a developer who has never seen the project and has
none of your accounts, keys or machine setup. Delete these comments when done.
Commit it BEFORE you run clean-history.sh, so it is part of the cleaned history.
-->

## 1. What this is

One paragraph: what the product does, who it is for, and its status
(live, discontinued, in development).

| Part | Folder | Stack |
|---|---|---|
| Mobile app | `app/` | Flutter 3.24, Dart 3.5 |
| Web | `web/` | Next.js 15, React 19, Tailwind 4 |
| API | `api/` | Node 20, Express, Firebase Cloud Functions |

## 2. Prerequisites

List every tool with the exact version you build with.

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x | <https://nodejs.org> |
| pnpm | 9.x | `npm install -g pnpm` |
| Flutter | 3.24.x | <https://docs.flutter.dev/get-started/install> |
| Firebase CLI | 13.x | `npm install -g firebase-tools` |
| Xcode / Android Studio | 16 / Koala | For iOS / Android builds |

## 3. Credentials and configuration

Every secret was replaced with a placeholder. A new owner needs their own value
for each one.

| Placeholder | File(s) | What it is | Where to get your own |
|---|---|---|---|
| `YOUR_FIREBASE_PROJECT_ID` | `.firebaserc`, `api/.env.example` | Firebase project | Firebase console > create project |
| `YOUR_STRIPE_SECRET_KEY` | `api/.env.example` | Payments, test mode | Stripe dashboard > Developers > API keys |
| `YOUR_MAPS_API_KEY` | `web/.env.example` | Google Maps JS | Google Cloud console > Credentials |

Steps:

1. Copy each `.env.example` to `.env` and fill in the values above.
2. Files a CLI tool writes for you (e.g. `flutterfire configure` writes
   `firebase_options.dart`): name them, and the command.
3. Files you edit by hand: name them.
4. How to confirm it worked (e.g. "the API logs `Connected to Firestore`").

## 4. Build, run and test

Give exact commands for each part, run from the repo root.

### API

```bash
cd api
pnpm install
pnpm dev          # runs on http://localhost:5001
pnpm test
pnpm build
```

### Web

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
pnpm test
pnpm build
```

### Mobile app

```bash
cd app
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run       # pick a simulator or device
flutter test
flutter build apk --release
```

## 5. Quick start

The shortest path from a fresh clone to something running, in order:

1. `git clone <repo> && cd <repo>`
2. Set up credentials (section 3).
3. Start the API, then the web app (section 4).
4. Open <http://localhost:3000> and sign in with a test account you create.

## 6. Deployment (optional)

How it was deployed: hosting, CI workflows in `.github/workflows/`, release
steps for app stores.

## 7. Troubleshooting

The errors a new developer is most likely to hit, and the fix for each.

| Symptom | Cause | Fix |
|---|---|---|
| `PERMISSION_DENIED` from Firestore | Rules not deployed | `firebase deploy --only firestore:rules` |
| iOS build fails at `pod install` | CocoaPods out of date | `sudo gem install cocoapods && pod repo update` |
| `Missing env var STRIPE_KEY` | `.env` not created | Copy `.env.example` to `.env` (section 3) |
