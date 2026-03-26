import React, { Suspense, lazy, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SUPER_ADMIN_EMAILS } from './constants';
import LoadingScreen from './components/LoadingScreen';
import { motion } from 'motion/react';
import { LogOut, AlertCircle } from 'lucide-react';

import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
const AdminPanel = lazy(() => import('./AdminPanel'));

function AdminAppContent() {
  const { user, userProfile, loading, signOut } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Login />;
  }
  
  if (!userProfile) {
    return <ProfileSetup />;
  }
  
  if (!userProfile.isActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-none border-2 border-slate-200 shadow-2xl max-w-md text-center">
          <h1 className="text-2xl font-black text-red-600 mb-4 uppercase tracking-tighter">অ্যাকাউন্ট নিষ্ক্রিয়</h1>
          <p className="text-slate-500 font-bold mb-6">আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় অবস্থায় আছে। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-widest text-xs"
          >
            আবার চেষ্টা করুন
          </button>
          {user?.email && SUPER_ADMIN_EMAILS.includes(user.email) && (
            <button 
              onClick={async () => {
                if (!user) return;
                try {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  const { db } = await import('./lib/firebase');
                  await updateDoc(doc(db, 'users', user.uid), {
                    role: 'super-admin',
                    isActive: true
                  });
                  window.location.reload();
                } catch (e) {
                  console.error(e);
                  alert('Failed to fix account.');
                }
              }}
              className="mt-4 px-8 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-xs"
            >
              Fix Account (Admin Only)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AdminPanel />
    </Suspense>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminAppContent />
    </AuthProvider>
  );
}
