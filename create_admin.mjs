import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrtu8Xj284HFB4EJ1_S7AJBJE13aiRq7Q",
  authDomain: "photo-pro-booking.firebaseapp.com",
  projectId: "photo-pro-booking",
  storageBucket: "photo-pro-booking.firebasestorage.app",
  messagingSenderId: "404805034852",
  appId: "1:404805034852:web:bed2c0414d871fe030d071",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = "sajusonaidipu@gmail.com";
  const password = "Sonai@Babi#0904";

  console.log(`Attempting to sign in default admin: ${email}`);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log(`Firebase Auth login succeeded. UID: ${uid}`);

    await setDoc(doc(db, "admins", uid), {
      uid: uid,
      email: email,
      name: "Administrator",
      role: "admin",
      isActive: true,
      firstLogin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: null,
      passwordChangedAt: null,
    });

    console.log(`Firestore admin document created successfully in admins/${uid}`);
  } catch (err) {
    console.error("Failed to login/create admin document:", err);
  }
}

run();
