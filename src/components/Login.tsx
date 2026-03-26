import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db, signInWithPopup } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  AlertCircle, 
  ChevronRight,
  Hospital,
  UserPlus,
  LogIn,
  User as UserIcon,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Phone
} from 'lucide-react';
import GlobalLoader from './GlobalLoader';
import { cn } from '../lib/utils';
import { AppSettings } from '../types';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginId, setLoginId] = useState(''); // For login
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isRegistering || !username) {
      setIsUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()), limit(1));
        const snapshot = await getDocs(q);
        setIsUsernameAvailable(snapshot.empty);
      } catch (err) {
        console.error("Error checking username:", err);
        setIsUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [username, isRegistering]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!auth) {
      setError('Firebase Authentication সিস্টেমটি সঠিকভাবে লোড হয়নি। দয়া করে পেজটি রিফ্রেশ করুন।');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name || !email || !phone || !username || !password) {
          setError('সবগুলো তথ্য প্রদান করা আবশ্যক।');
          setLoading(false);
          return;
        }

        if (isUsernameAvailable === false) {
          setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে। অন্য একটি চেষ্টা করুন।');
          setLoading(false);
          return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', res.user.uid), {
          uid: res.user.uid,
          name: name,
          email: email,
          phone: phone,
          username: username.toLowerCase().trim(),
          role: 'staff', // Default role for new signups
          isActive: true,
          createdAt: serverTimestamp(),
          permissions: {
            canViewDashboard: true,
            canCreateSerial: true,
            canEditSerial: false,
            canDeleteSerial: false,
            canViewPatientReports: false,
            canManageDoctors: false,
            canManageSettings: false
          }
        });

        showToast('রেজিস্ট্রেশন সফল হয়েছে।', 'success');
      } else {
        const cleanLoginId = loginId.toLowerCase().trim();
        
        if (!cleanLoginId || !password) {
          setError('ইউজারনেম/ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করা আবশ্যক।');
          setLoading(false);
          return;
        }

        let loginEmail = cleanLoginId;

        // If it's not an email (doesn't contain @), assume it's a username
        if (!cleanLoginId.includes('@')) {
          try {
            const docRef = doc(db, 'usernames', cleanLoginId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              setError('এই ইউজারনেমটি খুঁজে পাওয়া যায়নি।');
              setLoading(false);
              return;
            } else {
              const userData = docSnap.data();
              loginEmail = userData.email;
            }
          } catch (err: any) {
            console.error("Error looking up username:", err);
            if (err.code === 'permission-denied') {
              setError('ইউজারনেম যাচাই করার অনুমতি নেই। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।');
            } else {
              setError('ইউজারনেম যাচাই করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
            }
            setLoading(false);
            return;
          }
        }
        
        await signInWithEmailAndPassword(auth, loginEmail, password);
      }
    } catch (err: any) {
      console.error(err);
      if (isRegistering) {
        if (err.code === 'auth/email-already-in-use') {
          setError('এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে। অন্য একটি চেষ্টা করুন।');
        } else if (err.code === 'auth/weak-password') {
          setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
        } else if (err.code === 'auth/network-request-failed') {
          setError('নেটওয়ার্ক সমস্যা! দয়া করে আপনার ইন্টারনেট সংযোগ চেক করুন অথবা Firebase কনসোলে এই ডোমেইনটি (Authorized Domain) যোগ করা আছে কিনা নিশ্চিত করুন।');
        } else if (err.code === 'auth/invalid-credential') {
          setError('প্রদত্ত তথ্যগুলো সঠিক নয়। দয়া করে আবার চেক করুন।');
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('ইমেইল/পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করা বন্ধ আছে। দয়া করে Firebase কনসোলে (Authentication > Sign-in method) গিয়ে Email/Password চালু করুন।');
        } else {
          setError('অ্যাকাউন্ট তৈরি করা সম্ভব হয়নি। ' + (err.code || err.message));
        }
      } else {
        if (err.code === 'auth/network-request-failed') {
          setError('নেটওয়ার্ক সমস্যা! দয়া করে আপনার ইন্টারনেট সংযোগ চেক করুন।');
        } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError('লগইন আইডি বা পাসওয়ার্ড ভুল হয়েছে। আপনি কি ইতিমধ্যে রেজিস্ট্রেশন করেছেন? যদি না করে থাকেন, তবে আগে রেজিস্ট্রেশন করুন। (Error: auth/invalid-credential)');
        } else {
          setError('লগইন করতে সমস্যা হয়েছে: ' + (err.code || err.message));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const cleanLoginId = loginId.toLowerCase().trim();
    if (!cleanLoginId) {
      setError('পাসওয়ার্ড রিসেট করতে ইউজারনেম বা ইমেইল প্রদান করা আবশ্যক।');
      setLoading(false);
      return;
    }

    let email = cleanLoginId;
    if (!cleanLoginId.includes('@')) {
      try {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const q = query(collection(db, 'users'), where('username', '==', cleanLoginId), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          email = `${cleanLoginId}@hospital.com`;
        } else {
          email = snapshot.docs[0].data().email;
        }
      } catch (err) {
        console.error(err);
      }
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      setError('পাসওয়ার্ড রিসেট ইমেইল পাঠানো সম্ভব হয়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Side - Branding & Info */}
      <div 
        className="hidden md:flex md:w-1/2 lg:w-3/5 relative items-center justify-center p-12 overflow-hidden"
        style={{ backgroundColor: settings?.loginSettings?.bgColor || '#0f172a' }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[150px]"
            style={{ backgroundColor: settings?.loginSettings?.accentColor || '#3b82f6' }}
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-emerald-500 rounded-full blur-[150px]"
          />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {settings?.loginSettings?.showBranding !== false && (
              <div className="flex items-center gap-4 mb-8">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl"
                  style={{ backgroundColor: settings?.loginSettings?.accentColor || '#2563eb' }}
                >
                  <Hospital size={32} />
                </div>
                <div className="h-10 w-px bg-white/20" />
                <p 
                  className="font-black text-xs uppercase tracking-[0.4em]"
                  style={{ color: settings?.loginSettings?.accentColor || '#60a5fa' }}
                >
                  {settings?.loginSettings?.subtitle || 'Smart Healthcare'}
                </p>
              </div>
            )}
            
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-8 tracking-tighter">
              {settings?.loginSettings?.title ? (
                <div dangerouslySetInnerHTML={{ __html: settings.loginSettings.title }} />
              ) : (
                <>
                  আধুনিক <span className="text-blue-500">হাসপাতাল</span><br />
                  ম্যানেজমেন্ট সিস্টেম
                </>
              )}
            </h1>
            
            <p className="text-slate-400 text-lg lg:text-xl font-medium leading-relaxed mb-12 max-w-lg">
              {settings?.loginSettings?.description || 'রিয়েল-টাইম পেশেন্ট কিউ এবং ডক্টর সিরিয়াল ম্যানেজমেন্টের মাধ্যমে আপনার হাসপাতালের সেবাকে করুন আরও গতিশীল ও উন্নত।'}
            </p>

            <div className="grid grid-cols-2 gap-8">
              {(settings?.loginSettings?.features || [
                { label: 'রিয়েল-টাইম আপডেট', icon: '⚡' },
                { label: 'অ্যাডমিন কন্ট্রোল', icon: '🛡️' },
                { label: 'পাবলিক ডিসপ্লে', icon: '📺' },
                { label: 'সহজ সিরিয়াল', icon: '📝' }
              ]).map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all">
                    {item.icon}
                  </div>
                  <span className="text-slate-300 font-bold text-sm uppercase tracking-widest">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Bottom Info */}
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
          <span>{settings?.loginSettings?.versionText || 'Version 2.0.4'}</span>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-slate-50 relative">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full"
        >
          <div className="bg-white p-10 md:p-12 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 relative overflow-hidden">
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-emerald-500" />

            <div className="mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                {isRegistering ? 'নতুন অ্যাকাউন্ট' : 'স্বাগতম ফিরে এসেছেন!'}
              </h2>
              <p className="text-slate-500 font-bold text-sm">
                {isRegistering ? 'সিস্টেমে যুক্ত হতে আপনার তথ্য দিন' : 'আপনার অ্যাকাউন্টে লগইন করুন'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!showForgot ? (
                <motion.div 
                  key={isRegistering ? "register" : "login"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <form onSubmit={handleAuth} className="space-y-5">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-shake">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                      </div>
                    )}

                    {isRegistering ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">নাম</label>
                          <div className="relative">
                            <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="text" 
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                              placeholder="আপনার পুরো নাম"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল</label>
                          <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                              placeholder="email@example.com"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ফোন নাম্বার</label>
                          <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="tel" 
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                              placeholder="01XXXXXXXXX"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজারনেম</label>
                          <div className="relative">
                            <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="text" 
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className={cn(
                                "w-full pl-14 pr-12 py-4 bg-slate-50 border rounded-2xl outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300",
                                isUsernameAvailable === true ? "border-emerald-500 focus:border-emerald-500 focus:bg-white" :
                                isUsernameAvailable === false ? "border-red-500 focus:border-red-500 focus:bg-white" :
                                "border-slate-200 focus:border-blue-500 focus:bg-white"
                              )}
                              placeholder="username"
                              required
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                              {checkingUsername ? (
                                <Loader2 className="animate-spin text-blue-500" size={18} />
                              ) : isUsernameAvailable === true ? (
                                <Check className="text-emerald-500" size={18} />
                              ) : isUsernameAvailable === false ? (
                                <X className="text-red-500" size={18} />
                              ) : null}
                            </div>
                          </div>
                          {isUsernameAvailable === false && (
                            <p className="text-xs text-red-500 font-bold ml-1 mt-1">এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে।</p>
                          )}
                          {isUsernameAvailable === true && (
                            <p className="text-xs text-emerald-500 font-bold ml-1 mt-1">ইউজারনেমটি available আছে!</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজারনেম বা ইমেইল</label>
                        <div className="relative">
                          <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                            placeholder="admin বা email@example.com"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                        {!isRegistering && (
                          <button 
                            type="button"
                            onClick={() => setShowForgot(true)}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                          >
                            ভুলে গেছেন?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/10"
                    >
                      {loading ? <GlobalLoader size="sm" className="mx-auto" /> : (
                        <>
                          <span>{isRegistering ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}</span>
                          <ChevronRight size={18} />
                        </>
                      )}
                    </button>
                  </form>

                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                    }}
                    className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-blue-600 transition-colors"
                  >
                    {isRegistering ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করতে চান?'}
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleReset} 
                  className="space-y-6"
                >
                  {resetSent ? (
                    <div className="text-center space-y-6 py-4">
                      <div className="w-20 h-20 bg-blue-50 text-blue-600 flex items-center justify-center mx-auto rounded-3xl">
                        <Mail size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-black text-slate-900 text-xl">ইমেইল পাঠানো হয়েছে!</h3>
                        <p className="text-slate-500 text-sm font-bold">আপনার ইনবক্স চেক করুন।</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowForgot(false);
                          setResetSent(false);
                        }}
                        className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-700 transition-all"
                      >
                        ফিরে যান
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল বা ইউজারনেম</label>
                          <input 
                            type="text" 
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all"
                            placeholder="আপনার আইডি দিন"
                            required
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          {loading ? <GlobalLoader size="sm" className="mx-auto" /> : 'রিসেট লিঙ্ক পাঠান'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowForgot(false)}
                          className="w-full py-2 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
                        >
                          বাতিল করুন
                        </button>
                      </div>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} {settings?.hospitalName || 'Hospital Management'}
            </p>
          </div>
        </motion.div>
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
             <LogIn size={20} />}
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
