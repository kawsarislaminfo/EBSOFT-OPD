import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { Doctor, Patient, AppSettings } from './types';
import { useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Stethoscope, 
  User, 
  LogOut, 
  Search, 
  ChevronRight, 
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  Bell,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { VerificationBadge } from './components/admin/AdminComponents';

export default function PatientDashboard() {
  const { user, userProfile, signOut } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mySerials, setMySerials] = useState<Patient[]>([]);
  const [runningPatients, setRunningPatients] = useState<Record<string, Patient>>({});
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedules' | 'search' | 'booking'>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDay, setSelectedDay] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  useEffect(() => {
    // Set default day to today
    const today = new Date();
    setSelectedDay(dayMap[today.getDay()]);
  }, []);

  useEffect(() => {
    // Fetch settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/general'));

    // Fetch doctors
    const unsubDoctors = onSnapshot(query(collection(db, 'doctors'), where('status', '==', 'active')), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
      setDoctors(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'doctors'));

    // Fetch my serials (searching by hospitalNumber)
    if (userProfile?.hospitalNumber) {
      const q = query(
        collection(db, 'patients'),
        where('hospitalNumber', '==', userProfile.hospitalNumber)
      );
      const unsubPatients = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
        // Sort by date descending
        docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMySerials(docs);
        setLoading(false);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

      // Listen to running patients for doctors the user has serials with today
      const today = format(new Date(), 'yyyy-MM-dd');
      const runningQuery = query(
        collection(db, 'patients'),
        where('date', '==', today),
        where('status', '==', 'running')
      );

      const unsubRunning = onSnapshot(runningQuery, (snapshot) => {
        const runningMap: Record<string, Patient> = {};
        snapshot.docs.forEach(d => {
          const p = { id: d.id, ...d.data() } as Patient;
          runningMap[p.doctorId] = p;
        });
        setRunningPatients(runningMap);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

      return () => {
        unsubSettings();
        unsubDoctors();
        unsubPatients();
        unsubRunning();
      };
    }

    return () => {
      unsubSettings();
      unsubDoctors();
    };
  }, [userProfile]);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  useEffect(() => {
    const popupSettings = settings?.patientWelcomePopup;
    
    if (popupSettings?.enabled && userProfile) {
      const hasSeenPopup = sessionStorage.getItem(`welcome_popup_seen_${userProfile.uid}`);
      if (!hasSeenPopup) {
        setShowWelcomePopup(true);
        sessionStorage.setItem(`welcome_popup_seen_${userProfile.uid}`, 'true');
      }
    }
  }, [settings, userProfile]);

  const handleLogout = async () => {
    if (userProfile?.uid) {
      sessionStorage.removeItem(`welcome_popup_seen_${userProfile.uid}`);
    }
    await signOut();
    window.location.hash = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (settings && settings.enablePatientPortal === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-10 border-2 border-slate-200 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-none flex items-center justify-center mx-auto border-2 border-orange-100">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">পেশেন্ট পোর্টাল বন্ধ আছে</h2>
          <p className="text-slate-700 font-bold">দুঃখিত, বর্তমানে পেশেন্ট পোর্টাল সাময়িকভাবে বন্ধ রাখা হয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন।</p>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95"
          >
            লগ আউট
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = settings?.portalThemeColor || '#2563eb'; // Default blue-600

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" style={{ '--primary-color': primaryColor } as React.CSSProperties}>
      {/* Emergency Notice */}
      {settings?.portalEmergencyNotice && (
        <div className="bg-red-600 text-white py-2 px-4 text-center font-black text-xs uppercase tracking-[0.2em] animate-pulse">
          <AlertCircle size={14} className="inline-block mr-2 mb-0.5" />
          জরুরী নোটিশ: {settings.portalEmergencyNotice}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              {settings?.portalLogoUrl ? (
                <img src={settings.portalLogoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 bg-blue-600 text-white rounded-none flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                  <Activity size={24} />
                </div>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {settings?.hospitalName || 'পেশেন্ট পোর্টাল'}
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right mr-4">
                <p className="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                  {userProfile?.name}
                  <VerificationBadge badge={userProfile?.verifiedBadge} size={14} />
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userProfile?.hospitalNumber || userProfile?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-none transition-all active:scale-95 border-2 border-red-100 hover:border-red-600"
                title="লগআউট"
              >
                <LogOut size={20} />
              </button>
              {notificationPermission !== 'granted' && (
                <button 
                  onClick={requestNotificationPermission}
                  className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-none transition-all active:scale-95 border-2 border-blue-100 hover:border-blue-600"
                  title="নোটিফিকেশন চালু করুন"
                >
                  <Bell size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Welcome Message & Notice */}
        {(settings?.patientPortalWelcomeMessage || settings?.patientPortalNotice) && (
          <div className="mb-10 space-y-4">
            {settings?.patientPortalWelcomeMessage && (
              <div className="bg-blue-600 p-6 md:p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2">
                    {settings.patientPortalWelcomeMessage}
                  </h2>
                  <p className="text-blue-100 font-bold text-sm md:text-base opacity-80 uppercase tracking-widest flex items-center gap-1">
                    {userProfile?.name}
                    <VerificationBadge badge={userProfile?.verifiedBadge} size={16} />
                    , আপনার সুস্বাস্থ্য আমাদের কাম্য
                  </p>
                </div>
              </div>
            )}
            
            {settings?.patientPortalNotice && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-6 flex items-start gap-4 shadow-md">
                <div className="p-2 bg-orange-100 text-orange-600 shrink-0">
                  <Megaphone size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">গুরুত্বপূর্ণ নোটিশ</p>
                  <p className="text-slate-700 font-bold text-sm md:text-base leading-relaxed">
                    {settings.patientPortalNotice}
                  </p>
                </div>
              </div>
            )}

            {userProfile?.portalNotice && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 flex items-start gap-4 shadow-md">
                <div className="p-2 bg-emerald-100 text-emerald-600 shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">আপনার জন্য বিশেষ নোটিশ</p>
                  <p className="text-slate-700 font-bold text-sm md:text-base leading-relaxed">
                    {userProfile.portalNotice}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex p-1.5 bg-slate-200 rounded-none w-full md:w-fit mb-10 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex-1 md:flex-none px-8 py-3 rounded-none font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'overview' 
                ? "bg-white text-slate-900 shadow-lg" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutDashboard size={18} />
            আমার সিরিয়াল
          </button>
          {settings?.portalShowDoctorSchedule !== false && (
            <button
              onClick={() => setActiveTab('schedules')}
              className={cn(
                "flex-1 md:flex-none px-8 py-3 rounded-none font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                activeTab === 'schedules' 
                  ? "bg-white text-slate-900 shadow-lg" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Calendar size={18} />
              ডাক্তারদের শিডিউল
            </button>
          )}
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-1 md:flex-none px-8 py-3 rounded-none font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'search' 
                ? "bg-white text-slate-900 shadow-lg" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Search size={18} />
            সিরিয়াল খুঁজুন
          </button>
          {settings?.portalEnableOnlineRegistration && (
            <button
              onClick={() => setActiveTab('booking')}
              className={cn(
                "flex-1 md:flex-none px-8 py-3 rounded-none font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                activeTab === 'booking' 
                  ? "bg-white text-slate-900 shadow-lg" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Stethoscope size={18} />
              সিরিয়াল বুকিং
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Health Tips Section */}
              {settings?.portalHealthTips && settings.portalHealthTips.length > 0 && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <Sparkles size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight mb-2">আজকের স্বাস্থ্য টিপস</h3>
                      <p className="text-blue-50 font-bold text-lg leading-relaxed">
                        {settings.portalHealthTips[Math.floor(Math.random() * settings.portalHealthTips.length)]}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-none border-2 border-slate-200 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">মোট সিরিয়াল</p>
                  <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{mySerials.length}</h3>
                </div>
                <div className="bg-white p-8 rounded-none border-2 border-slate-200 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">সম্পন্ন হয়েছে</p>
                  <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                    {mySerials.filter(s => s.status === 'completed').length}
                  </h3>
                </div>
                <div className="bg-white p-8 rounded-none border-2 border-slate-200 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">অপেক্ষমান</p>
                  <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                    {mySerials.filter(s => ['waiting', 'next', 'running'].includes(s.status)).length}
                  </h3>
                </div>
              </div>

              <div className="bg-white rounded-none border-2 border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-6 border-b-2 border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <ClipboardList className="text-blue-600" />
                    আমার সিরিয়াল তালিকা
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">তারিখ</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ডাক্তার</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">সিরিয়াল নং</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">বর্তমান সিরিয়াল</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mySerials.length > 0 ? mySerials.map((serial) => {
                        const doctor = doctors.find(d => d.id === serial.doctorId);
                        const runningPatient = runningPatients[serial.doctorId];
                        const isToday = serial.date === format(new Date(), 'yyyy-MM-dd');
                        
                        return (
                          <tr key={`my-serial-${serial.id}`} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-6 font-bold text-slate-600">
                              {format(new Date(serial.date), 'd MMMM, yyyy', { locale: bn })}
                              {isToday && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black uppercase rounded-full">আজ</span>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <p className="font-black text-slate-900 flex items-center gap-1">
                                {doctor?.name || 'N/A'}
                                <VerificationBadge badge={doctor?.verifiedBadge} size={14} />
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doctor?.department}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="w-10 h-10 bg-slate-100 rounded-none flex items-center justify-center font-black text-lg text-slate-600 border-2 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                                {serial.serialNumber}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {isToday && runningPatient ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-black text-sm border border-red-100 animate-pulse">
                                    {runningPatient.serialNumber}
                                  </div>
                                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">চলমান</p>
                                </div>
                              ) : isToday ? (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">এখনো শুরু হয়নি</p>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">-</p>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "text-[10px] font-black px-4 py-1.5 rounded-none uppercase tracking-widest border-2",
                                serial.status === 'completed' ? "bg-slate-100 text-slate-400 border-slate-200" :
                                serial.status === 'running' ? "bg-red-50 text-red-600 border-red-100" :
                                serial.status === 'next' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                serial.status === 'absent' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                "bg-emerald-50 text-emerald-600 border-emerald-100"
                              )}>
                                {serial.status === 'completed' ? 'সম্পন্ন' :
                                 serial.status === 'running' ? 'রানিং' :
                                 serial.status === 'next' ? 'এরপর' :
                                 serial.status === 'absent' ? 'অনুপস্থিত' : 'অপেক্ষমান'}
                              </span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <ClipboardList size={32} className="text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-bold italic">আপনার কোনো সিরিয়াল পাওয়া যায়নি</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'schedules' ? (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Day Selection */}
              <div className="bg-white p-6 rounded-none border-2 border-slate-200 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-none flex items-center justify-center shadow-md">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">ডাক্তারদের শিডিউল দেখুন</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">বার অনুযায়ী শিডিউল চেক করুন</p>
                  </div>
                </div>
                <div className="relative w-full md:w-64">
                  <select 
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-500 transition-colors appearance-none"
                  >
                    {dayMap.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {doctors.filter(doctor => {
                  if (!doctor.availableDays || doctor.availableDays.length === 0) return true;
                  return doctor.availableDays.includes(selectedDay);
                }).map((doctor) => (
                  <div key={`sched-doc-${doctor.id}`} className="bg-white rounded-none border-2 border-slate-200 shadow-md overflow-hidden group hover:border-blue-600 transition-all flex flex-col">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <img 
                        src={doctor.photoUrl || `https://picsum.photos/seed/${doctor.id}/400/300`} 
                        alt={doctor.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-white text-[10px] font-bold italic">{doctor.degree}</p>
                      </div>
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                      <div className="mb-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-100 inline-block mb-1">
                          {doctor.department}
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight line-clamp-1 flex items-center gap-1">
                          {doctor.name}
                          <VerificationBadge badge={doctor.verifiedBadge} size={14} />
                        </h3>
                        <p className="text-slate-500 font-bold text-[10px] line-clamp-1">{doctor.designation}</p>
                      </div>
                      
                      <div className="space-y-2 pt-3 border-t-2 border-slate-50 mt-auto">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-400" />
                          <p className="text-[10px] font-black text-slate-700">{doctor.schedule}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 size={12} className="text-slate-400" />
                          <p className="text-[10px] font-black text-slate-700">রুম: {doctor.roomNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {doctors.filter(doctor => {
                if (!doctor.availableDays || doctor.availableDays.length === 0) return true;
                return doctor.availableDays.includes(selectedDay);
              }).length === 0 && (
                <div className="bg-white p-12 text-center border-2 border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold italic">এই বারে কোনো ডাক্তার পাওয়া যায়নি</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'booking' ? (
            <motion.div
              key="booking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 md:p-12 rounded-none border-2 border-slate-200 shadow-2xl text-center">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border-2 border-blue-100">
                    <Stethoscope size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">অনলাইন সিরিয়াল বুকিং</h2>
                  <p className="text-slate-600 font-bold">
                    অনলাইনে সিরিয়াল বুকিং করার সুবিধা শীঘ্রই চালু হচ্ছে। বর্তমানে সিরিয়াল বুকিং এর জন্য সরাসরি হাসপাতালে যোগাযোগ করুন অথবা আমাদের হটলাইন নাম্বারে কল করুন।
                  </p>
                  {settings?.portalContactNumber && (
                    <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-none">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">হটলাইন নাম্বার</p>
                      <p className="text-2xl font-black text-blue-600">{settings.portalContactNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 md:p-12 rounded-none border-2 border-slate-200 shadow-2xl">
                <div className="max-w-2xl mx-auto text-center space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">সিরিয়াল খুঁজুন</h2>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">হাসপাতাল নাম্বার বা রোগীর নাম দিয়ে সিরিয়াল খুঁজুন</p>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!searchQuery.trim()) return;
                    setSearchLoading(true);
                    setSearchResults([]);
                    setSearchError('');
                    try {
                      const { getDocs, query, collection, where } = await import('firebase/firestore');
                      const q = query(
                        collection(db, 'patients'), 
                        where('hospitalNumber', '==', searchQuery.trim().toUpperCase())
                      );
                      const snapshot = await getDocs(q);
                      
                      let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
                      
                      // If no results by hospital number, try by name
                      if (results.length === 0) {
                        const qName = query(
                          collection(db, 'patients'),
                          where('name', '==', searchQuery.trim())
                        );
                        const snapshotName = await getDocs(qName);
                        results = snapshotName.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
                      }

                      if (results.length > 0) {
                        setSearchResults(results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                      } else {
                        setSearchError('দুঃখিত, কোনো সিরিয়াল পাওয়া যায়নি।');
                      }
                    } catch (err) {
                      console.error(err);
                      setSearchError('অনুসন্ধান করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
                    } finally {
                      setSearchLoading(false);
                    }
                  }} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="হাসপাতাল নাম্বার বা রোগীর নাম লিখুন"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-900 focus:border-blue-600 transition-all"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={searchLoading}
                      className="px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {searchLoading ? 'খোঁজা হচ্ছে...' : 'সার্চ করুন'}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="mt-12 space-y-6">
                      {searchResults.map((result) => (
                        <motion.div 
                          key={`search-res-${result.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-8 bg-slate-50 border-2 border-slate-200 text-left space-y-6"
                        >
                          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">রোগীর নাম</p>
                              <h4 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                {result.name}
                                <VerificationBadge badge={result.verifiedBadge} size={20} />
                              </h4>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{result.hospitalNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">সিরিয়াল নাম্বার</p>
                              <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg ml-auto">
                                {result.serialNumber}
                              </div>
                            </div>
                          </div>

                          {searchError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-none flex items-center justify-center gap-2"
                    >
                      <AlertCircle size={18} />
                      {searchError}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ডাক্তার</p>
                              <p className="font-black text-slate-800 flex items-center gap-1">
                                {doctors.find(d => d.id === result.doctorId)?.name || 'N/A'}
                                <VerificationBadge badge={doctors.find(d => d.id === result.doctorId)?.verifiedBadge} size={14} />
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">তারিখ</p>
                              <p className="font-black text-slate-800">{format(new Date(result.date), 'd MMMM, yyyy', { locale: bn })}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">অবস্থা</p>
                              <span className={cn(
                                "text-[10px] font-black px-4 py-1.5 rounded-none uppercase tracking-widest border-2 inline-block",
                                result.status === 'completed' ? "bg-slate-100 text-slate-400 border-slate-200" :
                                result.status === 'running' ? "bg-red-50 text-red-600 border-red-100" :
                                result.status === 'next' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                "bg-emerald-50 text-emerald-600 border-emerald-100"
                              )}>
                                {result.status === 'completed' ? 'সম্পন্ন' :
                                 result.status === 'running' ? 'রানিং' :
                                 result.status === 'next' ? 'এরপর' : 'অপেক্ষমান'}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ইনভয়েস</p>
                              <p className="font-black text-slate-800">{result.invoiceNumber || '-'}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-slate-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center shadow-md" style={{ backgroundColor: primaryColor }}>
                  <Activity size={16} />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {settings?.hospitalName || 'পেশেন্ট পোর্টাল'}
                </h3>
              </div>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">
                আপনার সুস্বাস্থ্যই আমাদের একমাত্র লক্ষ্য। আধুনিক চিকিৎসা সেবা পৌঁছে দিতে আমরা বদ্ধপরিকর।
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">যোগাযোগ</h4>
              <div className="space-y-3">
                {settings?.portalContactNumber && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={16} className="text-blue-600" />
                    <span className="font-bold">{settings.portalContactNumber}</span>
                  </div>
                )}
                {settings?.portalAddress && (
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPin size={16} className="text-blue-600 mt-1 shrink-0" />
                    <span className="font-bold">{settings.portalAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">জরুরী সেবা</h4>
              <p className="text-slate-600 font-bold text-sm">
                যে কোনো জরুরী প্রয়োজনে আমাদের হটলাইন নাম্বারে ২৪/৭ কল করুন।
              </p>
              <div className="space-y-2">
                <div className="p-4 bg-red-50 border-2 border-red-100 text-red-600 font-black text-center uppercase tracking-widest text-xs">
                  Emergency: 10666
                </div>
                {settings?.portalEmergencyContacts?.map((contact, idx) => (
                  <div key={`emergency-contact-${idx}`} className="p-3 bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{contact.name}</span>
                    <span className="text-xs font-black text-blue-600">{contact.number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              &copy; {new Date().getFullYear()} {settings?.hospitalName}. All rights reserved.
            </p>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              Designed by <span className="text-blue-600">Kawsar</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Welcome Popup */}
      <AnimatePresence>
        {showWelcomePopup && settings?.patientWelcomePopup?.enabled && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            {(() => {
              const popupSettings = settings?.patientWelcomePopup;
              if (!popupSettings) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col"
                >
                  {/* Decorative Header */}
                  <div className="h-32 bg-blue-600 relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mt-16 blur-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-none flex items-center justify-center mb-2 border border-white/30">
                        <Sparkles className="text-white" size={32} />
                      </div>
                      <h2 className="text-white text-xl font-black uppercase tracking-widest">স্বাগতম</h2>
                    </div>
                  </div>

                  <div className="p-8 md:p-10 text-center space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {popupSettings.title}
                      </h3>
                      <p className="text-slate-500 font-bold text-sm md:text-base leading-relaxed">
                        {popupSettings.content}
                      </p>
                    </div>

                    {popupSettings.features && popupSettings.features.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 py-4">
                        {popupSettings.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 text-left">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <CheckCircle2 size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 space-y-4">
                      <button
                        onClick={() => setShowWelcomePopup(false)}
                        className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                      >
                        শুরু করুন
                      </button>
                      {popupSettings.footerText && (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                          {popupSettings.footerText}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
