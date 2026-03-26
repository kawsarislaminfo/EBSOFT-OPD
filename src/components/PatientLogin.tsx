import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Activity, ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PatientLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [hospitalNumber, setHospitalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Convert hospital number to a dummy email for Firebase Auth
    const normalizedHN = hospitalNumber.trim().toUpperCase();
    const email = `${normalizedHN.toLowerCase()}@hospital.com`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create patient profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name,
          hospitalNumber: normalizedHN,
          email: email,
          username: normalizedHN,
          role: 'patient',
          isActive: true,
          createdAt: serverTimestamp(),
          permissions: {
            canCreateSerial: false,
            canEditSerial: false,
            canDeleteSerial: false,
            canViewPatientReports: false,
            canManageDoctors: false,
            canManageSettings: false
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('নেটওয়ার্ক সমস্যা! দয়া করে আপনার ইন্টারনেট সংযোগ চেক করুন অথবা Firebase কনসোলে এই ডোমেইনটি (Authorized Domain) যোগ করা আছে কিনা নিশ্চিত করুন।');
      } else if (err.code === 'auth/invalid-credential') {
        setError('প্রদত্ত তথ্যগুলো সঠিক নয়। দয়া করে আবার চেক করুন। (Error: auth/invalid-credential)');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('এই হসপিটাল নম্বরটি ইতিমধ্যে নিবন্ধিত।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ইমেইল/পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করা বন্ধ আছে। দয়া করে Firebase কনসোলে (Authentication > Sign-in method) গিয়ে Email/Password চালু করুন।');
      } else {
        setError(err.message || 'অথেনটিকেশন ব্যর্থ হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white p-8 md:p-10 rounded-none border-2 border-slate-200 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-none flex items-center justify-center shadow-xl mb-4">
              <Activity size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">পেশেন্ট পোর্টাল</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
              {isLogin ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">আপনার নাম</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold"
                    placeholder="পুরো নাম লিখুন"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">হাসপাতাল নাম্বার (Hospital Number)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  required
                  value={hospitalNumber}
                  onChange={(e) => setHospitalNumber(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold"
                  placeholder="যেমন: H1234567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/20"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  <span>{isLogin ? 'লগইন করুন' : 'রেজিস্ট্রেশন করুন'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-slate-50 flex flex-col items-center gap-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors"
            >
              {isLogin ? 'অ্যাকাউন্ট নেই? রেজিস্ট্রেশন করুন' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন'}
            </button>
            
            <button 
              onClick={() => window.location.hash = ''}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={14} />
              ফিরে যান
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
