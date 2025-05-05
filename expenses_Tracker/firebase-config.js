// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYS6UBDXjb7-birw1X9nBXYaA9injljD4",
  authDomain: "expenses-tracker-92a41.firebaseapp.com",
  projectId: "expenses-tracker-92a41",
  storageBucket: "expenses-tracker-92a41.appspot.com",
  messagingSenderId: "272901523087",
  appId: "1:272901523087:web:b58e473a7a1143f7e992fa",
  measurementId: "G-G5E6DBSSL8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };