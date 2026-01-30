import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { firebaseConfig } from './firebase';

let app: FirebaseApp;
let database: Database;

// Initialize Firebase
export const initFirebase = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);

    // Note: Using live Firebase database for cross-device WebRTC signaling
    // Emulator only works locally, but we need cross-device connectivity
    console.log('Connected to Firebase Database (live)');
  } else {
    app = getApps()[0];
    database = getDatabase(app);
  }
  return { app, database };
};
