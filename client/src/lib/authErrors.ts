export function getAuthErrorMessage(err: any): string {
  if (!err) return 'An unknown error occurred.';
  
  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/unauthorized-domain': {
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
      return `Domain "${currentDomain}" is not authorized for Google Sign-In in Firebase. Please add "${currentDomain}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled in Firebase. Please go to Firebase Console -> Authentication -> Sign-in method -> Google and click "Enable".';
    case 'auth/configuration-not-found':
      return 'Google Sign-In configuration not found in Firebase. Please enable the Google provider in Firebase Console.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled (popup window was closed).';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address using a different login method.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Please check your Firebase configuration in .env.';
    case 'auth/network-request-failed':
      return 'Network request failed. Please check your internet connection or proxy settings.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}
