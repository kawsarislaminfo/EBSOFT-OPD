import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

import { getDocFromServer, doc } from 'firebase/firestore';
import { db } from './lib/firebase';

// Test Firestore connection on boot
async function testConnection() {
  if (!db) {
    console.log("Firestore connection test skipped: db is null.");
    return;
  }
  try {
    console.log("Testing Firestore connection...");
    // Attempt to fetch a non-existent document from the server
    // to verify connectivity.
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection verified.");
  } catch (error) {
    // If it's a "not-found" error, it actually means we ARE connected
    // because the server responded that the document doesn't exist.
    if (error instanceof Error && error.message.includes('not-found')) {
      console.log("Firestore connection verified (document not found).");
      return;
    }

    console.warn("Firestore connection test notice:", error);
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable'))) {
      console.warn("Firestore connection notice: The client is currently offline or the connection is pending.");
    }
  }
}

testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
