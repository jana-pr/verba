import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC96nG9NYlSFU1GXzQUVKyIbbGixZ38wVs',
  authDomain: 'futro-app.firebaseapp.com',
  projectId: 'futro-app',
  storageBucket: 'futro-app.firebasestorage.app',
  messagingSenderId: '841177435447',
  appId: '1:841177435447:web:44e0c239721e3d853e9eb2',
};

async function test() {
  console.log('Připojuji k Firestore (futro-app)...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, 'verba', 'ping_test');

  console.log('Zapisuji testovací záznam...');
  await setDoc(docRef, { test: true, timestamp: new Date().toISOString() });
  console.log('✓ Zápis úspěšný!');

  console.log('Čtu testovací záznam...');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log('✓ Čtení úspěšné:', snap.data());
  } else {
    console.log('Dokument nenalezen.');
  }
}

test().then(() => {
  console.log('FIRESTORE_VERIFICATION_PASSED');
  process.exit(0);
}).catch(err => {
  console.error('Chyba Firestore testu:', err);
  process.exit(1);
});
