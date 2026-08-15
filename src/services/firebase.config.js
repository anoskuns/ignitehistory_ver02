// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjFYHTUJMqqDCjsLa9Wm_q_uqlrAA2dAM",
  authDomain: "ignite-history.firebaseapp.com",
  databaseURL: "https://ignite-history-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ignite-history",
  storageBucket: "ignite-history.firebasestorage.app",
  messagingSenderId: "76498385797",
  appId: "1:76498385797:web:b88d7a7853605f410ee2ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

export default app;