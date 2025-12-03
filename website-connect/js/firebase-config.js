/* ============================================
   BestBuddies Pet Grooming - Firebase Configuration
   ============================================ */

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBK-ApnOyDO-6MvWQGT74BNTVs6cEKSmf0",
  authDomain: "testing-6398b.firebaseapp.com",
  databaseURL: "https://testing-6398b-default-rtdb.firebaseio.com",
  projectId: "testing-6398b",
  storageBucket: "testing-6398b.firebasestorage.app",
  messagingSenderId: "390361432944",
  appId: "1:390361432944:web:ccb062e5ca6fa422f405b5",
  measurementId: "G-MC4J70EH8C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Make Firebase services globally available
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseAnalytics = analytics;

console.log('Firebase initialized successfully');

