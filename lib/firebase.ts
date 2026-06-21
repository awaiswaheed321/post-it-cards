import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig, recaptchaSiteKey } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check attests requests come from the real app (anti-abuse). Browser-only,
// and only once a reCAPTCHA site key is configured — so the app keeps working
// before App Check is set up, and is protected the moment the key is provided.
if (typeof window !== 'undefined' && recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    /* already initialized (HMR) or unavailable — ignore */
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
