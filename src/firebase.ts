import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDO3FIJxdisijuaWYyS0cVpfg-gYfTNvIU",
  authDomain: "bku-5a8af.firebaseapp.com",
  projectId: "bku-5a8af",
  storageBucket: "bku-5a8af.firebasestorage.app",
  messagingSenderId: "197206940755",
  appId: "1:197206940755:web:756061a476fc9579157aa6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Add this line to log authentication state changes (for debugging)
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User is signed in with UID:', user.uid);
  } else {
    console.log('User is signed out');
  }
});

// Optionally connect to emulators when in development environment
if (import.meta.env.DEV) {
  try {
    // Only connect to emulators if they're running - comment these out if not using emulators
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.error("Error connecting to emulators:", error);
  }
}

// This function can be used to verify if a user has the right permissions
export const checkUserPermissions = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated. Please log in again.');
  }
  
  return {
    uid: user.uid,
    email: user.email
  };
};
