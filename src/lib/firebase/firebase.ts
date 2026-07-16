import { initializeApp, getApps, getApp } from "firebase/app";
import { validateFirebaseEnv } from "../validation/envValidation";

// Run Firebase client checks on boot
validateFirebaseEnv();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialization on Next.js Hot Module Replacement (HMR) or SSR
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export default app;
