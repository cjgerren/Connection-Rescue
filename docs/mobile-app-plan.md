# Mobile App Plan

This repo is currently a web app plus Node backend. The least disruptive path to a real mobile app is to keep the shared backend and wrap the frontend with Capacitor.

## Recommended path

Use Capacitor rather than rewriting the app in React Native right now.

Why:

- the frontend is already Vite + React
- the UI is already mobile-friendly enough to start from
- you can reuse the shared backend and Supabase setup
- it gets you to TestFlight / Play Internal Testing faster

## What to add to this repo

Phase 1: mobile shell

- add Capacitor dependencies
- generate `ios/` and `android/` projects
- define app id, app name, and build targets
- set production backend URL for device builds

Likely commands later:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
npx cap add ios
npx cap add android
```

Phase 2: mobile auth and routing

- configure deep links / app links / universal links
- update Supabase auth redirect handling for mobile
- verify checkout success/cancel returns to the app cleanly

Phase 3: mobile device capabilities

- decide whether boarding-pass scanning remains browser-based or becomes native camera/document capture
- decide whether alerts are push notifications, SMS, email, or all three
- add native permission handling for location and notifications

Phase 4: release pipeline

- iOS signing and App Store Connect setup
- Android signing keystore and Play Console setup
- beta distribution via TestFlight and Play Internal Testing

## Mobile-specific config you will need

Public mobile runtime config:

- backend base URL
- Supabase URL
- Supabase anon key
- app deep link scheme
- universal link / app link domains

Private mobile-platform secrets:

- Apple Developer certificates/profiles
- App Store Connect API key or account access
- Android upload keystore
- Google Play Console access

Push-notification secrets if you add push:

- APNs auth key for iOS
- Firebase / FCM server credentials for Android

SMS/email provider secrets if you want richer alerting:

- Twilio credentials
- email provider key such as Resend, SendGrid, Postmark, or Mailgun

## Code areas that need work before mobile store release

These are the repo-specific rough edges that matter for mobile:

- `src/components/rescue/PersonalizeModal.tsx`
  The boarding-pass parser depends on a missing backend function and currently falls back to demo data.

- `src/pages/Alerts.tsx`
  The alerts experience is email-driven and browser-local-storage-based, not device-account-driven.

- `src/hooks/useAdminAuth.ts`
  Admin auth assumes Supabase flows that must be verified on device redirect behavior.

- `src/components/rescue/ConfirmationBar.tsx`
  Checkout success/cancel handling should be validated with mobile deep linking.

- `src/data/rescueData.ts`
  The current imagery is still externally hosted and should be reviewed for offline/mobile performance and ownership.

## What “perfect” mobile means here

Before calling the mobile app production-ready, you should have:

1. shared backend secrets configured
2. real Supabase project and schema
3. working Stripe redirect return into the app
4. push or SMS alert strategy finalized
5. app-store compliant privacy disclosures for location, messaging, and account deletion
6. device-level QA on iPhone and Android hardware

## Suggested rollout order

1. Launch stable SaaS web production first.
2. Add Capacitor and produce internal mobile builds.
3. Validate auth, checkout return, alerts, and scanning on devices.
4. Add push if desired.
5. Ship beta to TestFlight / Play internal testers.
6. Fix device-specific issues before store submission.
