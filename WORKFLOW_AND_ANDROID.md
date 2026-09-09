# Synora: workflow and Android local testing

## Administrator

`tumusandeep0000@gmail.com` is now ADMIN in your current local database. Sign out and sign in again with the same method used for that account. The administrator dashboard opens automatically. Keep a separate personal account for submitting check-ins.

1. In Administration → Staff access, enter a real counselor or case officer email and choose the role.
2. New staff sign in with Google using that exact email. This verifies the email and activates the reserved role. No invitation email is sent. Existing accounts without personal cases can be promoted and should use their existing login method. Staff sign out and sign in again after a role change.
3. A personal user's first check-in automatically opens their case. Repeated check-ins reuse an open case, including submissions from different tabs. If all previous cases are closed, a new case opens.
4. Administrator: Cases → Create and assign cases. Select a case and assign a counselor and optionally a case officer. Only active staff of the matching role are eligible.
5. The counselor signs in, opens the assigned case, and selects Voice notes → Load voice note → Play. Voice consent must be active. Case officers manage their assigned cases; audio remains restricted to the owner and assigned counselor.
6. Administration lets you revoke pending staff access or deactivate an existing account. Existing personal cases cannot be converted into staff accounts from the staff form.

The consent button advances to the next step, repeated submit clicks are guarded, and pending staff invitations cannot be claimed through unverified email/password registration. Public registration never accepts a staff role.

## Android: install the local test app

This is an installable, browser-powered Android app using Android Browser Helper. It uses your running Synora frontend and backend, so every role uses the same accounts, case data, animations, and recordings. It does not contain the Java server or a separate offline database.

Requirements: Android 8 or newer, an up-to-date Chrome browser, a USB data cable, and your Mac running Synora at localhost:5173 and localhost:8080.

1. On Android: Settings → About phone → tap Build number seven times. Then open Developer options and enable USB debugging. Manufacturer menu names vary.
2. Connect the phone to this Mac with USB. Unlock it and accept the USB debugging authorization prompt.
3. Double-click `Install Synora on Android.command` next to this guide. It checks the local server, forwards the phone's localhost:5173 to the Mac, installs `Synora-local.apk`, and opens Synora Local.
4. Sign in normally. Allow Chrome's microphone permission when recording a voice note. Submit a check-in, then use the counselor account to verify playback.
5. Keep USB connected and both Mac servers running. Run the installation script again after reconnecting or rebooting; forwarding is temporary. When finished, you may disable USB debugging.

No phone was connected during this build. Real-device login, microphone capture, playback, and animation smoothness still need this test. Local testing may show a browser toolbar because localhost cannot establish the public website/app trust association. This is expected. Google sign-in runs in a real browser rather than an embedded WebView.

## Build Android again

Open the `android` folder in Android Studio, use JDK 21, install Android SDK 36, and run `./gradlew assembleDebug`. The Gradle wrapper and source are included. The APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`. The default app address is http://localhost:5173/. The `android/connect-phone.sh` script also supports installation when `adb` is on PATH.

This is a debug-signed local test APK, not a Play Store release. Public mobile use requires an HTTPS deployment, a release signing key, and a Digital Asset Links association for your domain. Then build with `-PsynoraUrl=https://your-real-domain/` and configure the website association before release. We have not deployed the backend or published the app.

Architecture references: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities and https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide

## Restoring the project

The running folder is `Documents/synora ` (its name currently ends with a space). The ZIP contains a clean folder named `synora`.

Public Firebase web configuration is now included in `frontend/src/api/firebase.web.json`; `.env.local` overrides it. No service-account key, private backend configuration, database contents, or release signing key is included. Keep your existing backend credentials and database. On a fresh database apply the migration scripts; `20260909_workflow.sql` reserves the requested administrator email for verified Google sign-in if it does not yet exist.

## Analysis configuration

The current backend still reports its existing deterministic demo AI provider. Automated emotion/risk analysis is not a configured live AI model. Saved recordings and counselor listening work independently of that limitation.

## Verification

55 backend tests passed, including transactional PostgreSQL tests for first-case creation, case reuse, staff permissions and counselor visibility. Test accounts rolled back; none remain. Frontend production build passed. Android debug build and APK signature verification passed. Firebase provider status on the running backend returned enabled. Device testing remains as described above.
