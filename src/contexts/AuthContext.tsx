import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import LoadingScreen from '../components/LoadingScreen';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
}

import { SUPER_ADMIN_EMAILS } from '../constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Sync user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const docSnap = await getDoc(userDocRef);
          const isSuperAdminEmail = firebaseUser.email && SUPER_ADMIN_EMAILS.includes(firebaseUser.email);

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Ensure super admin emails are always super-admin and active
            if (isSuperAdminEmail && (data.role !== 'super-admin' || data.isActive !== true)) {
              console.log("Updating super-admin profile for:", firebaseUser.email);
              updateDoc(userDocRef, { 
                role: 'super-admin',
                isActive: true 
              })
                .catch(err => {
                  if (!err.message?.includes('offline') && !err.message?.includes('unavailable')) {
                    console.error("Error updating super-admin role/status:", err);
                  }
                });
            }
          } else if (isSuperAdminEmail) {
            // Auto-create profile for super admin if it doesn't exist
            console.log("Auto-creating super-admin profile for:", firebaseUser.email);
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              username: firebaseUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
              role: 'super-admin',
              isActive: true,
              verifiedBadge: 'none',
              createdAt: new Date().toISOString() as any, // Will be updated by serverTimestamp if we used it, but this is a fallback
              permissions: {
                canViewOverview: true,
                canViewDashboard: true,
                canViewOpdDashboard: true,
                canViewRegistration: true,
                canCreateSerial: true,
                canEditSerial: true,
                canDeleteSerial: true,
                canViewLive: true,
                canViewDoctors: true,
                canManageDoctors: true,
                canViewPatients: true,
                canManagePatients: true,
                canViewPatientReports: true,
                canViewActivityLogs: true,
                canManageSettings: true,
                canManageUsers: true,
                canViewProfile: true,
                canManageProcedures: true,
                canManageDepartments: true,
                canViewDoctorToday: true,
                canViewDoctorSchedule: true,
                canManageHospitalProfile: true,
                canManageDisplaySettings: true,
                canManagePatientPortal: true,
                canManageMobileNav: true,
                canManageWelcomePopup: true,
                canManageLoginPage: true,
                canViewAnalytics: true,
                canExportData: true,
                canManageBackup: true,
                canManagePushNotifications: true,
                canViewSystemStatus: true,
                canManageAppAppearance: true,
                canEditOpdSummary: true
              }
            };
            
            setDoc(userDocRef, newProfile)
              .catch(err => console.error("Error auto-creating super-admin profile:", err));
          }
        } catch (err: any) {
          if (!err.message?.includes('offline') && !err.message?.includes('unavailable')) {
            console.error("Error syncing user profile:", err);
          }
        }

        // Listen to user profile changes in Firestore
        
        // Use onSnapshot directly. It handles offline state gracefully by 
        // returning cached data if available and waiting for a connection.
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          // If it's a permission error or something fatal, stop loading
          // Otherwise (like 'unavailable' which means offline), we might want to wait
          // but for UX we'll stop loading after a timeout or just set null.
          setUserProfile(null);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signOut = async () => {
    if (userProfile?.uid) {
      sessionStorage.removeItem(`welcome_popup_seen_${userProfile.uid}`);
    }
    await firebaseSignOut(auth);
  };

  // Override userProfile if it's a super admin but profile is missing or inactive in state
  const effectiveUserProfile = (user?.email && SUPER_ADMIN_EMAILS.includes(user.email)) 
    ? { 
        ...(userProfile || { 
          uid: user.uid, 
          name: user.displayName || user.email.split('@')[0], 
          email: user.email, 
          username: user.email.split('@')[0],
          role: 'super-admin',
          isActive: true,
          verifiedBadge: 'none' as const,
          permissions: {} as any
        }), 
        role: 'super-admin' as const, 
        isActive: true 
      } 
    : userProfile;

  const isSuperAdmin = effectiveUserProfile?.role === 'super-admin' || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email)) || false;
  const isAdmin = effectiveUserProfile?.role === 'admin' || isSuperAdmin;

  return (
    <AuthContext.Provider value={{ user, userProfile: effectiveUserProfile, loading, isAdmin, isSuperAdmin, signOut }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
