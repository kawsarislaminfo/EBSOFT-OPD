import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { Loader2, ShieldCheck, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ProfileSetup() {
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user?.email) {
      // Default username from email if not provided
      setUsername(user.email.split('@')[0]);
    }
  }, [user]);

  useEffect(() => {
    const checkFirstUser = async () => {
      try {
        const q = query(collection(db, 'users'), limit(1));
        const snapshot = await getDocs(q);
        setIsFirstUser(snapshot.empty);
      } catch (error) {
        console.error("Error checking first user:", error);
        // If we can't check, assume it's not the first user for safety
        setIsFirstUser(false);
      }
    };
    checkFirstUser();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isFirstUser === null) return;

    setLoading(true);
    try {
      const cleanUsername = username.toLowerCase().trim();
      
      if (!cleanUsername) {
        showToast('ইউজারনেম প্রদান করা আবশ্যক।', 'error');
        setLoading(false);
        return;
      }

      const usernameRegex = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
      if (!usernameRegex.test(cleanUsername)) {
        showToast('ইউজারনেমে শুধুমাত্র অক্ষর, সংখ্যা, ডট (.), আন্ডারস্কোর (_) এবং হাইফেন (-) ব্যবহার করা যাবে।', 'error');
        setLoading(false);
        return;
      }

      const isSuperAdminEmail = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
      const userRole: 'super-admin' | 'admin' | 'staff' | 'patient' = isSuperAdminEmail ? 'super-admin' : (isFirstUser ? 'admin' : 'staff');

      const userProfile: UserProfile = {
        uid: user.uid,
        name: name,
        email: user.email || '',
        username: cleanUsername,
        verifiedBadge: 'none',
        role: userRole,
        permissions: (userRole === 'super-admin' || userRole === 'admin') ? {
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
        } : {
          canViewOverview: true,
          canViewDashboard: true,
          canViewOpdDashboard: true,
          canViewRegistration: true,
          canCreateSerial: true,
          canEditSerial: true,
          canDeleteSerial: false,
          canViewLive: true,
          canViewDoctors: true,
          canManageDoctors: false,
          canViewPatients: true,
          canManagePatients: false,
          canViewPatientReports: true,
          canViewActivityLogs: false,
          canManageSettings: false,
          canManageUsers: false,
          canViewProfile: true,
          canManageProcedures: false,
          canManageDepartments: false,
          canViewDoctorToday: true,
          canViewDoctorSchedule: true,
          canManageHospitalProfile: false,
          canManageDisplaySettings: false,
          canManagePatientPortal: false,
          canManageMobileNav: false,
          canManageWelcomePopup: false,
          canManageLoginPage: false,
          canViewAnalytics: false,
          canExportData: false,
          canManageBackup: false,
          canManagePushNotifications: false,
          canViewSystemStatus: false,
          canManageAppAppearance: false,
          canEditOpdSummary: false
        },
        createdAt: serverTimestamp(),
        isActive: (isFirstUser || isSuperAdminEmail) // First user or Super Admin is active by default
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      showToast('প্রোফাইল সফলভাবে সেটআপ হয়েছে!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      showToast('প্রোফাইল সেটআপ করা সম্ভব হয়নি।', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isFirstUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-none border-2 border-slate-200 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-600 flex items-center justify-center text-white shadow-xl mb-6">
            <UserIcon size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">প্রোফাইল সেটআপ</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 text-center">
            {isFirstUser 
              ? 'আপনি এই সিস্টেমের প্রথম ব্যবহারকারী। আপনি অ্যাডমিন হিসেবে নিবন্ধিত হবেন।' 
              : 'আপনার প্রোফাইলটি সম্পূর্ণ করুন। অ্যাডমিন অনুমোদন করলে আপনি ড্যাশবোর্ড ব্যবহার করতে পারবেন।'}
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">আপনার নাম</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
              placeholder="আপনার পূর্ণ নাম লিখুন"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজারনেম (Username)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
              placeholder="যেমন: admin"
              required
              disabled={!isFirstUser} // Only allow first user to change username during setup if they want, others use what admin gave them
            />
            <p className="text-[9px] font-bold text-slate-400 italic ml-1">
              * এটি আপনার প্রোফাইল আইডি হিসেবে ব্যবহৃত হবে।
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                প্রোফাইল সংরক্ষণ করুন
                <ShieldCheck size={20} />
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={signOut}
            className="w-full py-3 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600"
          >
            লগআউট করুন
          </button>
        </form>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] border",
              toast.type === 'success' ? "bg-emerald-500 text-white border-emerald-400" :
              toast.type === 'error' ? "bg-red-500 text-white border-red-400" :
              "bg-blue-600 text-white border-blue-500"
            )}
          >
            {toast.type === 'success' ? <ShieldCheck size={20} /> : 
             toast.type === 'error' ? <AlertCircle size={20} /> : 
             <UserIcon size={20} />}
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
