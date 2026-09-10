import webDefaults from './firebase.web.json'
// Public Firebase web settings only. Admin credentials must stay on the server.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || webDefaults.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || webDefaults.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || webDefaults.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || webDefaults.appId,
}
export const firebaseConfigured = Object.values(config).every(Boolean)
let ready
export function firebaseClient() {
  if (!firebaseConfigured) return Promise.reject(new Error('Google and phone sign-in are not available yet. Please use email.'))
  if (!ready) ready = Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, sdk]) => {
    const existing = app.getApps().find(a => a.name === 'synora-client')
    const instance = existing || app.initializeApp(config, 'synora-client')
    const auth = existing
      ? sdk.getAuth(instance)
      : sdk.initializeAuth(instance, { persistence: sdk.inMemoryPersistence, popupRedirectResolver: sdk.browserPopupRedirectResolver })
    return { auth, sdk }
  }).catch(e => { ready = undefined; throw e })
  return ready
}
export function providerMessage(error) {
  const messages = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled. You can try again whenever you’re ready.',
    'auth/cancelled-popup-request': 'A sign-in window is already open.',
    'auth/popup-blocked': 'Allow pop-ups for this site, then try Google again.',
    'auth/invalid-phone-number': 'Enter a valid phone number with its country code, such as +91.',
    'auth/invalid-verification-code': 'That code doesn’t match. Check the SMS and try again.',
    'auth/code-expired': 'This code has expired. Request a new code.',
    'auth/session-expired': 'This code has expired. Request a new code.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/quota-exceeded': 'SMS sign-in is temporarily unavailable. Please try again later.',
    'auth/captcha-check-failed': 'Please complete the verification challenge and try again.',
    'auth/network-request-failed': 'Check your connection and try again.',
    'auth/unauthorized-domain': 'Sign-in is not enabled for this website yet. Please use email.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled yet. Please use email.',
    'auth/account-exists-with-different-credential': 'Use the sign-in method already associated with this account.',
  }
  return messages[error.code] || error.response?.data?.message || 'Sign-in could not be completed. Please try again.'
}
