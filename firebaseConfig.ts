// Configuração central do Firebase.
// Todas as telas devem importar 'auth' e 'db' DAQUI, em vez de configurar o Firebase de novo em cada arquivo.

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAWazI-JuYczG2VWKmuFabWeNMZRL9bHYc",
  authDomain: "health-sync-projeto.firebaseapp.com",
  projectId: "health-sync-projeto",
  storageBucket: "health-sync-projeto.firebasestorage.app",
  messagingSenderId: "859705816378",
  appId: "1:859705816378:web:27a4d391a994921f1e4c03"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

const usarEmuladores = __DEV__ && Platform.OS === 'web';

if (usarEmuladores) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
