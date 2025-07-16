  // src/lib/firebase.ts
  import { initializeApp, getApps, getApp } from "firebase/app";
  import { getAuth } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";

  export const firebaseConfig = {
    apiKey: "AIzaSyBUPJmWlC0O_bbCDBw23gqLnZhszf1ymg0",
    authDomain: "automanager-wuvrw.firebaseapp.com",
    projectId: "automanager-wuvrw",
    storageBucket: "automanager-wuvrw.firebasestorage.app",
    messagingSenderId: "32740380338",
    appId: "1:32740380338:web:f5b1f068c2ec8ce69e83ab",
    measurementId: "G-306V0TD0YB"
  };

  // Initialize Firebase
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  export { app, auth, db };
