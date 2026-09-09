#!/bin/sh
set -eu
# Enable USB debugging on the phone and accept its computer authorization prompt.
adb get-state
adb reverse tcp:5173 tcp:5173
adb install -r "$(dirname "$0")/app/build/outputs/apk/debug/app-debug.apk"
adb shell am start -n com.synora.mobile.local/com.google.androidbrowserhelper.trusted.LauncherActivity
