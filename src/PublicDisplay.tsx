import React, { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Doctor, Patient, AppSettings } from './types';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { Clock, Calendar, Activity, Stethoscope, Monitor, ShieldCheck, ChevronDown, ChevronRight, UserX, AlertCircle, Maximize, Minimize, Link as LinkIcon, Play, User, Users, RefreshCw, X, LogIn, Sparkles, History, CheckCircle2 } from 'lucide-react';
import { cn } from './lib/utils';
import { VerificationBadge } from './components/admin/AdminComponents';

import PatientCard from './components/PatientCard';
import DoctorSelectionModal from './components/DoctorSelectionModal';
import SerialCheckModal from './components/SerialCheckModal';
import ClockComponent from './components/Clock';
import { Search } from 'lucide-react';

const NOTICE_STYLES: Record<string, any> = {
  'MEDICINE': { bg: 'bg-emerald-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(5,150,105,0.5)]', glow: 'via-emerald-400', accent: 'border-emerald-400' },
  'GASTROENTEROLOGY': { bg: 'bg-orange-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(234,88,12,0.5)]', glow: 'via-orange-400', accent: 'border-orange-400' },
  'CARDIOLOGY': { bg: 'bg-rose-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(225,29,72,0.5)]', glow: 'via-rose-400', accent: 'border-rose-400' },
  'ENT': { bg: 'bg-indigo-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(79,70,229,0.5)]', glow: 'via-indigo-400', accent: 'border-indigo-400' },
  'ORTHOPEDIC': { bg: 'bg-amber-700', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(180,83,9,0.5)]', glow: 'via-amber-500', accent: 'border-amber-500' },
  'PEDIATRIC': { bg: 'bg-sky-500', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(14,165,233,0.5)]', glow: 'via-sky-300', accent: 'border-sky-300' },
  'GYNAE': { bg: 'bg-purple-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(147,51,234,0.5)]', glow: 'via-purple-400', accent: 'border-purple-400' },
  'GENERAL SURGERY': { bg: 'bg-slate-900', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(15,23,42,0.5)]', glow: 'via-slate-500', accent: 'border-slate-500' },
  'DENTAL': { bg: 'bg-teal-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(13,148,136,0.5)]', glow: 'via-teal-400', accent: 'border-teal-400' },
  'SKIN': { bg: 'bg-pink-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(219,39,119,0.5)]', glow: 'via-pink-400', accent: 'border-pink-400' },
  'PAIN MEDICINE': { bg: 'bg-yellow-600', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(202,138,4,0.5)]', glow: 'via-yellow-400', accent: 'border-yellow-400' },
  'EUROLOGY': { bg: 'bg-cyan-700', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(14,116,144,0.5)]', glow: 'via-cyan-500', accent: 'border-cyan-500' },
  'NEUROLOGY': { bg: 'bg-blue-800', text: 'text-white', shadow: 'shadow-[0_0_50px_rgba(30,64,175,0.5)]', glow: 'via-blue-400', accent: 'border-blue-400' },
};

const getNoticeStyles = (dept?: string) => {
  const defaultStyle = {
    bg: 'bg-red-600',
    text: 'text-white',
    shadow: 'shadow-[0_0_50px_rgba(220,38,38,0.5)]',
    glow: 'via-red-400',
    accent: 'border-red-400'
  };
  
  if (!dept) return defaultStyle;
  return NOTICE_STYLES[dept] || defaultStyle;
};

const THEMES: Record<string, any> = {
  modern: {
    card: "bg-white/95 backdrop-blur-sm shadow-2xl border-slate-200",
    header: "bg-slate-50/95 backdrop-blur-sm border-slate-200",
    text: "text-slate-900",
    accent: "text-blue-600",
    bg: "bg-slate-100"
  },
  classic: {
    card: "bg-white shadow-lg border-slate-300",
    header: "bg-white border-slate-300",
    text: "text-slate-900",
    accent: "text-blue-700",
    bg: "bg-slate-200"
  },
  dark: {
    card: "bg-slate-900/90 backdrop-blur-md shadow-2xl border-slate-800",
    header: "bg-slate-950/95 border-slate-800",
    text: "text-white",
    accent: "text-blue-400",
    bg: "bg-slate-950"
  },
  glass: {
    card: "bg-white/40 backdrop-blur-xl shadow-2xl border-white/30",
    header: "bg-white/20 backdrop-blur-xl border-white/20",
    text: "text-slate-900",
    accent: "text-blue-600",
    bg: "bg-gradient-to-br from-blue-500 to-indigo-600"
  }
};

const TRANSITIONS = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  slide: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  zoom: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: { duration: 0.3 }
  },
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 }
  }
};

