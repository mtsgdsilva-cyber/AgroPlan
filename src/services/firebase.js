// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // NOVO: Importando a Autenticação

const firebaseConfig = {
  apiKey: "AIzaSyCU4_8j4traup1mgL9IBwHFWkv3lw_DFHA",
  authDomain: "agroplan-9fc95.firebaseapp.com",
  projectId: "agroplan-9fc95",
  storageBucket: "agroplan-9fc95.firebasestorage.app",
  messagingSenderId: "65209355993",
  appId: "1:65209355993:web:c08be44849dbf86321b8c8"
};

// Inicializa o aplicativo Firebase
const app = initializeApp(firebaseConfig);

// Mantém a sua excelente configuração de cache offline para PWA!
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Inicializa a autenticação
const auth = getAuth(app);

// Exporta o Banco de Dados e a Autenticação para usarmos no app
export { db, auth };