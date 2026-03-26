import React, { useState, useEffect, Suspense, lazy } from 'react';
import { isConfigured as isFirebaseConfigured, getMissingVars } from './lib/firebase';
import LoadingScreen from './components/LoadingScreen';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

const PublicDisplay = lazy(() => import('./PublicDisplay'));
const AdminApp = lazy(() => import('./AdminApp'));
const PatientApp = lazy(() => import('./PatientApp'));

function AppContent() {
  const [view, setView] = useState('public'); // 'public' or 'admin'
  const { settings } = useSettings();

  // Global settings listener for title and favicon
  useEffect(() => {
    if (!settings) return;
    
    // Update document title
    if (settings.websiteTitle) {
      document.title = settings.websiteTitle;
    }

    // Update favicon
    if (settings.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.favicon;
    }

    // Update base font size
    if (settings.baseFontSize) {
      document.documentElement.style.fontSize = `${settings.baseFontSize}px`;
    }

    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [settings]);

  // Simple routing based on URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setView('admin');
      } else if (hash === '#patient') {
        setView('patient');
      } else {
        setView('public');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check hash on initial load
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {view === 'admin' ? <AdminApp /> : view === 'patient' ? <PatientApp /> : <PublicDisplay />}
    </Suspense>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
          <h1 className="text-2xl font-bold mb-4 text-blue-400">Firebase Setup Required</h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            এই অ্যাপটি চালানোর জন্য আপনার একটি Firebase প্রজেক্ট প্রয়োজন। আপনি যদি ইতিমধ্যে Firebase সেটআপ শুরু করে থাকেন, তবে দয়া করে কিছুক্ষণ অপেক্ষা করুন। যদি সমস্যাটি রয়ে যায়, তবে নিচের ধাপগুলো অনুসরণ করুন:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm text-slate-300 mb-8">
            <li>Firebase Console-এ একটি প্রজেক্ট তৈরি করুন।</li>
            <li>Firestore Database এবং Authentication চালু করুন।</li>
            <li>প্রজেক্ট সেটিংস থেকে Web App যোগ করুন।</li>
            <li>প্রাপ্ত API Key এবং অন্যান্য তথ্য <code className="bg-slate-900 px-2 py-1 rounded text-pink-400">.env</code> ফাইলে যোগ করুন।</li>
            <li>Netlify-তে নিচের ভেরিয়েবলগুলো যোগ করুন:
              <div className="mt-2 p-2 bg-slate-900 rounded text-[10px] font-mono break-all text-pink-300">
                {getMissingVars().join(', ')}
              </div>
            </li>
            <li>Firebase Console-এ Authentication {'->'} Settings {'->'} Authorized Domains-এ গিয়ে নিচের ডোমেইনগুলো যোগ করুন:
              <div className="mt-2 p-2 bg-slate-900 rounded text-[10px] font-mono break-all text-blue-300">
                {window.location.hostname}
              </div>
            </li>
          </ol>
          <div className="p-4 bg-blue-900/30 border border-blue-500/30 rounded-xl text-xs text-blue-200">
            <strong>নোট:</strong> আপনি যদি AI Studio-তে থাকেন, তবে "Secrets" প্যানেলে এই ভেরিয়েবলগুলো যোগ করুন।
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </div>
  );
}