export default function PublicDisplay() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    hospitalName: 'সাজেদা জব্বার হাসপাতাল',
    slogan: 'সেবাই আমাদের মূল লক্ষ্য',
    primaryColor: '#2563eb',
    fontColor: '#ffffff',
    nextPatientBg: '#3b82f6',
    nextPatientText: '#ffffff',
    absentPatientBg: '#f97316',
    absentPatientText: '#ffffff',
    displayDoctorMode: 'manual',
    displayRotationInterval: 30,
    displayTransitionEffect: 'fade',
    displayTheme: 'modern',
    displayShowPhoto: true,
    displayShowSpecialty: true,
    displayShowRoom: true,
    displayShowNextDoctor: true,
    displayCustomMessage: '',
    displaySwitchOnCall: true,
    displayShowHistory: true,
    displayClockTheme: 'digital',
    displayCustomBgUrl: '',
    displayTickerSpeed: 20,
    displayShowClock: true,
    displayShowDate: true
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isSerialCheckOpen, setIsSerialCheckOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<Doctor | null>(null);
  const [doctorHistory, setDoctorHistory] = useState<Patient[]>([]);

  useEffect(() => {
    if (!selectedDoctorForProfile) {
      setDoctorHistory([]);
      return;
    }
    const q = query(
      collection(db, 'patients'),
      where('doctorId', '==', selectedDoctorForProfile.id),
      where('status', '==', 'completed')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      docs.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setDoctorHistory(docs.slice(0, 10));
    });
    return () => unsub();
  }, [selectedDoctorForProfile]);

  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    });

    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
      setDoctors(allDocs);
    });

    return () => {
      unsubSettings();
      unsubDoctors();
    };
  }, []);

  const scheduledDoctors = React.useMemo(() => {
    const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const today = dayMap[new Date().getDay()];
    return doctors.filter(doc => doc.availableDays?.includes(today));
  }, [doctors]);

  // Switch on Call Logic
  useEffect(() => {
    if (!settings.displaySwitchOnCall) return;

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'patients'), 
      where('date', '==', today),
      where('status', '==', 'calling')
    );
    const unsubAllPatients = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Find the first calling patient that isn't for the current active doctor
        const callingPatient = snapshot.docs[0].data() as Patient;
        const callingDoctor = doctors.find(d => d.id === callingPatient.doctorId);
        if (callingDoctor && activeDoctor?.id !== callingDoctor.id) {
          setActiveDoctor(callingDoctor);
        }
      }
    });

    return () => unsubAllPatients();
  }, [settings.displaySwitchOnCall, doctors, activeDoctor]);

  // Doctor Switching Logic
  useEffect(() => {
    if (doctors.length === 0) return;

    const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const today = dayMap[new Date().getDay()];
    const scheduledDocs = doctors.filter(doc => doc.availableDays?.includes(today));

    // Manual Mode
    if (!settings.displayDoctorMode || settings.displayDoctorMode === 'manual') {
      if (settings.displaySelectedDoctorId) {
        const doc = doctors.find(d => d.id === settings.displaySelectedDoctorId);
        if (doc) {
          setActiveDoctor(doc);
          return;
        }
      }
      // Fallback to first scheduled if manual selection not found or not set
      if (scheduledDocs.length > 0) {
        setActiveDoctor(prev => {
          if (prev && scheduledDocs.some(d => d.id === prev.id)) return prev;
          return scheduledDocs[0];
        });
      } else if (doctors.length > 0) {
        setActiveDoctor(doctors[0]);
      }
      return;
    }

    // Auto-Rotate Mode (Scheduled Doctors)
    if (settings.displayDoctorMode === 'auto-rotate' || settings.displayDoctorMode === 'all') {
      const docsToRotate = settings.displayDoctorMode === 'all' ? doctors : scheduledDocs;
      
      if (docsToRotate.length === 0) {
        setActiveDoctor(null);
        return;
      }

      if (docsToRotate.length === 1) {
        setActiveDoctor(docsToRotate[0]);
        return;
      }

      // Initial set
      setActiveDoctor(prev => {
        if (prev && docsToRotate.some(d => d.id === prev.id)) return prev;
        return docsToRotate[0];
      });

      const interval = setInterval(() => {
        // Pause rotation if video is playing
        if (showVideo) return;

        setActiveDoctor(current => {
          if (!current) return docsToRotate[0];
          const currentIndex = docsToRotate.findIndex(d => d.id === current.id);
          const nextIndex = (currentIndex + 1) % docsToRotate.length;
          return docsToRotate[nextIndex];
        });
      }, (settings.displayRotationInterval || 30) * 1000);

      return () => clearInterval(interval);
    }
  }, [settings.displayDoctorMode, settings.displaySelectedDoctorId, settings.displayRotationInterval, doctors, showVideo]);

  useEffect(() => {
    if (!activeDoctor) return;
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'patients'),
      where('doctorId', '==', activeDoctor.id),
      where('date', '==', today),
      where('status', 'in', ['waiting', 'running', 'next', 'absent', 'completed', 'calling'])
    );
    const unsubPatients = onSnapshot(q, (snapshot) => {
      // Use a more efficient way to process docs
      const docs: Patient[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as Patient);
      });
      
      // Sort by status priority then serial number
      docs.sort((a, b) => {
        const priority: Record<string, number> = { 'running': 0, 'calling': 1, 'next': 2, 'absent': 3, 'waiting': 4, 'completed': 5 };
        const aPriority = priority[a.status] ?? 6;
        const bPriority = priority[b.status] ?? 6;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.serialNumber - b.serialNumber;
      });
      setPatients(docs);
    });
    return () => unsubPatients();
  }, [activeDoctor]);

  const handleDoctorSelect = React.useCallback((doc: Doctor) => {
    setActiveDoctor(doc);
    setIsDoctorModalOpen(false);
  }, []);

  const handleSwitchDoctor = () => {
    const docsToUse = scheduledDoctors.length > 0 ? scheduledDoctors : doctors;
    if (docsToUse.length <= 1) return;
    const currentIndex = docsToUse.findIndex(d => d.id === activeDoctor?.id);
    const nextIndex = (currentIndex + 1) % docsToUse.length;
    setActiveDoctor(docsToUse[nextIndex]);
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      window.location.hash = '';
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // No longer blocking on settings

  const activeDoctorStats = React.useMemo(() => {
    if (!activeDoctor || patients.length === 0) return { completed: 0, waiting: 0, total: 0 };
    
    let completed = 0;
    let waiting = 0;
    
    for (const p of patients) {
      if (p.status === 'completed') {
        completed++;
      } else if (p.status !== 'checked-in') {
        waiting++;
      }
    }
    
    return {
      completed,
      waiting,
      total: patients.length
    };
  }, [patients, activeDoctor]);

  const generalPatients = React.useMemo(() => patients.filter(p => p.service === 'general'), [patients]);
  const procedurePatients = React.useMemo(() => patients.filter(p => p.service !== 'general'), [patients]);

  const generalStats = React.useMemo(() => {
    let total = 0;
    let completed = 0;
    let waiting = 0;
    for (const p of generalPatients) {
      total++;
      if (p.status === 'completed') completed++;
      else waiting++;
    }
    return { total, completed, waiting };
  }, [generalPatients]);

  const procedureStats = React.useMemo(() => {
    let total = 0;
    let completed = 0;
    let waiting = 0;
    for (const p of procedurePatients) {
      total++;
      if (p.status === 'completed') completed++;
      else waiting++;
    }
    return { total, completed, waiting };
  }, [procedurePatients]);

  // Find next doctor for preview
  const nextDoctor = React.useMemo(() => {
    const docsToUse = scheduledDoctors.length > 0 ? scheduledDoctors : doctors;
    if (!settings.displayShowNextDoctor || docsToUse.length <= 1) return null;
    const currentIndex = docsToUse.findIndex(d => d.id === activeDoctor?.id);
    const nextIndex = (currentIndex + 1) % docsToUse.length;
    return docsToUse[nextIndex];
  }, [activeDoctor, doctors, scheduledDoctors, settings.displayShowNextDoctor]);

  if (doctors.length === 0) {
    return (
      <div 
        className="min-h-screen flex flex-col font-sans"
        style={{ backgroundColor: settings?.displayBgColor || '#f8fafc' }}
      >
        <header 
          className="p-4 flex justify-between items-center border-b border-slate-200 shadow-sm"
          style={{ backgroundColor: settings?.displayHeaderBgColor || 'rgba(255, 255, 255, 0.95)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-none shadow-md" style={{ backgroundColor: settings.primaryColor || '#2563eb' }}>
              <Activity className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: settings.fontColor || '#0f172a' }}>{settings.hospitalName}</h1>
          </div>
          <div className="text-right">
            <ClockComponent className="text-3xl font-mono font-bold" style={{ color: settings.primaryColor || '#2563eb' }} />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
          <div 
            className="p-12 rounded-none border border-slate-200 shadow-xl max-w-md relative z-10"
            style={{ backgroundColor: settings?.displayCardBgColor ? `${settings.displayCardBgColor}` : 'rgba(255, 255, 255, 0.95)' }}
          >
            <Stethoscope className="w-16 h-16 mx-auto mb-6 opacity-20" style={{ color: settings.fontColor || '#0f172a' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: settings.fontColor || '#0f172a' }}>কোনো ডাক্তার পাওয়া যায়নি</h2>
            <p style={{ color: settings.fontColor ? `${settings.fontColor}99` : '#64748b' }}>অ্যাডমিন প্যানেল থেকে ডাক্তার যোগ করুন।</p>
            <button 
              onClick={() => window.location.hash = 'admin'}
              className="mt-8 px-6 py-3 text-white rounded-none font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
              style={{ backgroundColor: settings.primaryColor || '#2563eb', shadowColor: `${settings.primaryColor || '#2563eb'}33` }}
            >
              অ্যাডমিন প্যানেলে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  const noticeStyle = getNoticeStyles(activeDoctor?.department);

  const currentTheme = THEMES[settings.displayTheme || 'modern'] || THEMES.modern;
  const transitionVariant = TRANSITIONS[settings.displayTransitionEffect || 'fade'] || TRANSITIONS.fade;

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-700",
        currentTheme.bg
      )}
      style={{ 
        '--primary': settings?.primaryColor || '#2563eb',
        color: settings?.fontColor || (settings.displayTheme === 'dark' ? '#ffffff' : '#0f172a'),
        backgroundImage: settings.displayCustomBgUrl ? `url(${settings.displayCustomBgUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } as any}
    >
      {/* Background Overlay for better readability if custom BG is set */}
      {settings.displayCustomBgUrl && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
      )}

      {/* Background Decorations for Glass Theme */}
      {settings.displayTheme === 'glass' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Doctor Selection Modal */}
      <DoctorSelectionModal 
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        doctors={scheduledDoctors.length > 0 ? scheduledDoctors : doctors}
        activeDoctor={activeDoctor}
        onSelect={handleDoctorSelect}
      />

      {/* Serial Check Modal */}
      <SerialCheckModal 
        isOpen={isSerialCheckOpen}
        onClose={() => setIsSerialCheckOpen(false)}
        patients={patients}
      />

      {/* Mobile Floating Action Button (Serial Check) - Hidden as per request */}
      {/* {!isLoggedIn && !isFullScreen && (
        <div className="fixed bottom-24 right-6 z-[60] lg:hidden">
          <button
            onClick={() => setIsSerialCheckOpen(true)}
            className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white"
          >
            <Search size={28} />
          </button>
        </div>
      )} */}

      {/* Header */}
      <header 
        className={cn(
          "p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b relative z-[100] transition-all duration-500",
          currentTheme.header
        )}
        style={{ 
          backgroundColor: settings?.displayHeaderBgColor && settings.displayTheme !== 'glass' && settings.displayTheme !== 'dark' 
            ? settings.displayHeaderBgColor 
            : undefined 
        }}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div 
            onClick={() => !isFullScreen && (window.location.hash = 'admin')}
            className={cn(
              "shrink-0 transition-transform",
              !isFullScreen ? "cursor-pointer active:scale-95" : "cursor-default"
            )}
            title={!isFullScreen ? "অ্যাডমিন লগইন" : ""}
          >
            {settings.hospitalLogo ? (
              <img src={settings.hospitalLogo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-none object-cover border border-slate-200 shadow-sm" />
            ) : (
              <div className="p-2 rounded-none shadow-md" style={{ backgroundColor: settings.primaryColor || '#2563eb' }}>
                <Activity className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight truncate" style={{ color: settings.fontColor || '#0f172a' }}>{settings.hospitalName}</h1>
            <div className="flex items-center gap-2 mt-0.5 md:mt-1">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: settings.fontColor ? `${settings.fontColor}99` : '#64748b' }}>Live Sync</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 w-full sm:w-auto">
          {(settings.displayShowClock || settings.displayShowDate) && (
            <div className="text-left">
              {settings.displayShowClock && (
                <div className={cn(
                  "flex items-center gap-2",
                  settings.displayClockTheme === 'minimal' ? "opacity-80" : ""
                )}>
                  <ClockComponent 
                    className={cn(
                      "font-mono font-black tracking-tighter",
                      settings.displayClockTheme === 'minimal' ? "text-xl md:text-2xl" : "text-2xl md:text-4xl lg:text-5xl"
                    )} 
                    style={{ color: settings.primaryColor || '#2563eb' }} 
                  />
                  {settings.displayClockTheme === 'minimal' && <Clock size={16} style={{ color: settings.primaryColor }} />}
                </div>
              )}
              {settings.displayShowDate && (
                <div className="text-[10px] md:text-sm font-bold uppercase tracking-widest mt-0.5 md:mt-1" style={{ color: settings.fontColor ? `${settings.fontColor}99` : '#64748b' }}>
                  {format(new Date(), 'EEEE, d MMMM, yyyy', { locale: bn })}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Serial Check Button - Hidden as per request */}
            {/* {!isLoggedIn && !isFullScreen && (
              <button
                onClick={() => setIsSerialCheckOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-none text-slate-700 font-black text-sm hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm active:scale-95"
              >
                <Search size={18} />
                <span>সিরিয়াল চেক</span>
              </button>
            )} */}

            {/* User Menu / Login Button - Hidden as per request */}
            {/* {!isFullScreen && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={cn(
                    "p-2 md:p-3 transition-colors bg-transparent border-none outline-none",
                    isUserMenuOpen ? "text-blue-600" : "text-slate-400 hover:text-blue-600"
                  )}
                >
                  <User className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[105]" 
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div 
                      className="absolute right-0 top-full pt-2 z-[110]"
                    >
                        <div className="bg-white border-2 border-slate-900 shadow-2xl rounded-none py-2 min-w-[180px] overflow-hidden">
                          {!isLoggedIn ? (
                            <button
                              onClick={() => {
                                window.location.hash = 'patient';
                                setIsUserMenuOpen(false);
                              }}
                              className="w-full px-6 py-3 text-left font-black text-slate-700 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-3"
                            >
                              <Users size={18} />
                              <span>রোগী লগিন</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  const isAdmin = window.location.hash === '#admin';
                                  window.location.hash = isAdmin ? 'admin' : 'patient';
                                  setIsUserMenuOpen(false);
                                }}
                                className="w-full px-6 py-3 text-left font-black text-slate-700 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-3 border-b border-slate-100"
                              >
                                <Monitor size={18} />
                                <span>ড্যাশবোর্ড</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleLogout();
                                  setIsUserMenuOpen(false);
                                }}
                                className="w-full px-6 py-3 text-left font-black text-red-600 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-3"
                              >
                                <LogIn size={18} className="rotate-180" />
                                <span>লগআউট</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
              </div>
            )} */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden pb-24 lg:pb-20 relative z-10">
        {!activeDoctor ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Left: Doctor Profile */}
            <div 
              className={cn(
                "w-full lg:w-1/3 p-6 md:p-8 border-b lg:border-b-0 lg:border-r flex flex-col items-center justify-center relative shrink-0",
                currentTheme.card
              )}
              style={{ 
                backgroundColor: settings?.displayCardBgColor && settings.displayTheme !== 'glass' && settings.displayTheme !== 'dark'
                  ? settings.displayCardBgColor 
                  : undefined 
              }}
            >
              {/* Switch Button */}
              {activeDoctor.videoUrl && (
                <div className="absolute top-8 right-8 z-20 flex gap-2">
                  <button 
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-none text-slate-700 font-bold text-sm hover:bg-white transition-all shadow-sm active:scale-95"
                  >
                    {showVideo ? (
                      <>
                        <User size={16} style={{ color: settings.primaryColor || '#2563eb' }} />
                        <span>তথ্য দেখুন</span>
                      </>
                    ) : (
                      <>
                        <Play size={16} className="text-emerald-600" />
                        <span>ভিডিও দেখুন</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="w-full h-full">
                {showVideo ? (
                  <div 
                    className="w-full flex flex-col items-center justify-center p-2"
                  >
                    <div className="w-full max-w-2xl aspect-video bg-black rounded-none overflow-hidden shadow-2xl border-4 md:border-8 border-white relative group z-10">
                      {activeDoctor.videoUrl ? (
                        <video 
                          src={activeDoctor.videoUrl} 
                          controls 
                          autoPlay 
                          loop
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-4 md:gap-6 bg-slate-50">
                          <Play className="w-12 h-12 md:w-20 md:h-20 opacity-10" />
                          <p className="font-bold italic text-lg md:text-2xl text-slate-400">কোনো ভিডিও পাওয়া যায়নি</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 md:mt-8 text-center flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-1 md:mb-2">
                          <h2 className={cn("text-2xl md:text-3xl font-black leading-tight flex items-center gap-2", currentTheme.text)}>
                            {activeDoctor.name}
                            <VerificationBadge badge={activeDoctor.verifiedBadge} size={20} />
                          </h2>
                          <div className="flex gap-2">
                            {/* Profile View Icon - Removed as per request */}
                            {/* <button 
                              onClick={() => setSelectedDoctorForProfile(activeDoctor)}
                              className="p-2 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-full transition-all shadow-sm active:scale-90 group"
                              style={{ color: settings.primaryColor || '#2563eb' }}
                              title="প্রোফাইল দেখুন"
                            >
                              <User className="w-4 h-4 md:w-[18px] md:h-[18px] group-hover:text-white" />
                            </button> */}
                            {doctors.length > 1 && (
                              <button 
                                onClick={() => setIsDoctorModalOpen(true)}
                                className="p-2 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-full shadow-sm group"
                                style={{ color: settings.primaryColor || '#2563eb' }}
                                title="ডাক্তার পরিবর্তন করুন"
                              >
                                <Users className="w-4 h-4 md:w-[18px] md:h-[18px] group-hover:text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      {settings.displayShowSpecialty !== false && (
                        <p className="text-lg md:text-xl font-bold uppercase tracking-[0.2em]" style={{ color: settings.primaryColor || '#2563eb' }}>{activeDoctor.department}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center w-full">
                    {settings.displayShowPhoto !== false && (
                      <div className="relative mb-6 md:mb-8 w-full max-w-[300px] md:max-w-none">
                        <img 
                          src={activeDoctor.photoUrl || `https://picsum.photos/seed/${activeDoctor.id}/400/400`} 
                          alt={activeDoctor.name}
                          loading="eager"
                          className="w-full aspect-square rounded-none object-cover shadow-2xl border-4 md:border-8 border-white"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mb-2 md:mb-3">
                      <h2 className={cn("text-2xl md:text-4xl font-black leading-tight flex items-center gap-2", currentTheme.text)}>
                        {activeDoctor.name}
                        <VerificationBadge badge={activeDoctor.verifiedBadge} size={24} />
                      </h2>
                      <div className="flex gap-3">
                        {/* Profile View Icon - Removed as per request */}
                        {/* <button 
                          onClick={() => setSelectedDoctorForProfile(activeDoctor)}
                          className="p-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-full transition-all shadow-md active:scale-90 group border border-blue-100"
                          style={{ color: settings.primaryColor || '#2563eb' }}
                          title="প্রোফাইল দেখুন"
                        >
                          <User className="w-[20px] h-[20px] md:w-[24px] md:h-[24px] group-hover:text-white" />
                        </button> */}
                        {doctors.length > 1 && (
                          <button 
                            onClick={() => setIsDoctorModalOpen(true)}
                            className="p-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-full shadow-md group border border-blue-100"
                            style={{ color: settings.primaryColor || '#2563eb' }}
                            title="ডাক্তার পরিবর্তন করুন"
                          >
                            <Users className="w-[20px] h-[20px] md:w-[24px] md:h-[24px] group-hover:text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                    {settings.displayShowSpecialty !== false && (
                      <p className="text-xl md:text-2xl font-bold mb-3 md:mb-4 uppercase tracking-widest" style={{ color: settings.primaryColor || '#2563eb' }}>{activeDoctor.department}</p>
                    )}
                    <p className={cn("text-base md:text-lg mb-6 md:mb-8 leading-relaxed font-medium", settings.displayTheme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
                      {activeDoctor.degree} <br />
                      {activeDoctor.designation}
                    </p>

                    <div 
                      className={cn("p-4 md:p-6 rounded-none border shadow-sm w-full", currentTheme.card)}
                      style={{ 
                        backgroundColor: settings?.displayCardBgColor && settings.displayTheme !== 'glass' && settings.displayTheme !== 'dark'
                          ? settings.displayCardBgColor 
                          : undefined 
                      }}
                    >
                      {/* Stats Boxes - Removed as per request */}
                      {/* <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
                        <div className="flex flex-col items-center p-2 md:p-4 bg-emerald-50 border border-emerald-100 rounded-none">
                          <span className="text-[7px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">সম্পন্ন</span>
                          <span className="text-lg md:text-3xl font-black text-emerald-700 leading-none">{activeDoctorStats.completed}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 md:p-4 bg-amber-50 border border-amber-100 rounded-none">
                          <span className="text-[7px] md:text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">অপেক্ষমান</span>
                          <span className="text-lg md:text-3xl font-black text-amber-700 leading-none">{activeDoctorStats.waiting}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 md:p-4 bg-blue-50 border border-blue-100 rounded-none">
                          <span className="text-[7px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">সর্বমোট</span>
                          <span className="text-lg md:text-3xl font-black text-blue-700 leading-none">{activeDoctorStats.total}</span>
                        </div>
                      </div> */}

                    </div>

                    <div className="mt-6 md:mt-10 opacity-80">
                      <p className={cn("text-[12px] md:text-[14px] font-black tracking-[0.4em] uppercase italic", currentTheme.text)}>
                        Designed by <span style={{ color: settings.primaryColor || '#7dd3fc' }}>Kawsar</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Patient List */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-6">
              {(() => {
                const hasProceduresConfig = activeDoctor?.procedures && activeDoctor.procedures.length > 0;
                const showProcedures = hasProceduresConfig && procedurePatients.length > 0;
                const showGeneral = generalPatients.length > 0 || !showProcedures;

                return (
                  <div className={cn(
                    "flex-1 grid gap-6 md:gap-8",
                    (showGeneral && showProcedures) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                  )}>
                    {/* General Patients Column */}
                    {showGeneral && (
                      <div 
                        className={cn("flex flex-col h-full border rounded-none relative shadow-sm overflow-hidden transition-all duration-500 will-change-transform transform-gpu", currentTheme.card)}
                        style={{ 
                          backgroundColor: settings?.displayCardBgColor && settings.displayTheme !== 'glass' && settings.displayTheme !== 'dark'
                            ? settings.displayCardBgColor 
                            : undefined 
                        }}
                      >
                        {/* Notice Overlay */}
                        {(activeDoctor?.activeNotice || settings.activeNotice) && (
                          <div
                            className="absolute inset-0 z-30 flex items-center justify-center p-6 text-center"
                          >
                            <div className={cn("absolute inset-0 opacity-95", noticeStyle.bg)} />
                            <div className="relative z-10 flex flex-col items-center gap-6">
                              <div className="bg-white/20 p-6 rounded-none border border-white/30">
                                <AlertCircle size={80} className="text-white" />
                              </div>
                              <div className="space-y-4">
                                <p className="text-sm font-black uppercase tracking-[0.4em] text-white/70">
                                  {activeDoctor?.activeNotice ? `${activeDoctor.name} এর বিশেষ বার্তা` : 'হাসপাতাল জরুরী ঘোষণা'}
                                </p>
                                <h2 className="text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                                  {activeDoctor?.activeNotice || settings.activeNotice}
                                </h2>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white/50" style={{ borderColor: `${settings.primaryColor || '#2563eb'}20` }}>
                          <div className="flex items-center gap-4">
                            <div className="p-4 rounded-xl shadow-inner" style={{ backgroundColor: `${settings.primaryColor || '#2563eb'}15`, color: settings.primaryColor || '#2563eb' }}>
                              <Users size={36} />
                            </div>
                            <div>
                              <h3 className={cn("text-2xl md:text-4xl font-black uppercase tracking-tight", currentTheme.text)}>
                                আজকের সিরিয়াল তালিকা
                              </h3>
                              <p className={cn("text-[12px] font-black uppercase tracking-[0.2em] opacity-50", currentTheme.text)}>General Patient Queue</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 p-3 md:p-6 overflow-hidden flex flex-col gap-4">
                          <div className={cn("flex items-center gap-3 md:gap-4 px-4 md:px-6 text-sm md:text-lg font-black uppercase tracking-wider opacity-90 mb-2 border-b-2 border-slate-100 pb-2", currentTheme.text)}>
                            <div className="w-14 md:w-20">সিরিয়াল</div>
                            <div className="flex-1">রোগীর তথ্য</div>
                            <div className="w-24 md:w-40 text-right">অবস্থা</div>
                          </div>
                          
                          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                            {generalPatients
                              .filter(p => p.status !== 'completed' && p.status !== 'checked-in')
                              .slice(0, 8)
                              .map((patient, index) => (
                              <PatientCard 
                                key={`gen-${patient.id}`} 
                                patient={patient} 
                                index={index} 
                                settings={settings} 
                              />
                            ))}
                            
                            {generalPatients.length === 0 && (
                              <div className="h-48 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 bg-slate-50/30">
                                <p className="text-xl md:text-3xl font-black uppercase tracking-widest">বর্তমানে কোনো সিরিয়াল নেই</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Procedure Patients Column */}
                    {showProcedures && (
                      <div 
                        className={cn("flex flex-col h-full border rounded-none relative shadow-sm overflow-hidden transition-all duration-500 will-change-transform transform-gpu", currentTheme.card)}
                        style={{ 
                          backgroundColor: settings?.displayCardBgColor && settings.displayTheme !== 'glass' && settings.displayTheme !== 'dark'
                            ? settings.displayCardBgColor 
                            : undefined 
                        }}
                      >
                        {/* Notice Overlay */}
                        {(activeDoctor?.activeNotice || settings.activeNotice) && (
                          <div
                            className="absolute inset-0 z-30 flex items-center justify-center p-6 text-center"
                          >
                            <div className={cn("absolute inset-0 opacity-95", noticeStyle.bg)} />
                            <div className="relative z-10 flex flex-col items-center gap-6">
                              <div className="bg-white/20 p-6 rounded-none border border-white/30">
                                <AlertCircle size={80} className="text-white" />
                              </div>
                              <div className="space-y-4">
                                <p className="text-sm font-black uppercase tracking-[0.4em] text-white/70">
                                  {activeDoctor?.activeNotice ? `${activeDoctor.name} এর বিশেষ বার্তা` : 'হাসপাতাল জরুরী ঘোষণা'}
                                </p>
                                <h2 className="text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                                  {activeDoctor?.activeNotice || settings.activeNotice}
                                </h2>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white/50" style={{ borderColor: `${settings.procedureColor || '#10b981'}20` }}>
                          <div className="flex items-center gap-4">
                            <div className="p-4 rounded-xl shadow-inner" style={{ backgroundColor: `${settings.procedureColor || '#10b981'}15`, color: settings.procedureColor || '#10b981' }}>
                              <Activity size={36} />
                            </div>
                            <div>
                              <h3 className={cn("text-2xl md:text-4xl font-black uppercase tracking-tight", currentTheme.text)}>
                                {activeDoctor.procedures?.[0] || 'ওপিডি প্রসিডিউর'}
                              </h3>
                              <p className={cn("text-[12px] font-black uppercase tracking-[0.2em] opacity-50", currentTheme.text)}>Procedure Queue</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 p-3 md:p-6 overflow-hidden flex flex-col gap-4">
                          <div className={cn("flex items-center gap-3 md:gap-4 px-4 md:px-6 text-sm md:text-lg font-black uppercase tracking-wider opacity-90 mb-2 border-b-2 border-slate-100 pb-2", currentTheme.text)}>
                            <div className="w-14 md:w-20">সিরিয়াল</div>
                            <div className="flex-1">রোগীর তথ্য</div>
                            <div className="w-24 md:w-40 text-right">অবস্থা</div>
                          </div>
                          
                          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                            {procedurePatients
                              .filter(p => p.status !== 'completed' && p.status !== 'checked-in')
                              .slice(0, 8)
                              .map((patient, index) => (
                              <PatientCard 
                                key={`proc-${patient.id}`} 
                                patient={patient} 
                                index={index} 
                                settings={settings} 
                                showService 
                              />
                            ))}
                            
                            {procedurePatients.length === 0 && (
                              <div className="h-48 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 bg-slate-50/30">
                                <p className="text-xl md:text-3xl font-black uppercase tracking-widest">কোনো {activeDoctor.procedures?.[0] || 'প্রসিডিউর'} রোগী নেই</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Custom Message Bar */}
      {settings.displayCustomMessage && (
        <div className="fixed bottom-16 md:bottom-20 left-0 right-0 h-8 bg-black/80 backdrop-blur-sm text-white flex items-center justify-center z-[45]">
          <div className="flex items-center gap-2 overflow-hidden">
            <Sparkles size={12} className="text-blue-400 animate-pulse" />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] whitespace-nowrap animate-marquee-slow">
              {settings.displayCustomMessage}
            </p>
            <Sparkles size={12} className="text-blue-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Footer Notice */}
      <footer 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-16 md:h-20 flex items-center overflow-hidden border-t z-50",
          (activeDoctor?.footerTheme || 'light') === 'light' ? 'border-slate-200' : 'border-blue-800'
        )}
        style={{ 
          backgroundColor: activeDoctor?.footerBgColor || '#ffffff',
          color: activeDoctor?.footerTextColor || '#0f172a'
        }}
      >
        <div 
          className="px-4 md:px-8 h-full flex items-center gap-2 md:gap-3 z-10 shadow-xl text-lg md:text-2xl" 
          style={{ 
            backgroundColor: activeDoctor?.footerBgColor 
              ? `${activeDoctor.footerBgColor}cc` 
              : '#ffffffcc',
            color: activeDoctor?.footerTextColor || '#0f172a'
          }}
        >
          <Calendar className="w-5 h-5 md:w-7 md:h-7" />
          <span className="font-bold whitespace-nowrap">ঘোষণা</span>
        </div>
        <div className="flex-1 marquee-container">
          <div 
            className="marquee-content text-2xl md:text-4xl font-bold"
            style={{ 
              '--duration': (() => {
                if (activeDoctor?.footerScrollDuration) return `${activeDoctor.footerScrollDuration}s`;
                return '25s'; // default
              })()
            } as any}
          >
            {activeDoctor?.footerNotice || activeDoctor?.scrollingNotice || ''}
          </div>
        </div>
      </footer>
      {selectedDoctorForProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
              <div className="relative h-48 md:h-64 shrink-0">
                <img 
                  src={selectedDoctorForProfile.coverUrl || `https://picsum.photos/seed/cover-${selectedDoctorForProfile.id}/1200/400`} 
                  className="w-full h-full object-cover" 
                  alt="Cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <button 
                  onClick={() => setSelectedDoctorForProfile(null)}
                  className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all z-20"
                >
                  <X size={24} />
                </button>
                
                <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden bg-white shrink-0">
                    <img 
                      src={selectedDoctorForProfile.photoUrl || `https://picsum.photos/seed/${selectedDoctorForProfile.id}/400/400`} 
                      className="w-full h-full object-cover" 
                      alt={selectedDoctorForProfile.name}
                    />
                  </div>
                  <div className="mb-4 pb-2">
                    <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg flex items-center gap-2">
                      {selectedDoctorForProfile.name}
                      <VerificationBadge badge={selectedDoctorForProfile.verifiedBadge} size={24} />
                    </h3>
                    <p className="text-blue-200 font-bold uppercase tracking-[0.2em] text-xs md:text-sm">{selectedDoctorForProfile.department}</p>
                  </div>
                </div>
              </div>

              <div className="pt-16 px-10 pb-10 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Info Column */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">ডাক্তারের তথ্য</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">ডিগ্রী ও পদবী</p>
                            <p className="font-bold text-slate-700 leading-relaxed">{selectedDoctorForProfile.degree}</p>
                            <p className="text-sm font-medium text-slate-500">{selectedDoctorForProfile.designation}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">সময়সূচী</p>
                            <p className="font-bold text-slate-700">{selectedDoctorForProfile.schedule}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                            <Monitor size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">রুম নাম্বার</p>
                            <p className="text-xl font-black text-slate-700">{selectedDoctorForProfile.roomNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">অ্যাক্টিভিটি স্ট্যাটাস</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মোট রোগী</p>
                          <p className="text-2xl font-black text-blue-600">
                            {doctorHistory.length}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">আজকের রোগী</p>
                          <p className="text-2xl font-black text-emerald-600">
                            {doctorHistory.filter(p => p.date === new Date().toISOString().split('T')[0]).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* History Column */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">রোগীর ইতিহাস</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <History size={14} />
                        <span>সর্বশেষ ১০ জন রোগী</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {doctorHistory
                        .slice(0, 10)
                        .map((p, idx) => (
                          <div 
                            key={`hist-profile-${p.id}`}
                            className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-all shadow-sm group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {p.serialNumber}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 flex items-center gap-1">
                                  {p.name}
                                  <VerificationBadge badge={p.verifiedBadge} size={14} />
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {p.date} • {p.patientType === 'new' ? 'নতুন' : 'পুরাতন'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                p.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                              )}>
                                {p.status === 'completed' ? 'সম্পন্ন' : 'অপেক্ষমান'}
                              </span>
                            </div>
                          </div>
                        ))}
                      
                      {doctorHistory.length === 0 && (
                        <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                          <UserX className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-bold">কোনো রোগীর ইতিহাস পাওয়া যায়নি</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
