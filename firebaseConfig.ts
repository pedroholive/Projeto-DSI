
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Configuração central do Firebase.
// Todas as telas devem importar auth, db e functions deste arquivo.

const firebaseConfig = {
  apiKey: 'AIzaSyAWazI-JuYczG2VWKmuFabWeNMZRL9bHYc',
  authDomain: 'health-sync-projeto.firebaseapp.com',
  projectId: 'health-sync-projeto',
  storageBucket: 'health-sync-projeto.firebasestorage.app',
  messagingSenderId: '859705816378',
  appId: '1:859705816378:web:27a4d391a994921f1e4c03',
};

// Evita inicializar o Firebase mais de uma vez.
export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

// Autenticação
export const auth = getAuth(app);

// Banco de dados
export const db = getFirestore(app);

// Cloud Functions
export const functions = getFunctions(app, 'us-central1');
