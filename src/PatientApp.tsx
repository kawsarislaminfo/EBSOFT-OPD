import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';

const PatientLogin = lazy(() => import('./components/PatientLogin'));
const PatientDashboard = lazy(() => import('./PatientDashboard'));

function PatientAppContent() {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PatientLogin />
      </Suspense>
    );
  }
  
  // If user is logged in but not a patient (e.g. admin), we might want to redirect or show a message
  // But for now let's assume if they are in #patient they want to see patient dashboard
  
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PatientDashboard />
    </Suspense>
  );
}

export default function PatientApp() {
  return (
    <AuthProvider>
      <PatientAppContent />
    </AuthProvider>
  );
}
