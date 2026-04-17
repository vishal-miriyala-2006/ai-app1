import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCulFheG7hWs5gwmSkxY3pAuQ7l-hBJohk",
  authDomain: "ai-study-assisstant.firebaseapp.com",
  projectId: "ai-study-assisstant",
  storageBucket: "ai-study-assisstant.firebasestorage.app",
  messagingSenderId: "225884951691",
  appId: "1:225884951691:web:1659b0417e490e9322708e"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
