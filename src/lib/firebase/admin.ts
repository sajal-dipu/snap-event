import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

let app;

if (getApps().length === 0) {
  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    // Fallback to local default initialization if credentials are not in environment
    app = initializeApp({
      projectId: projectId || "photo-pro-booking",
    });
  }
} else {
  app = getApp();
}

export const adminApp = app;
export const adminDb = getFirestore(app);
