import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, storage, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs, limit, doc, updateDoc, deleteDoc, setDoc, where, orderBy } from 'firebase/firestore';
import { updateEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Doctor, Patient, AppSettings, ActivityLog, UserPermissions } from './types';
import * as XLSX from 'xlsx';
import { useAuth } from './contexts/AuthContext';
import DataBackup from './components/DataBackup';
import UserManagement from './components/UserManagement';
import Sidebar from './components/admin/Sidebar';
import { 
  Users, 
  UserX,
  UserPlus, 
  User as UserIcon,
  Settings, 
  Monitor, 
  LogOut, 
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown, 
  Search,
  CheckCircle2,
  Info,
  Trash2,
  Edit2,
  Mail,
  Plus,
  LogIn,
  Key,
  CalendarCheck,
  RefreshCw,
  Stethoscope,
  ShieldCheck,
  Upload,
  Loader2,
  X,
  Megaphone,
  Building2,
  LayoutDashboard,
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Link as LinkIcon,
  Activity,
  Play,
  MessageSquare,
  AlertCircle,
  Edit,
  Palette,
  Menu,
  Phone,
  Lock,
  Save,
  Layers,
  Image as ImageIcon,
  Type,
  Eye,
  EyeOff,
  MonitorPlay,
  Sparkles,
  Settings2,
  BellRing,
  History,
  Database,
  HelpCircle,
  Fingerprint,
  Smartphone,
  Hash,
  Printer,
  Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from './lib/utils';
import { iconMap, iconNames } from './lib/icons';
import DoctorOverview from './DoctorOverview';
import OpdSummary from './components/admin/OpdSummary';
import PatientManagement from './components/PatientManagement';
import { 
  sendNotification, 
  requestNotificationPermission, 
  checkNotificationPermission, 
  isInsideIframe 
} from './lib/notifications';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

import { IconPickerModal, ProfileDropdown } from './components/admin/AdminModals';
import { StatCard, NavItem, VerificationBadge } from './components/admin/AdminComponents';
import MobileNavigation from './components/admin/MobileNavigation';
import DoctorSelector from './components/admin/DoctorSelector';
import RegistrationDoctorSelector from './components/admin/RegistrationDoctorSelector';
import RegistrationServiceSelector from './components/admin/RegistrationServiceSelector';
import DoctorSelectionModal from './components/DoctorSelectionModal';

const DEFAULT_SETTINGS: AppSettings = {
  hospitalName: 'সাজেদা জব্বার হাসপাতাল',
  slogan: 'সেবাই আমাদের মূল লক্ষ্য',
  primaryColor: '#2563eb',
  fontColor: '#ffffff',
  websiteTitle: 'সাজেদা জব্বার হাসপাতাল | লাইভ সিরিয়াল',
  loadingText: 'লোড হচ্ছে...',
  nextPatientBg: '#3b82f6',
  nextPatientText: '#ffffff',
  absentPatientBg: '#f97316',
  absentPatientText: '#ffffff',
  procedureColor: '#10b981',
  displayBgColor: '#f8fafc',
  displayCardBgColor: '#ffffff',
  displayHeaderBgColor: '#ffffff',
  departments: ['মেডিসিন', 'কার্ডিওলজি', 'পেডিয়াট্রিক', 'গাইনি', 'ওটি (OT)', 'অর্থোপেডিক', 'দন্ত', 'ইএনটি (ENT)', 'ইউরোলজি'],
  enablePatientPortal: true,
  patientPortalWelcomeMessage: 'আমাদের হাসপাতালে আপনাকে স্বাগতম',
  patientPortalNotice: '',
  mobileNavEnabled: true,
  mobileNavStyle: 'bottom-bar',
  mobileNavItems: {
    dashboard: true,
    registration: true,
    doctor: true,
    patient: true,
    settings: true,
    account: true
  },
  welcomePopup: {
    enabled: true,
    title: 'স্বাগতম!',
    content: 'আমাদের সফটওয়্যারে আপনাকে স্বাগতম। এখানে আপনি সহজেই সিরিয়াল ম্যানেজমেন্ট এবং পেশেন্ট রেকর্ড সংরক্ষণ করতে পারবেন।',
    features: [
      'সহজ সিরিয়াল ম্যানেজমেন্ট',
      'পেশেন্ট রেকর্ড সংরক্ষণ',
      'লাইভ ডিসপ্লে কন্ট্রোল',
      'বিস্তারিত রিপোর্ট জেনারেশন'
    ],
    footerText: 'DESIGN BY KAWSAR',
    showEveryTime: true
  },
  patientWelcomePopup: {
    enabled: true,
    title: 'পেশেন্ট পোর্টালে স্বাগতম!',
    content: 'আপনার সুস্বাস্থ্য আমাদের কাম্য। এখানে আপনি আপনার সিরিয়াল স্ট্যাটাস এবং হাসপাতালের আপডেট দেখতে পারবেন।',
    features: [
      'লাইভ সিরিয়াল স্ট্যাটাস',
      'ডাক্তারের শিডিউল চেক',
      'জরুরী নোটিশ প্রাপ্তি',
      'সহজ অ্যাপয়েন্টমেন্ট ট্র্যাকিং'
    ],
    footerText: 'DESIGN BY KAWSAR',
    showEveryTime: true
  },
  opdSummarySections: {
    patientSummary: true,
    ultrasonogram: true,
    gynecology: true,
    radiology: true,
    emergency: true,
    dentalSurgery: true,
    cardiology: true,
    gastroenterology: true,
  },
  opdSummarySectionTitles: {
    patientSummary: 'PATIENT SUMMARY',
    ultrasonogram: 'ULTRASONOGRAM',
    gynecology: 'GYNECOLOGY',
    radiology: 'RADIOLOGY',
    emergency: 'EMERGENCY',
    dentalSurgery: 'DENTAL SURGERY',
    cardiology: 'CARDIOLOGY',
    gastroenterology: 'GASTROENTEROLOGY',
  },
  opdSummarySectionDepts: {
    ultrasonogram: 'ULTRASONOGRAM',
    gynecology: 'GYNECOLOGY',
    radiology: 'RADIOLOGY',
    emergency: 'EMERGENCY',
    dentalSurgery: 'DENTAL SURGERY',
    cardiology: 'CARDIOLOGY',
    gastroenterology: 'GASTROENTEROLOGY',
  },
  opdSummarySectionOrder: [
    'patientSummary',
    'ultrasonogram',
    'gynecology',
    'radiology',
    'emergency',
    'dentalSurgery',
    'cardiology',
    'gastroenterology'
  ],
  emailTemplates: {
    newRegistration: {
      subject: 'রেজিস্ট্রেশন সফল হয়েছে',
      body: 'আমাদের হাসপাতালে রেজিস্ট্রেশন করার জন্য ধন্যবাদ। আপনার ইউজার আইডি এবং পাসওয়ার্ড ব্যবহার করে লগইন করুন।'
    },
    passwordReset: {
      subject: 'পাসওয়ার্ড রিসেট রিকোয়েস্ট',
      body: 'আপনার পাসওয়ার্ড রিসেট করার জন্য নিচের লিঙ্কে ক্লিক করুন।'
    },
    appointmentConfirmation: {
      subject: 'অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে',
      body: 'আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে। অনুগ্রহ করে সময়মতো উপস্থিত থাকুন।'
    }
  }
};

export default function AdminPanel() {
  const { userProfile, signOut: firebaseSignOut, isAdmin, isSuperAdmin } = useAuth();
  const { user } = useAuth();

  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    setNotificationPermission(checkNotificationPermission());
    setIsIframe(isInsideIframe());
  }, []);

  useEffect(() => {
    if (notificationPermission === 'default') {
      showToast('পুশ নোটিফিকেশন চালু করার জন্য অনুমতি দিন।', 'info');
    }
  }, [notificationPermission]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(checkNotificationPermission());
    if (granted) {
      showToast('নোটিফিকেশন অনুমতি সফলভাবে পাওয়া গেছে।');
    } else {
      showToast('নোটিফিকেশন অনুমতি পাওয়া যায়নি।');
    }
  };

  const hasPermission = (permission: keyof UserPermissions) => {
    if (isAdmin) return true;
    return userProfile?.permissions?.[permission] || false;
  };

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name || '');
      setProfileUsername(userProfile.username || '');
      setProfileEmail(userProfile.email || '');
      setProfileMobile(userProfile.mobile || '');
      setProfilePhotoURL(userProfile.photoURL || '');
      
      if (!sessionStorage.getItem('loginLogged')) {
        logActivity('auth', 'লগইন', `${userProfile.name} সিস্টেমে প্রবেশ করেছেন।`);
        sessionStorage.setItem('loginLogged', 'true');
      }
    }
  }, [userProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !auth.currentUser) return;

    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি আপনার প্রোফাইল তথ্য আপডেট করতে চান?',
      onConfirm: async () => {
        setIsUpdatingProfile(true);

        try {
          const newUsername = profileUsername.toLowerCase().trim();
          const newEmail = profileEmail.toLowerCase().trim();
          
          if (newUsername.includes(' ')) {
            showToast('ইউজারনেমে কোনো স্পেস (Space) থাকা যাবে না।');
            setIsUpdatingProfile(false);
            return;
          }

          // 1. Update Firestore Profile
          await updateDoc(doc(db, 'users', userProfile.uid), {
            name: profileName,
            username: newUsername,
            email: newEmail,
            mobile: profileMobile,
            photoURL: profilePhotoURL
          });

          // 2. Try to update Auth Email (Login ID)
          try {
            if (auth.currentUser.email !== newEmail) {
              await updateEmail(auth.currentUser, newEmail);
            }
          } catch (authErr: any) {
            console.error("Auth email update failed:", authErr);
            if (authErr.code === 'auth/requires-recent-login') {
              showToast('ইমেইল পরিবর্তনের জন্য আপনাকে পুনরায় লগইন করতে হবে।');
            }
          }

          await logActivity('auth', 'প্রোফাইল আপডেট', `${userProfile.name} তার প্রোফাইল তথ্য আপডেট করেছেন।`);
          showToast('প্রোফাইল সফলভাবে আপডেট করা হয়েছে।');
        } catch (err) {
          console.error(err);
          showToast('প্রোফাইল আপডেট করা সম্ভব হয়নি।');
        } finally {
          setIsUpdatingProfile(false);
        }
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newPassword) return;
    
    if (newPassword !== confirmPassword) {
      showToast('পাসওয়ার্ড দুটি মেলেনি।');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি আপনার পাসওয়ার্ড পরিবর্তন করতে চান?',
      onConfirm: async () => {
        setIsUpdatingPassword(true);

        try {
          const { updatePassword } = await import('firebase/auth');
          await updatePassword(auth.currentUser!, newPassword);
          setNewPassword('');
          setConfirmPassword('');
          await logActivity('auth', 'পাসওয়ার্ড পরিবর্তন', `${userProfile?.name} তার পাসওয়ার্ড পরিবর্তন করেছেন।`);
          showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
        } catch (err: any) {
          console.error(err);
          if (err.code === 'auth/requires-recent-login') {
            showToast('নিরাপত্তার স্বার্থে পাসওয়ার্ড পরিবর্তনের জন্য আপনাকে পুনরায় লগইন করতে হবে।');
          } else {
            showToast('পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।');
          }
        } finally {
          setIsUpdatingPassword(false);
        }
      }
    });
  };

  const signOut = async () => {
    if (userProfile) {
      await logActivity('auth', 'লগআউট', `${userProfile.name} সিস্টেম থেকে প্রস্থান করেছেন।`);
      sessionStorage.removeItem(`welcome_popup_seen_${userProfile.uid}`);
    }
    sessionStorage.removeItem('loginLogged');
    await firebaseSignOut();
  };
  const [activeTab, setActiveTab] = useState('dashboard-opd-summary');
  const [systemTab, setSystemTab] = useState('profile');
  const [userTab, setUserTab] = useState<'my-profile' | 'staff-users' | 'patient-management'>('my-profile');
  const [activeAdvancedSetting, setActiveAdvancedSetting] = useState<'profile-info' | 'change-password' | '2fa' | 'activity-logs' | 'sessions' | null>(null);
  const [isRegistrationExpanded, setIsRegistrationExpanded] = useState(false);
  const [isDoctorsExpanded, setIsDoctorsExpanded] = useState(false);
  const [isUserManagementExpanded, setIsUserManagementExpanded] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  
  // Profile Edit States
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [profilePhotoURL, setProfilePhotoURL] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [userActivityLogs, setUserActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorListTab, setDoctorListTab] = useState<'all' | 'today' | 'procedures'>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 10;
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = patients.slice(indexOfFirstPatient, indexOfLastPatient);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [iconPicker, setIconPicker] = useState<{ isOpen: boolean, key: string | null, currentIcon: string | null }>({ isOpen: false, key: null, currentIcon: null });
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<Doctor | null>(null);
  const [showScheduleEditModal, setShowScheduleEditModal] = useState(false);
  const [editingDoctorForSchedule, setEditingDoctorForSchedule] = useState<Doctor | null>(null);
  const [scheduleEditDays, setScheduleEditDays] = useState<string[]>([]);
  const [scheduleEditTime, setScheduleEditTime] = useState('');
  const [scheduleEditRoom, setScheduleEditRoom] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const logActivity = async (type: ActivityLog['type'], action: string, details: string) => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        action,
        details,
        timestamp: serverTimestamp(),
        type
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Fetch logs when activeAdvancedSetting is 'activity-logs'
  useEffect(() => {
    if (activeAdvancedSetting === 'activity-logs' && userProfile?.uid) {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const q = query(
            collection(db, 'activityLogs'),
            where('userId', '==', userProfile.uid),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          const logs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserActivityLogs(logs);
        } catch (error) {
          console.error("Error fetching logs:", error);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [activeAdvancedSetting, userProfile?.uid]);

  // Set current session info when activeAdvancedSetting is 'sessions'
  useEffect(() => {
    if (activeAdvancedSetting === 'sessions' && auth.currentUser) {
      const user = auth.currentUser;
      setCurrentSession({
        lastSignInTime: user.metadata.lastSignInTime,
        creationTime: user.metadata.creationTime,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      });
    }
  }, [activeAdvancedSetting]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  useEffect(() => {
    setCurrentPage(1);
    setHasSearched(false);
  }, [selectedDoctorId, selectedDepartment, selectedProcedure, selectedMonth, selectedYear, startDate, endDate]);

  useEffect(() => {
    if (settings?.welcomePopup?.enabled && userProfile) {
      const hasSeenPopup = sessionStorage.getItem(`welcome_popup_seen_${userProfile.uid}`);
      if (!hasSeenPopup) {
        setShowWelcomePopup(true);
        sessionStorage.setItem(`welcome_popup_seen_${userProfile.uid}`, 'true');
      }
    }
  }, [settings?.welcomePopup, userProfile]);

  const canViewOverview = isAdmin || userProfile?.permissions?.canViewOverview;
  const canViewDashboard = isAdmin || userProfile?.permissions?.canViewDashboard;
  const canViewOpdDashboard = isAdmin || userProfile?.permissions?.canViewOpdDashboard;
  const canViewRegistration = isAdmin || userProfile?.permissions?.canViewRegistration;
  const canCreateSerial = isAdmin || userProfile?.permissions?.canCreateSerial;
  const canEditSerial = isAdmin || userProfile?.permissions?.canEditSerial;
  const canDeleteSerial = isAdmin || userProfile?.permissions?.canDeleteSerial;
  const canViewLive = isAdmin || userProfile?.permissions?.canViewLive;
  const canViewDoctors = isAdmin || userProfile?.permissions?.canViewDoctors;
  const canManageDoctors = isAdmin || userProfile?.permissions?.canManageDoctors;
  const canViewPatients = isAdmin || userProfile?.permissions?.canViewPatients;
  const canManagePatients = isAdmin || userProfile?.permissions?.canManagePatients;
  const canViewReports = isAdmin || userProfile?.permissions?.canViewPatientReports;
  const canViewActivityLogs = isAdmin || userProfile?.permissions?.canViewActivityLogs;
  const canManageSettings = isAdmin || userProfile?.permissions?.canManageSettings;
  const canManageUsers = isAdmin || userProfile?.permissions?.canManageUsers;
  const canViewProfile = isAdmin || userProfile?.permissions?.canViewProfile;

  // New permissions
  const canViewDoctorToday = isAdmin || userProfile?.permissions?.canViewDoctorToday;
  const canViewDoctorSchedule = isAdmin || userProfile?.permissions?.canViewDoctorSchedule;
  const canManageProcedures = isAdmin || userProfile?.permissions?.canManageProcedures;
  const canManageDepartments = isAdmin || userProfile?.permissions?.canManageDepartments;
  const canViewPatientReports = isAdmin || userProfile?.permissions?.canViewPatientReports;
  const canManageHospitalProfile = isAdmin || userProfile?.permissions?.canManageHospitalProfile;
  const canManageDisplaySettings = isAdmin || userProfile?.permissions?.canManageDisplaySettings;
  const canManagePatientPortal = isAdmin || userProfile?.permissions?.canManagePatientPortal;
  const canManageMobileNav = isAdmin || userProfile?.permissions?.canManageMobileNav;
  const canManagePushNotifications = isAdmin || userProfile?.permissions?.canManagePushNotifications;
  const canManageWelcomePopup = isAdmin || userProfile?.permissions?.canManageWelcomePopup;
  const canManageLoginPage = isAdmin || userProfile?.permissions?.canManageLoginPage;
  const canManageBackup = isAdmin || userProfile?.permissions?.canManageBackup;
  const canManageAppAppearance = isAdmin || userProfile?.permissions?.canManageAppAppearance;
  const canViewAnalytics = isAdmin || userProfile?.permissions?.canViewAnalytics;
  const canExportData = isAdmin || userProfile?.permissions?.canExportData;
  const canViewSystemStatus = isAdmin || userProfile?.permissions?.canViewSystemStatus;

  useEffect(() => {
    if (!userProfile) return;
    
    // Permission-based tab protection
    const checkAccess = () => {
      if (activeTab === 'dashboard-opd-summary') {
        if (!canViewOverview) setActiveTab('dashboard-overview');
      } else if (activeTab === 'dashboard-overview') {
        if (!canViewDashboard) setActiveTab('system-settings');
      } else if (activeTab === 'registration' || activeTab === 'registration-procedure') {
        if (!canViewRegistration) setActiveTab('dashboard-overview');
      } else if (activeTab === 'management') {
        if (!canViewLive) setActiveTab('dashboard-overview');
      } else if (activeTab === 'doctors-list' || activeTab === 'doctors-today' || activeTab === 'doctors-schedule' || activeTab === 'doctors-department' || activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports') {
        if (!canViewDoctors) setActiveTab('dashboard-overview');
      } else if (activeTab === 'system-settings') {
        if (!canManageSettings) {
          setActiveTab('user-management');
          setUserTab('my-profile');
        }
      } else if (activeTab === 'user-management') {
        if (userTab === 'patient-management' && !canManagePatients) {
          setUserTab('my-profile');
        } else if (userTab === 'staff-users' && !canManageUsers) {
          setUserTab('my-profile');
        } else if (userTab === 'my-profile' && !canViewProfile) {
          if (canManageUsers) {
            setUserTab('staff-users');
          } else if (canManagePatients) {
            setUserTab('patient-management');
          } else {
            setActiveTab('dashboard-overview');
          }
        }
      }
    };

    checkAccess();
  }, [activeTab, systemTab, canViewDashboard, canCreateSerial, canEditSerial, canManageDoctors, canManageSettings, isAdmin, userProfile]);

  useEffect(() => {
    if (activeTab === 'registration' || activeTab === 'registration-procedure') {
      setIsRegistrationExpanded(true);
    } else if (activeTab === 'doctors-list' || activeTab === 'doctors-today' || activeTab === 'doctors-schedule' || activeTab === 'doctors-department' || activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports') {
      setIsDoctorsExpanded(true);
    } else if (activeTab === 'user-management') {
      setIsUserManagementExpanded(true);
    }
  }, [activeTab, systemTab]);

  // Doctor Form states
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [isRegDoctorDropdownOpen, setIsRegDoctorDropdownOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docDeg, setDocDeg] = useState('');
  const [docDesig, setDocDesig] = useState('');
  const [docSched, setDocSched] = useState('');
  const [docRoom, setDocRoom] = useState('');
  const [docPhoto, setDocPhoto] = useState('');
  const [docCover, setDocCover] = useState('');
  const [docStatus, setDocStatus] = useState<'active' | 'inactive'>('active');
  const [docFooterNotice, setDocFooterNotice] = useState('');
  const [docScrollingNotice, setDocScrollingNotice] = useState('');
  const [docFooterScrollDuration, setDocFooterScrollDuration] = useState(20);
  const [docFooterBgColor, setDocFooterBgColor] = useState('#ffffff');
  const [docFooterTextColor, setDocFooterTextColor] = useState('#0f172a');
  const [docFooterTheme, setDocFooterTheme] = useState<'light' | 'dark'>('light');
  const [docVerifiedBadge, setDocVerifiedBadge] = useState<'none' | 'blue' | 'black' | 'green' | 'red'>('none');
  const [availableDays, setAvailableDays] = useState<string[]>(['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার']);
  const [docProcedures, setDocProcedures] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorFilterStatus, setDoctorFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [doctorCurrentPage, setDoctorCurrentPage] = useState(1);
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(1);
  const [todayCurrentPage, setTodayCurrentPage] = useState(1);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const doctorsPerPage = 8;
  const schedulePerPage = 10;
  const todayPerPage = 6;
  const [quickViewDoctor, setQuickViewDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    setDoctorCurrentPage(1);
  }, [doctorSearchQuery, doctorFilterStatus]);

  const weekDays = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];

  const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const today = dayMap[new Date().getDay()];
  const selectedDayName = dayMap[new Date(selectedDate).getDay()];

  const availableDoctorsToday = useMemo(() => doctors.filter(doc => doc.availableDays?.includes(today)), [doctors, today]);
  const availableDoctorsOnSelectedDate = useMemo(() => doctors.filter(doc => doc.availableDays?.includes(selectedDayName)), [doctors, selectedDayName]);
  const doctorsWithPatientsOnSelectedDate = useMemo(() => doctors.filter(d => allPatients.some(p => p.doctorId === d.id)), [doctors, allPatients]);

  const filteredDoctors = useMemo(() => {
    let filtered = doctors.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) || 
                          d.department.toLowerCase().includes(doctorSearchQuery.toLowerCase());
      const matchesStatus = doctorFilterStatus === 'all' || 
                          (doctorFilterStatus === 'active' && d.status !== 'inactive') ||
                          (doctorFilterStatus === 'inactive' && d.status === 'inactive');
      return matchesSearch && matchesStatus;
    });

    if (doctorListTab === 'today') {
      const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
      const todayDay = dayMap[new Date().getDay()];
      filtered = filtered.filter(d => d.availableDays?.includes(todayDay));
    } else if (doctorListTab === 'procedures') {
      filtered = filtered.filter(d => d.procedures && d.procedures.length > 0);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors, doctorSearchQuery, doctorFilterStatus, doctorListTab]);

  const paginatedDoctors = useMemo(() => {
    const startIndex = (doctorCurrentPage - 1) * doctorsPerPage;
    return filteredDoctors.slice(startIndex, startIndex + doctorsPerPage);
  }, [filteredDoctors, doctorCurrentPage, doctorsPerPage]);

  const totalDoctorPages = Math.ceil(filteredDoctors.length / doctorsPerPage);

  const filteredScheduleDoctors = useMemo(() => {
    return doctors.filter(d => 
      d.name.toLowerCase().includes(scheduleSearchQuery.toLowerCase()) || 
      d.department.toLowerCase().includes(scheduleSearchQuery.toLowerCase())
    );
  }, [doctors, scheduleSearchQuery]);

  const paginatedScheduleDoctors = useMemo(() => {
    const startIndex = (scheduleCurrentPage - 1) * schedulePerPage;
    return filteredScheduleDoctors.slice(startIndex, startIndex + schedulePerPage);
  }, [filteredScheduleDoctors, scheduleCurrentPage, schedulePerPage]);

  const totalSchedulePages = Math.ceil(filteredScheduleDoctors.length / schedulePerPage);

  const paginatedTodayDoctors = useMemo(() => {
    const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const todayDay = dayMap[new Date().getDay()];
    const todayDoctors = doctors.filter(d => d.availableDays?.includes(todayDay));
    const startIndex = (todayCurrentPage - 1) * todayPerPage;
    return todayDoctors.slice(startIndex, startIndex + todayPerPage);
  }, [doctors, todayCurrentPage, todayPerPage]);

  const totalTodayPages = useMemo(() => {
    const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const todayDay = dayMap[new Date().getDay()];
    const todayDoctors = doctors.filter(d => d.availableDays?.includes(todayDay));
    return Math.ceil(todayDoctors.length / todayPerPage);
  }, [doctors, todayPerPage]);

  const generalPatientsAll = useMemo(() => allPatients.filter(p => (p.service === 'general' || !p.service) && p.patientType === 'new'), [allPatients]);
  const procedurePatientsAll = useMemo(() => allPatients.filter(p => p.service && p.service !== 'general'), [allPatients]);

  // Doctors to show in Dashboard and Management
  const displayDoctors = useMemo(() => Array.from(new Set([
    ...availableDoctorsOnSelectedDate.map(d => d.id),
    ...doctorsWithPatientsOnSelectedDate.map(d => d.id)
  ])).map(id => doctors.find(d => d.id === id)).filter(Boolean) as Doctor[], [availableDoctorsOnSelectedDate, doctorsWithPatientsOnSelectedDate, doctors]);

  // Patient Form states
  const [patientName, setPatientName] = useState('');
  const [hospitalNumber, setHospitalNumber] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientType, setPatientType] = useState('new'); // নতুন বা ফলোআপ
  const [selectedServices, setSelectedServices] = useState<string[]>(['general']);


  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [nextSerialGeneral, setNextSerialGeneral] = useState(1);
  const [nextSerialProcedure, setNextSerialProcedure] = useState(1);
  const [manualSerial, setManualSerial] = useState(1);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [autoPrint, setAutoPrint] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardSelectedDept, setDashboardSelectedDept] = useState('all');
  const [dashboardSelectedService, setDashboardSelectedService] = useState<string | 'all'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const procedureConfig: Record<string, { label: string, icon: React.ReactNode, color: string, accentColor: string }> = {
    'ultrasonogram': { label: 'প্রসিডিওর', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-cyan-600 to-cyan-700', accentColor: 'text-cyan-600' },
    'echo-2d': { label: 'ইকো 2D', icon: <TrendingUp className="w-6 h-6" />, color: 'bg-gradient-to-br from-purple-600 to-purple-700', accentColor: 'text-purple-600' },
    'endoscopy': { label: 'এন্ডোস্কপি', icon: <Clock className="w-6 h-6" />, color: 'bg-gradient-to-br from-orange-600 to-orange-700', accentColor: 'text-orange-600' },
    'colonoscopy': { label: 'কোলোনোস্কপি', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-pink-600 to-pink-700', accentColor: 'text-pink-600' },
    'root-canal': { label: 'রুট ক্যানেল', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-teal-600 to-teal-700', accentColor: 'text-teal-600' },
    'extraction': { label: 'এক্সট্রাকশন', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-red-600 to-red-700', accentColor: 'text-red-600' },
    'pulpectomy': { label: 'পালপেক্টমি', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-indigo-600 to-indigo-700', accentColor: 'text-indigo-600' },
    'filling': { label: 'ফিলিং', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-amber-600 to-amber-700', accentColor: 'text-amber-600' },
    'scalling': { label: 'স্কেলিং', icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-lime-600 to-lime-700', accentColor: 'text-lime-600' },
  };

  const getProcedureConfig = (proc: string) => {
    const config = procedureConfig[proc];
    if (config) return config;
    return { label: proc, icon: <Activity className="w-6 h-6" />, color: 'bg-gradient-to-br from-slate-600 to-slate-700', accentColor: 'text-slate-600' };
  };

  const handleStatCardClick = (service: string) => {
    if (dashboardSelectedService === service) {
      setDashboardSelectedService('all');
    } else {
      setDashboardSelectedService(service);
      setDashboardSelectedDept('all');
    }
  };
  const [selectedDoctorForNotice, setSelectedDoctorForNotice] = useState<string | 'global'>('global');

  useEffect(() => {
    if (activeTab === 'registration') {
      setManualSerial(nextSerialGeneral);
      setSelectedServices(['general']);
    } else if (activeTab === 'registration-procedure') {
      setManualSerial(nextSerialProcedure);
      
      const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
      let availableProcedures: string[] = [];
      if (selectedDoctor?.procedures && selectedDoctor.procedures.length > 0) {
        availableProcedures = selectedDoctor.procedures;
      } else {
        availableProcedures = settings?.procedures?.filter(proc => {
          if (!selectedDoctor) return true;
          const procDept = settings?.procedureDepartmentMap?.[proc];
          return procDept === selectedDoctor.department;
        }) || [];
      }

      setSelectedServices(prev => {
        // If current selected service is not in available procedures, clear it or set to default
        if (prev.length > 0 && prev[0] !== 'general' && !availableProcedures.includes(prev[0])) {
          return availableProcedures.length > 0 ? [availableProcedures[0]] : [];
        }
        // Only set a default procedure if currently 'general' or empty
        if (prev.length === 0 || (prev.length === 1 && prev[0] === 'general')) {
          return availableProcedures.length > 0 ? [availableProcedures[0]] : ['ultrasonogram'];
        }
        return prev;
      });
    }
  }, [nextSerialGeneral, nextSerialProcedure, activeTab, selectedDoctorId, doctors, settings]);

  const processedPatientsData = useMemo(() => {
    const doctorPatients = allPatients.filter(p => p.doctorId === selectedDoctorId);
    const generalPatients = doctorPatients.filter(p => p.service === 'general' || !p.service);
    const procedurePatients = doctorPatients.filter(p => p.service && p.service !== 'general');

    const maxSerialGeneral = generalPatients.reduce((max, p) => Math.max(max, p.serialNumber), 0);
    const maxSerialProcedure = procedurePatients.reduce((max, p) => Math.max(max, p.serialNumber), 0);

    const newCount = generalPatients.filter(p => p.patientType === 'new').length;
    const followupCount = generalPatients.filter(p => p.patientType === 'followup').length;
    const totalCount = generalPatients.length;

    return {
      doctorPatients,
      nextSerialGeneral: maxSerialGeneral + 1,
      nextSerialProcedure: maxSerialProcedure + 1,
      newCount,
      followupCount,
      totalCount
    };
  }, [allPatients, selectedDoctorId]);

  useEffect(() => {
    setPatients(processedPatientsData.doctorPatients);
    setNextSerialGeneral(processedPatientsData.nextSerialGeneral);
    setNextSerialProcedure(processedPatientsData.nextSerialProcedure);
  }, [processedPatientsData]);

  useEffect(() => {
    const unsubDoctors = onSnapshot(query(collection(db, 'doctors'), where('status', '==', 'active')), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
      setDoctors(docs);
      if (docs.length > 0 && !selectedDoctorId) setSelectedDoctorId(docs[0].id);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'doctors'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          welcomePopup: {
            ...DEFAULT_SETTINGS.welcomePopup!,
            ...(data.welcomePopup || {})
          },
          patientWelcomePopup: {
            ...DEFAULT_SETTINGS.patientWelcomePopup!,
            ...(data.patientWelcomePopup || {})
          }
        } as AppSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/general'));

    let unsubLogs: () => void = () => {};
    if (isAdmin || userProfile?.permissions?.canViewActivityLogs) {
      const qLogs = query(collection(db, 'activityLogs'), limit(200));
      unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
        setActivityLogs(logs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'activityLogs'));
    }

    return () => {
      unsubDoctors();
      unsubSettings();
      unsubLogs();
    };
  }, [isAdmin, userProfile?.permissions?.canViewActivityLogs, selectedDoctorId]);

  useEffect(() => {
    if (activeTab === 'registration-procedure') {
      const currentDoc = doctors.find(d => d.id === selectedDoctorId);
      
      // If no doctor selected, try to pick the first available one
      if (!selectedDoctorId && availableDoctorsOnSelectedDate.length > 0) {
        setSelectedDoctorId(availableDoctorsOnSelectedDate[0].id);
      }
    }
  }, [selectedDoctorId, activeTab, doctors, availableDoctorsOnSelectedDate]);

  useEffect(() => {
    const todayStr = selectedDate;
    const q = query(
      collection(db, 'patients'),
      where('date', '==', todayStr)
    );
    const unsubPatients = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      // Sort client-side to avoid composite index requirement
      docs.sort((a, b) => a.serialNumber - b.serialNumber);
      setAllPatients(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

    return () => unsubPatients();
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'management') {
      const doctorsWithPatients = doctors.filter(d => allPatients.some(p => p.doctorId === d.id));
      const todaysPatients = allPatients.filter(p => p.date === selectedDate);
      const doctorsWithTodaysPatients = displayDoctors.filter(d => todaysPatients.some(p => p.doctorId === d.id));

      if (doctorsWithTodaysPatients.length > 0) {
        const isCurrentValid = doctorsWithTodaysPatients.some(d => d.id === selectedDoctorId);
        if (!isCurrentValid) {
          setSelectedDoctorId(doctorsWithTodaysPatients[0].id);
        }
      } else if (displayDoctors.length > 0) {
        setSelectedDoctorId(displayDoctors[0].id);
      }
    }
  }, [activeTab, allPatients, doctors, selectedDoctorId]);

  const patientTypeStats = {
    new: allPatients.filter(p => p.patientType === 'new').length,
    followup: allPatients.filter(p => p.patientType === 'followup').length,
  };

  const dashboardFilteredPatients = allPatients.filter(p => {
    const doc = doctors.find(d => d.id === p.doctorId);
    const matchesDept = dashboardSelectedDept === 'all' || doc?.department === dashboardSelectedDept;
    const matchesService = dashboardSelectedService === 'all' || p.service === dashboardSelectedService;
    return matchesDept && matchesService;
  });

  const dashboardFilteredDoctors = dashboardSelectedDept === 'all'
    ? availableDoctorsOnSelectedDate
    : availableDoctorsOnSelectedDate.filter(d => d.department === dashboardSelectedDept);

  const availableProceduresToday = Array.from(new Set(
    availableDoctorsOnSelectedDate.flatMap(d => d.procedures || [])
  )) as string[];

  const procedureStats = availableProceduresToday.reduce((acc, proc) => {
    acc[proc] = allPatients.filter(p => p.date === selectedDate && p.service === proc).length;
    return acc;
  }, {} as Record<string, number>);

  const dashboardStats = {
    todayDoctors: dashboardFilteredDoctors.length,
    todayPatients: allPatients.filter(p => p.date === selectedDate && (p.service === 'general' || !p.service) && p.patientType === 'new').length,
    ultrasonogram: allPatients.filter(p => p.date === selectedDate && p.service === 'ultrasonogram').length,
    echo2d: allPatients.filter(p => p.date === selectedDate && p.service === 'echo-2d').length,
    endoscopy: allPatients.filter(p => p.date === selectedDate && p.service === 'endoscopy').length,
    colonoscopy: allPatients.filter(p => p.date === selectedDate && p.service === 'colonoscopy').length,
  };

  const generalPatientsCount = allPatients.filter(p => (p.service === 'general' || !p.service) && p.patientType === 'new').length;

  const serviceStats = {
    general: allPatients.filter(p => p.service === 'general' || !p.service).length,
    ultrasonogram: allPatients.filter(p => p.service === 'ultrasonogram').length,
    echo2d: allPatients.filter(p => p.service === 'echo-2d').length,
    endoscopy: allPatients.filter(p => p.service === 'endoscopy').length,
    colonoscopy: allPatients.filter(p => p.service === 'colonoscopy').length,
  };

  const deptStats = doctors.reduce((acc, doc) => {
    const count = allPatients.filter(p => 
      p.doctorId === doc.id && 
      (!p.service || !settings?.procedures?.includes(p.service))
    ).length;
    if (count > 0) {
      acc[doc.department] = (acc[doc.department] || 0) + count;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedDepts = Object.entries(deptStats).sort((a, b) => (b[1] as number) - (a[1] as number));

    const printSerial = (patient: any) => {
    const doctor = doctors.find(d => d.id === patient.doctorId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('পপ-আপ ব্লক করা হয়েছে। অনুগ্রহ করে পপ-আপ এলাউ করুন।');
      return;
    }

    const html = `
      <html>
        <head>
          <title>সিরিয়াল প্রিন্ট - ${patient.name}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 0;
            }
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              height: 210mm;
              width: 148mm;
              justify-content: flex-start;
              align-items: center;
              background: white;
            }
            .print-content {
              text-align: center;
              width: 100%;
              padding-top: 80px;
            }
            .serial-box {
              padding: 10px 20px;
              display: inline-block;
              margin-bottom: 10px;
            }
            .serial-label {
              font-size: 14px;
              font-weight: normal;
              color: #000;
              margin-bottom: 2px;
            }
            .serial-number {
              font-size: 24px;
              font-weight: normal;
              margin: 0;
              color: #000;
              line-height: 1.2;
            }
            .room-number {
              font-size: 14px;
              font-weight: normal;
              color: #000;
              line-height: 1.2;
              margin-top: 5px;
            }
            /* Hide everything else */
            * {
              -webkit-print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="print-content">
            <div class="serial-box">
              <div class="serial-label">সিরিয়াল নাম্বার</div>
              <div class="serial-number">${patient.serialNumber}</div>
            </div>
            <div class="room-number">রুম নম্বর: ${doctor?.roomNumber || 'N/A'}</div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateSerial) {
      showToast('আপনার সিরিয়াল তৈরি করার অনুমতি নেই।');
      return;
    }
    if (!patientName || !selectedDoctorId) return;
    if (activeTab === 'registration-procedure' && selectedServices.length === 0) {
      showToast('অনুগ্রহ করে অন্তত একটি সার্ভিস নির্বাচন করুন।');
      return;
    }

    const hn = hospitalNumber.trim().toUpperCase();

    try {
      if (editingPatientId) {
        const patientData = {
          name: patientName,
          hospitalNumber: hn || `H${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          age: patientAge,
          patientType: patientType,
          service: selectedServices[0] || 'general',
          doctorId: selectedDoctorId,
          serialNumber: manualSerial,
          invoiceNumber: invoiceNumber,
          status: patients.find(p => p.id === editingPatientId)?.status || 'waiting',
          date: selectedDate
        };
        await updateDoc(doc(db, 'patients', editingPatientId), patientData);
        await logActivity('patient', 'রোগীর তথ্য আপডেট', `${patientName} এর তথ্য সংশোধন করা হয়েছে।`);
        showToast('তথ্য সফলভাবে আপডেট করা হয়েছে।', 'success');
        setEditingPatientId(null);
      } else {
        // Handle multiple services by creating multiple records
        for (let i = 0; i < selectedServices.length; i++) {
          const service = selectedServices[i];
          const currentSerial = manualSerial + i;
          
          const patientData = {
            name: patientName,
            hospitalNumber: hn || `H${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            age: patientAge,
            patientType: patientType,
            service: service,
            doctorId: (activeTab === 'registration-procedure' && settings?.procedureDoctorMap?.[service]) || selectedDoctorId,
            serialNumber: currentSerial,
            invoiceNumber: invoiceNumber,
            status: 'waiting',
            date: selectedDate,
            createdAt: serverTimestamp(),
          };

          await addDoc(collection(db, 'patients'), patientData);
          
          if (i === 0) {
            await logActivity('patient', 'নতুন রোগী যোগ', `${patientName} কে সিরিয়াল ${currentSerial} এ যোগ করা হয়েছে।`);
          }

          if (autoPrint) {
            printSerial(patientData);
          }
        }
        
        // Push Notification for New Registration
        if (settings?.pushNotificationSettings?.enabled && settings.pushNotificationSettings.subjects.newRegistration) {
          const depts = settings.pushNotificationSettings.departments;
          const doctor = doctors.find(d => d.id === selectedDoctorId);
          if (depts.length === 0 || depts.includes(doctor?.department || '')) {
            await sendNotification(`নতুন রেজিস্ট্রেশন: ${patientName}`, {
              body: `${selectedServices.length}টি সার্ভিস যোগ করা হয়েছে। ডাক্তার: ${doctor?.name || 'N/A'}`,
              tag: `new-reg-${manualSerial}`
            });
          }
        }

        showToast(`${selectedServices.length}টি সার্ভিস সফলভাবে যোগ করা হয়েছে।`, 'success');
      }

      setPatientName('');
      setHospitalNumber('');
      setPatientAge('');
      setPatientType('new');
      if (activeTab !== 'registration-procedure') {
        setSelectedServices(['general']);
      }
      setInvoiceNumber('');
    } catch (error) {
      console.error('Error adding/updating patient:', error);
      showToast('পেশেন্ট যোগ করতে সমস্যা হয়েছে', 'error');
    }
  };

  const openEditPatientForm = (patient: Patient) => {
    if (!canEditSerial) {
      showToast('আপনার তথ্য সংশোধন করার অনুমতি নেই।');
      return;
    }
    setEditingPatientId(patient.id);
    setPatientName(patient.name);
    setHospitalNumber(patient.hospitalNumber || '');
    setPatientAge(patient.age || '');
    setPatientType(patient.patientType || 'new');
    setSelectedServices([patient.service || 'general']);
    setInvoiceNumber(patient.invoiceNumber || '');
    setManualSerial(patient.serialNumber);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelPatientEdit = () => {
    setEditingPatientId(null);
    setPatientName('');
    setHospitalNumber('');
    setPatientAge('');
    setPatientType('new');
    setSelectedServices(['general']);
    setInvoiceNumber('');
    if (activeTab === 'registration') {
      setManualSerial(nextSerialGeneral);
    } else {
      setManualSerial(nextSerialProcedure);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageDoctors) {
      showToast('আপনার ডাক্তার ম্যানেজ করার অনুমতি নেই।');
      return;
    }
    if (!docName || !docDept) return;

    const doctorData = {
      name: docName,
      department: docDept,
      degree: docDeg,
      designation: docDesig,
      schedule: docSched,
      roomNumber: docRoom,
      photoUrl: docPhoto || `https://picsum.photos/seed/${Date.now()}/400/400`,
      coverUrl: docCover || `https://picsum.photos/seed/cover-${Date.now()}/1200/400`,
      availableDays: availableDays,
      procedures: docProcedures,
      scrollingNotice: docScrollingNotice,
      footerNotice: docFooterNotice,
      footerScrollDuration: docFooterScrollDuration,
      footerBgColor: docFooterBgColor,
      footerTextColor: docFooterTextColor,
      footerTheme: docFooterTheme,
      verifiedBadge: docVerifiedBadge,
      status: docStatus
    };

    setConfirmDialog({
      isOpen: true,
      message: editingDoctorId ? `আপনি কি নিশ্চিত যে আপনি ডাঃ ${docName} এর তথ্য সংশোধন করতে চান?` : `আপনি কি নিশ্চিত যে আপনি ডাঃ ${docName} কে যোগ করতে চান?`,
      onConfirm: async () => {
        try {
          if (editingDoctorId) {
            await updateDoc(doc(db, 'doctors', editingDoctorId), doctorData);
            await logActivity('doctor', 'ডাক্তারের তথ্য আপডেট', `ডাঃ ${docName} এর তথ্য সংশোধন করা হয়েছে।`);
          } else {
            await addDoc(collection(db, 'doctors'), doctorData);
            await logActivity('doctor', 'নতুন ডাক্তার যোগ', `ডাঃ ${docName} কে সিস্টেমে যোগ করা হয়েছে।`);
          }

          closeDoctorForm();
          showToast(editingDoctorId ? 'তথ্য সফলভাবে আপডেট করা হয়েছে।' : 'নতুন ডাক্তার সফলভাবে যোগ করা হয়েছে।', 'success');
        } catch (error) {
          handleFirestoreError(error, editingDoctorId ? OperationType.UPDATE : OperationType.CREATE, 'doctors');
        }
      }
    });
  };

  const openEditDoctorForm = (doctor: Doctor) => {
    setEditingDoctorId(doctor.id);
    setDocName(doctor.name);
    setDocDept(doctor.department);
    setDocDeg(doctor.degree);
    setDocDesig(doctor.designation);
    setDocSched(doctor.schedule);
    setDocRoom(doctor.roomNumber);
    setDocPhoto(doctor.photoUrl || '');
    setDocCover(doctor.coverUrl || '');
    setDocStatus(doctor.status || 'active');
    setDocFooterNotice(doctor.footerNotice || '');
    setDocScrollingNotice(doctor.scrollingNotice || '');
    setDocFooterScrollDuration(doctor.footerScrollDuration || 20);
    setDocFooterBgColor(doctor.footerBgColor || '#ffffff');
    setDocFooterTextColor(doctor.footerTextColor || '#0f172a');
    setDocFooterTheme(doctor.footerTheme || 'light');
    setDocVerifiedBadge(doctor.verifiedBadge || 'none');
    setAvailableDays(doctor.availableDays || []);
    setDocProcedures(doctor.procedures || []);
    setShowDoctorForm(true);
  };

  const openScheduleEditModal = (doctor: Doctor) => {
    setEditingDoctorForSchedule(doctor);
    setScheduleEditDays(doctor.availableDays || []);
    setScheduleEditTime(doctor.schedule || '');
    setScheduleEditRoom(doctor.roomNumber || '');
    setShowScheduleEditModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!editingDoctorForSchedule) return;
    setIsSavingSchedule(true);
    try {
      const doctorRef = doc(db, 'doctors', editingDoctorForSchedule.id);
      await updateDoc(doctorRef, {
        availableDays: scheduleEditDays,
        schedule: scheduleEditTime,
        roomNumber: scheduleEditRoom
      });
      
      setDoctors(prev => prev.map(d => 
        d.id === editingDoctorForSchedule.id 
          ? { ...d, availableDays: scheduleEditDays, schedule: scheduleEditTime, roomNumber: scheduleEditRoom }
          : d
      ));
      
      await logActivity('doctor', 'Update Schedule', `${editingDoctorForSchedule.name} এর শিডিউল আপডেট করা হয়েছে`);
      setShowScheduleEditModal(false);
      setEditingDoctorForSchedule(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const closeDoctorForm = () => {
    setShowDoctorForm(false);
    setEditingDoctorId(null);
    setDocName('');
    setDocDept('');
    setDocDeg('');
    setDocDesig('');
    setDocSched('');
    setDocRoom('');
    setDocPhoto('');
    setDocCover('');
    setDocStatus('active');
    setDocFooterNotice('');
    setDocScrollingNotice('');
    setDocFooterScrollDuration(20);
    setDocFooterBgColor('#ffffff');
    setDocFooterTextColor('#0f172a');
    setDocFooterTheme('light');
    setDocVerifiedBadge('none');
    setAvailableDays(['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার']);
    setDocProcedures([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      showToast("Storage is not initialized. Please check your Firebase configuration.");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `doctors/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setDocPhoto(url);
    } catch (error: any) {
      console.error("Upload failed:", error);
      showToast(`ছবি আপলোড ব্যর্থ হয়েছে: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      showToast("Storage is not initialized. Please check your Firebase configuration.");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `covers/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setDocCover(url);
    } catch (error: any) {
      console.error("Upload failed:", error);
      showToast(`কাভার ফটো আপলোড ব্যর্থ হয়েছে: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDoctor = async (id: string) => {
    if (!canManageDoctors) {
      showToast('আপনার ডাক্তার ডিলিট করার অনুমতি নেই।');
      return;
    }
    const doctor = doctors.find(d => d.id === id);
    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি এই ডাক্তারকে মুছে ফেলতে চান?',
      onConfirm: async () => {
        await deleteDoc(doc(db, 'doctors', id));
        if (doctor) {
          await logActivity('doctor', 'ডাক্তার মুছে ফেলা', `ডাঃ ${doctor.name} কে সিস্টেম থেকে মুছে ফেলা হয়েছে।`);
        }
      }
    });
  };

  useEffect(() => {
    if (settings?.pushNotificationSettings?.enabled) {
      requestNotificationPermission();
    }
  }, [settings?.pushNotificationSettings?.enabled]);

  const updatePatientStatus = async (id: string, status: string) => {
    if (!canEditSerial) {
      showToast('আপনার অবস্থা পরিবর্তন করার অনুমতি নেই।');
      return;
    }
    const patient = patients.find(p => p.id === id);
    const statusMap: Record<string, string> = {
      'waiting': 'অপেক্ষমান',
      'running': 'রানিং',
      'next': 'এরপর',
      'absent': 'অনুপস্থিত',
      'completed': 'সম্পন্ন',
      'calling': 'কল করা হচ্ছে'
    };

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${patient?.name || 'এই রোগী'} এর অবস্থা '${statusMap[status] || status}' করতে চান?`,
      onConfirm: async () => {
        await updateDoc(doc(db, 'patients', id), { status });
        
        if (patient) {
          // Push Notification Logic
          if (settings?.pushNotificationSettings?.enabled) {
            const subjects = settings.pushNotificationSettings.subjects;
            const depts = settings.pushNotificationSettings.departments;
            
            // Check if department is allowed
            const isDeptAllowed = depts.length === 0 || depts.includes(patient.department || '');
            
            if (isDeptAllowed) {
              if (status === 'calling' && subjects.doctorCall) {
                await sendNotification(`ডাক্তার কল: ${patient.name}`, {
                  body: `টোকেন নম্বর ${patient.serialNumber} কে ডাকা হচ্ছে।`,
                  tag: `call-${patient.id}`
                });
              } else if (subjects.statusChange) {
                await sendNotification(`অবস্থা পরিবর্তন: ${patient.name}`, {
                  body: `আপনার সিরিয়াল এখন '${statusMap[status] || status}' অবস্থায় আছে।`,
                  tag: `status-${patient.id}`
                });
              }
            }
          }

          await logActivity('patient', 'রোগীর অবস্থা পরিবর্তন', `${patient.name} এর অবস্থা '${statusMap[status] || status}' এ পরিবর্তন করা হয়েছে।`);
        }
      }
    });
  };

  const deletePatient = async (id: string) => {
    if (!canDeleteSerial) {
      showToast('আপনার সিরিয়াল ডিলিট করার অনুমতি নেই।');
      return;
    }
    const patient = patients.find(p => p.id === id);
    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি এই সিরিয়ালটি মুছে ফেলতে চান?',
      onConfirm: async () => {
        await deleteDoc(doc(db, 'patients', id));
        if (patient) {
          await logActivity('patient', 'সিরিয়াল মুছে ফেলা', `${patient.name} এর সিরিয়াল মুছে ফেলা হয়েছে।`);
        }
      }
    });
  };

  const updateNotice = async (notice: string) => {
    if (!canManageSettings) {
      showToast('আপনার সেটিংস পরিবর্তন করার অনুমতি নেই।');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি এই জরুরী নোটিশটি আপডেট করতে চান?',
      onConfirm: async () => {
        if (selectedDoctorForNotice === 'global') {
          if (settings) {
            await setDoc(doc(db, 'settings', 'general'), { activeNotice: notice }, { merge: true });
            await logActivity('settings', 'জরুরী নোটিশ আপডেট', `সাধারণ জরুরী নোটিশ আপডেট করা হয়েছে: "${notice}"`);
          }
        } else {
          const doctor = doctors.find(d => d.id === selectedDoctorForNotice);
          await updateDoc(doc(db, 'doctors', selectedDoctorForNotice), { activeNotice: notice });
          if (doctor) {
            await logActivity('settings', 'ডাক্তারের নোটিশ আপডেট', `ডাঃ ${doctor.name} এর জন্য জরুরী নোটিশ আপডেট করা হয়েছে: "${notice}"`);
          }
        }
        showToast('নোটিশ সফলভাবে আপডেট করা হয়েছে');
      }
    });
  };

  const [customNotice, setCustomNotice] = useState('');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [isLoaderLogoUploading, setIsLoaderLogoUploading] = useState(false);

  const [selectedNoticeCategory, setSelectedNoticeCategory] = useState('সাধারণ');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  const noticeCategories: Record<string, string[]> = {
    "সাধারণ": ["নামাজের বিরতি", "সাময়িক বিরতি", "লাঞ্চ ব্রেক", "ডাক্তার রাউন্ডে আছেন"],
    "মেডিসিন": ["জরুরী রোগী দেখছেন", "মেডিসিন স্টকে নেই", "রিপোর্ট দেখা হচ্ছে"],
    "কার্ডিওলজি": ["ইসিজি করা হচ্ছে", "ডাক্তার সিসিইউতে আছেন", "হার্ট চেকআপ চলছে"],
    "পেডিয়াট্রিক": ["ডাক্তার নার্সারিতে আছেন", "টিকা প্রদান চলছে", "শিশু পরীক্ষা করা হচ্ছে"],
    "গাইনি": ["ডাক্তার লেবার রুমে আছেন", "অপারেশন চলছে", "প্রসিডিওর চলছে"],
    "ওটি (OT)": ["ডাক্তার অপারেশন থিয়েটারে আছেন", "ওটি প্রস্তুতি চলছে", "জরুরী সার্জারি"],
    "অর্থোপেডিক": ["প্লাস্টার করা হচ্ছে", "ডাক্তার ওটি-তে আছেন", "এক্স-রে দেখা হচ্ছে"],
    "চর্ম ও যৌন": ["লেজার ট্রিটমেন্ট চলছে", "চর্ম পরীক্ষা করা হচ্ছে", "জরুরী রোগী"],
    "দন্ত": ["দাঁত তোলা হচ্ছে", "রুট ক্যানেল চলছে", "স্কেলিং করা হচ্ছে"],
    "ইএনটি (ENT)": ["কান পরীক্ষা করা হচ্ছে", "নাক পরীক্ষা চলছে", "গলার অপারেশন"],
    "ইউরোলজি": ["কিডনি চেকআপ", "ইউরিন টেস্ট রিপোর্ট", "ডাক্তার রাউন্ডে"]
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      showToast("Storage is not initialized.");
      return;
    }

    setIsLogoUploading(true);
    try {
      const storageRef = ref(storage, `settings/logo_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setSettings(prev => prev ? { ...prev, hospitalLogo: url } : null);
    } catch (error: any) {
      console.error("Logo upload failed:", error);
      showToast(`লোগো আপলোড ব্যর্থ হয়েছে: ${error.message}`);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      showToast("Storage is not initialized.");
      return;
    }

    setIsFaviconUploading(true);
    try {
      const storageRef = ref(storage, `settings/favicon_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setSettings(prev => prev ? { ...prev, favicon: url } : null);
    } catch (error: any) {
      console.error("Favicon upload failed:", error);
      showToast(`ফেভিকন আপলোড ব্যর্থ হয়েছে: ${error.message}`);
    } finally {
      setIsFaviconUploading(false);
    }
  };

  const handleLoaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      showToast("Storage is not initialized.");
      return;
    }

    setIsLoaderLogoUploading(true);
    try {
      const storageRef = ref(storage, `settings/loader_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setSettings(prev => prev ? { ...prev, loaderLogoUrl: url } : null);
    } catch (error: any) {
      console.error("Loader logo upload failed:", error);
      showToast(`লোডার লোগো আপলোড ব্যর্থ হয়েছে: ${error.message}`);
    } finally {
      setIsLoaderLogoUploading(false);
    }
  };

  // Filter patients based on criteria
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesDate = p.date >= startDate && p.date <= endDate;
      const matchesDoctor = selectedDoctorId ? p.doctorId === selectedDoctorId : true;
      const matchesDepartment = selectedDepartment ? p.department === selectedDepartment : true;
      const matchesProcedure = selectedProcedure ? p.service === selectedProcedure : true;
      
      // For month/year, assuming p.date is YYYY-MM-DD
      const pDate = new Date(p.date);
      const matchesMonth = selectedMonth ? (pDate.getMonth() + 1).toString() === selectedMonth : true;
      const matchesYear = selectedYear ? pDate.getFullYear().toString() === selectedYear : true;

      return matchesDate && matchesDoctor && matchesDepartment && matchesProcedure && matchesMonth && matchesYear;
    });
  }, [patients, startDate, endDate, selectedDoctorId, selectedDepartment, selectedProcedure, selectedMonth, selectedYear]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const doctor = doctors.find(d => d.id === selectedDoctorId);
    const doctorName = doctor ? doctor.name : 'Unknown Doctor';
    
    // Add header
    doc.setFontSize(20);
    doc.text(settings.hospitalName || 'Hospital Report', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Doctor: ${doctorName}`, 14, 25);
    doc.text(`Department: ${selectedDepartment || 'All'}`, 14, 32);
    doc.text(`Procedure: ${selectedProcedure || 'All'}`, 14, 39);
    doc.text(`Month: ${selectedMonth || 'All'}`, 14, 46);
    doc.text(`Year: ${selectedYear || 'All'}`, 14, 53);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 60);
    doc.text(`Total Patients: ${filteredPatients.length}`, 14, 67);

    const tableData = filteredPatients.map(p => [
      p.serialNumber,
      p.name,
      p.age || 'N/A',
      p.service || 'General',
      p.status === 'completed' ? 'Completed' : 
      p.status === 'running' ? 'Running' : 
      p.status === 'absent' ? 'Absent' : 'Waiting'
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Serial', 'Patient Name', 'Age', 'Service', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 }
    });

    doc.save(`patient_report_${startDate}_to_${endDate}_${doctorName.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 1. Total Summary Sheet
    const summaryData = doctors.map(doc => {
      const docPatients = filteredPatients.filter(p => p.doctorId === doc.id);
      if (docPatients.length === 0) return null;
      
      return {
        'ডাক্তারের নাম': doc.name,
        'বিভাগ': doc.department,
        'মোট রোগী': docPatients.length,
        'নতুন রোগী': docPatients.filter(p => p.patientType === 'new').length,
        'ফলোআপ রোগী': docPatients.filter(p => p.patientType === 'followup').length,
        'সম্পন্ন': docPatients.filter(p => p.status === 'completed').length,
        'অপেক্ষমান': docPatients.filter(p => p.status !== 'completed').length,
      };
    }).filter(Boolean);

    if (summaryData.length === 0) {
      showToast('এই তারিখের মধ্যে কোনো রোগীর তথ্য নেই।');
      return;
    }

    const summarySheet = XLSX.utils.json_to_sheet(summaryData as any[]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "সারসংক্ষেপ (Summary)");

    // 2. All Patients Master Sheet
    const allPatientsData = filteredPatients.map(p => {
      const doc = doctors.find(d => d.id === p.doctorId);
      const statusMap: Record<string, string> = {
        'waiting': 'অপেক্ষমান',
        'running': 'রানিং',
        'next': 'এরপর',
        'absent': 'অনুপস্থিত',
        'completed': 'সম্পন্ন'
      };
      return {
        'সিরিয়াল': p.serialNumber,
        'রোগীর নাম': p.name,
        'বয়স': p.age || '-',
        'ধরণ': p.patientType === 'new' ? 'নতুন' : 'ফলোআপ',
        'সার্ভিস': p.service === 'general' ? 'জেনারেল' : p.service || 'জেনারেল',
        'ডাক্তার': doc?.name || 'অজানা',
        'বিভাগ': doc?.department || '-',
        'অবস্থা': statusMap[p.status] || p.status,
        'তারিখ': p.date
      };
    });
    const allPatientsSheet = XLSX.utils.json_to_sheet(allPatientsData);
    XLSX.utils.book_append_sheet(workbook, allPatientsSheet, "সকল রোগীর তালিকা");

    // 3. Individual Doctor Sheets
    doctors.forEach(doc => {
      const docPatients = filteredPatients.filter(p => p.doctorId === doc.id);
      if (docPatients.length === 0) return;

      const docRows: any[][] = [
        ['ডাক্তারের তথ্য', '', '', ''],
        ['নাম:', doc.name, 'বিভাগ:', doc.department],
        ['ডিগ্রী:', doc.degree, 'রুম:', doc.roomNumber],
        ['', '', '', ''],
        ['রোগীর সামারি', '', '', ''],
        ['মোট রোগী:', docPatients.length, 'নতুন:', docPatients.filter(p => p.patientType === 'new').length],
        ['ফলোআপ:', docPatients.filter(p => p.patientType === 'followup').length, 'সম্পন্ন:', docPatients.filter(p => p.status === 'completed').length],
        ['', '', '', ''],
        ['সিরিয়াল', 'রোগীর নাম', 'বয়স', 'ধরণ', 'সার্ভিস', 'অবস্থা']
      ];

      docPatients.forEach(p => {
        const statusMap: Record<string, string> = {
          'waiting': 'অপেক্ষমান',
          'running': 'রানিং',
          'next': 'এরপর',
          'absent': 'অনুপস্থিত',
          'completed': 'সম্পন্ন'
        };
        docRows.push([
          p.serialNumber,
          p.name,
          p.age || '-',
          p.patientType === 'new' ? 'নতুন' : 'ফলোআপ',
          p.service === 'general' ? 'জেনারেল' : p.service || 'জেনারেল',
          statusMap[p.status] || p.status
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(docRows);
      
      // Clean sheet name: max 31 chars, no special chars \ / ? * [ ]
      let sheetName = doc.name.replace(/[\\/?*[\]]/g, '').substring(0, 31);
      
      // Ensure unique sheet name
      let finalSheetName = sheetName;
      let counter = 1;
      while (workbook.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName.substring(0, 25)} (${counter++})`;
      }

      XLSX.utils.book_append_sheet(workbook, sheet, finalSheetName);
    });

    XLSX.writeFile(workbook, `hospital_report_${startDate}_to_${endDate}.xlsx`);
  };

  const handleExportData = async () => {
    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত যে আপনি সিস্টেমের সকল ডেটা (রোগী, ডাক্তার, সেটিংস এবং ইউজার) এক্সপোর্ট করতে চান?',
      onConfirm: async () => {
        setIsExporting(true);
        try {
          // Fetch all data from Firestore
          const patientsSnapshot = await getDocs(collection(db, 'patients'));
          const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
          const settingsSnapshot = await getDocs(collection(db, 'settings'));
          const usersSnapshot = await getDocs(collection(db, 'users'));

          const exportData = {
            patients: patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            doctors: doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            settings: settingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            users: usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            exportDate: new Date().toISOString(),
            version: '1.0'
          };
          
          const safeStringify = (obj: any) => {
            try {
              const cache = new Set();
              return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                  if (cache.has(value)) {
                    return undefined;
                  }
                  cache.add(value);
                }
                
                // Handle Firestore Timestamp
                if (value && value.seconds !== undefined && value.nanoseconds !== undefined && typeof value.toDate === 'function') {
                  return value.toDate().toISOString();
                }
                
                // Handle Firestore DocumentReference
                if (value && typeof value.path === 'string' && typeof value.id === 'string' && value.firestore) {
                  return `ref:${value.path}`;
                }
                
                return value;
              }, 2);
            } catch (e) {
              return JSON.stringify({ error: 'Could not stringify object', message: e instanceof Error ? e.message : String(e) });
            }
          };
          
          const jsonString = safeStringify(exportData);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", url);
          downloadAnchorNode.setAttribute("download", `hospital_data_backup_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          URL.revokeObjectURL(url);
          
          showToast('ডেটা সফলভাবে এক্সপোর্ট করা হয়েছে', 'success');
          logActivity('system', 'ডেটা এক্সপোর্ট', 'সিস্টেমের সকল ডেটা ব্যাকআপ হিসেবে এক্সপোর্ট করা হয়েছে।');
        } catch (error) {
          console.error('Export error:', error);
          showToast('এক্সপোর্ট করতে সমস্যা হয়েছে।', 'error');
        } finally {
          setIsExporting(false);
        }
      }
    });
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setConfirmDialog({
      isOpen: true,
      message: 'আপনি কি নিশ্চিত? এটি বর্তমান ডেটা ওভাররাইট করতে পারে। ইমপোর্ট করার আগে বর্তমান ডেটার ব্যাকআপ রাখা ভালো।',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            
            // Validation
            if (!data.patients && !data.doctors && !data.settings) {
              throw new Error('Invalid backup file');
            }

            // Import Patients
            if (data.patients && Array.isArray(data.patients)) {
              for (const patient of data.patients) {
                const { id, ...patientData } = patient;
                if (id) {
                  await setDoc(doc(db, 'patients', id), patientData);
                }
              }
            }

            // Import Doctors
            if (data.doctors && Array.isArray(data.doctors)) {
              for (const doctor of data.doctors) {
                const { id, ...doctorData } = doctor;
                if (id) {
                  await setDoc(doc(db, 'doctors', id), doctorData);
                }
              }
            }

            // Import Settings
            if (data.settings && Array.isArray(data.settings)) {
              for (const setting of data.settings) {
                const { id, ...settingData } = setting;
                if (id) {
                  await setDoc(doc(db, 'settings', id), settingData);
                }
              }
            }

            // Import Users
            if (data.users && Array.isArray(data.users)) {
              for (const user of data.users) {
                const { id, uid, ...userData } = user;
                const userId = id || uid;
                if (userId) {
                  await setDoc(doc(db, 'users', userId), userData);
                }
              }
            }
            
            showToast('ডেটা সফলভাবে ইমপোর্ট করা হয়েছে। পরিবর্তন দেখতে পেজটি রিফ্রেশ করুন।');
            logActivity('system', 'ডেটা ইমপোর্ট', 'ব্যাকআপ ফাইল থেকে সিস্টেম ডেটা ইমপোর্ট করা হয়েছে।');
            
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            console.error('Import error:', error);
            showToast('ইমপোর্ট করতে সমস্যা হয়েছে। দয়া করে সঠিক ফাইল নির্বাচন করুন।');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      }
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans overflow-hidden relative" style={{ '--primary': settings?.primaryColor || '#2563eb' } as any}>
      {/* Mobile Sidebar Overlay */}
      
      {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 z-[250] lg:hidden"
          />
        )}
      

      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        settings={settings}
        canViewDashboard={canViewDashboard}
        canViewOpdDashboard={canViewOpdDashboard}
        canCreateSerial={canCreateSerial}
        canEditSerial={canEditSerial}
        canManageDoctors={canManageDoctors}
        canManageSettings={canManageSettings}
        canManagePatients={canManagePatients}
        canViewActivityLogs={canViewActivityLogs}
        canManageUsers={canManageUsers}
        canViewProfile={canViewProfile}
        canViewRegistration={canViewRegistration}
        canViewDoctorToday={canViewDoctorToday}
        canViewDoctorSchedule={canViewDoctorSchedule}
        canManageProcedures={canManageProcedures}
        canManageDepartments={canManageDepartments}
        canViewPatientReports={canViewPatientReports}
        canManageHospitalProfile={canManageHospitalProfile}
        canManageDisplaySettings={canManageDisplaySettings}
        canManagePatientPortal={canManagePatientPortal}
        canManageMobileNav={canManageMobileNav}
        canManagePushNotifications={canManagePushNotifications}
        canManageWelcomePopup={canManageWelcomePopup}
        canManageLoginPage={canManageLoginPage}
        canManageBackup={canManageBackup}
        canManageAppAppearance={canManageAppAppearance}
        canViewAnalytics={canViewAnalytics}
        canExportData={canExportData}
        canViewSystemStatus={canViewSystemStatus}
        activeTab={activeTab}
        systemTab={systemTab}
        userTab={userTab}
        setActiveTab={setActiveTab}
        setSystemTab={setSystemTab}
        setUserTab={setUserTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        userProfile={userProfile}
        signOut={signOut}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 relative transition-all duration-300">
        {/* Mobile Sidebar Toggle - Floating */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl z-40"
        >
          <Menu size={24} />
        </button>

        {/* Global Header with Date Picker */}
        <div className="hidden md:flex bg-white border-b border-slate-200 px-4 md:px-4 py-1 flex-col md:flex-row justify-between items-center gap-2 shadow-sm z-50">
          <div className="flex items-center justify-between w-full md:w-auto gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 bg-slate-100 text-slate-600 rounded-none"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1 bg-blue-600 text-white rounded-none hidden sm:block">
                <LayoutDashboard size={16} />
              </div>
              <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                {activeTab === 'dashboard-overview' ? 'ড্যাশবোর্ড ওভারভিউ' : 
                 activeTab === 'dashboard-opd-summary' ? 'ডাক্তার ওভারভিউ' : 
                 activeTab === 'opd-summary' ? 'অপিডি সামারি' : 
                 activeTab === 'registration' ? 'নতুন রেজিস্ট্রেশন' : 
                 activeTab === 'registration-procedure' ? 'প্রসিডিওর' : 
                 activeTab === 'user-management' ? 'ইউজার ম্যানেজ' : 'ম্যানেজমেন্ট'}
              </h2>
            </div>
            <div className="md:hidden">
              <ProfileDropdown 
                userProfile={userProfile} 
                canManageUsers={canManageUsers} 
                canManagePatients={canManagePatients}
                canViewProfile={canViewProfile}
                signOut={signOut} 
                setActiveTab={setActiveTab} 
                setSystemTab={setSystemTab}
                setUserTab={setUserTab}
              />
            </div>
          </div>
          <div className="flex items-center justify-end w-full md:w-auto gap-2 md:gap-4">
            <div className="hidden md:block relative group flex-1 md:flex-none">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <CalendarIcon size={14} />
              </div>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-none pl-8 pr-3 py-1 text-slate-600 font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm transition-all cursor-pointer text-xs"
              />
            </div>
            {activeTab === 'dashboard-overview' && canViewReports && (
              <button
                onClick={downloadExcel} className="hidden md:flex items-center gap-1 px-2 md:px-3 py-1 text-white rounded-none hover:opacity-90 transition-all shadow-md active:scale-95 font-black text-[10px] bg-blue-600 shadow-blue-600/10"
              >
                <FileSpreadsheet size={12} />
                <span className="hidden sm:inline">রিপোর্ট</span>
              </button>
            )}
            
            <div className="hidden md:block">
              <ProfileDropdown 
                userProfile={userProfile} 
                canManageUsers={canManageUsers} 
                canManagePatients={canManagePatients}
                canViewProfile={canViewProfile}
                signOut={signOut} 
                setActiveTab={setActiveTab} 
                setSystemTab={setSystemTab}
                setUserTab={setUserTab}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:pt-4 md:px-0 relative pb-24 lg:pb-6">
          
            <div
              key={activeTab}>
              {activeTab === 'dashboard-overview' && canViewOpdDashboard && (
                <div className="w-full px-2 md:px-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
                    <div>
                      <h2 className="text-lg md:text-3xl font-black text-slate-900 tracking-tighter mb-0.5 md:mb-1 header-highlight">লাইভ ট্র্যাকিং</h2>
                      <p className="text-[9px] md:text-[11px] text-slate-500 font-bold uppercase tracking-wide">হাসপাতালের কার্যক্রমের লাইভ সারসংক্ষেপ</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative group flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Building2 size={12} className="md:w-3.5 md:h-3.5" />
                        </div>
                        <select
                          value={dashboardSelectedDept}
                          onChange={(e) => setDashboardSelectedDept(e.target.value)}
                          className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-300 rounded-none pl-7 md:pl-8 pr-2 md:pr-3 py-1.5 md:py-2 text-slate-600 font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm transition-all text-[9px] md:text-xs w-full sm:w-40 md:w-48 appearance-none"
                        >
                          <option value="all">সব বিভাগ</option>
                          {settings?.departments?.map((dept, idx) => (
                            <option key={`dept-filter-${dept}-${idx}`} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative group flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Search size={12} className="md:w-3.5 md:h-3.5" />
                        </div>
                        <input 
                          type="text" 
                          placeholder="সার্চ..." 
                          value={dashboardSearchQuery}
                          onChange={(e) => setDashboardSearchQuery(e.target.value)}
                          className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-300 rounded-none pl-7 md:pl-8 pr-2 md:pr-3 py-1.5 md:py-2 text-slate-600 font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm transition-all text-[9px] md:text-xs w-full sm:w-48 md:w-64"
                        />
                      </div>
                    </div>
                  </div>

                <div className="px-0 md:px-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-12">
                    <StatCard 
                      icon={<Users className="w-6 h-6" />} 
                      label="আজকের ডাক্তার" 
                      value={dashboardStats.todayDoctors} 
                      trend={`মোট ${doctors.length}`}
                      color="bg-gradient-to-br from-blue-600 to-blue-700"
                      accentColor="text-blue-600"
                      onClick={() => {
                        setDashboardSelectedDept('all');
                        setDashboardSelectedService('all');
                      }}
                      isActive={dashboardSelectedDept === 'all' && dashboardSelectedService === 'all'}
                    />
                    <StatCard 
                      icon={<UserPlus className="w-6 h-6" />} 
                      label="আজকের রোগী" 
                      value={dashboardStats.todayPatients} 
                      trend={isToday ? `+${allPatients.filter(p => p.date === selectedDate && p.status === 'waiting' && (p.service === 'general' || !p.service)).length} অপেক্ষমান` : selectedDate}
                      color="bg-gradient-to-br from-emerald-600 to-emerald-700"
                      accentColor="text-emerald-600"
                      onClick={() => handleStatCardClick('general')}
                      isActive={dashboardSelectedService === 'general'}
                    />
                    {availableProceduresToday.map((proc, idx) => {
                      const config = getProcedureConfig(proc);
                      return (
                        <div key={`stat-proc-${proc}-${idx}`} >
                          <StatCard 
                            icon={config.icon} 
                            label={config.label} 
                            value={procedureStats[proc] || 0} 
                            trend={isToday ? "আজকের" : "নির্বাচিত তারিখ"}
                            color={config.color}
                            accentColor={config.accentColor}
                            onClick={() => handleStatCardClick(proc)}
                            isActive={dashboardSelectedService === proc}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-12">
                    {/* Department Wise Load */}
                    <div className="bg-white p-5 md:p-10 rounded-none border-2 border-slate-200 shadow-xl shadow-slate-200/10">
                      <div className="flex items-center justify-between mb-6 md:mb-10">
                        <h3 className="font-black text-lg md:text-2xl text-slate-900 flex items-center gap-3 md:gap-5">
                          <div className="p-2 md:p-4 bg-blue-600 rounded-none text-white shadow-lg">
                            <Building2 size={18} className="md:w-6 md:h-6" />
                          </div>
                          বিভাগ ভিত্তিক লোড
                        </h3>
                        <span className="px-2 md:px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">লাইভ</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 md:gap-4">
                        {sortedDepts.length > 0 ? sortedDepts.map(([dept, count], idx) => (
                          <div
                            key={`\${dept}-\${idx}-load`} className="p-4 bg-slate-50 rounded-none border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all"
                          >
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">বিভাগ</p>
                              <p className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">{dept}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-blue-600 tracking-tighter">{count}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">রোগী</p>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full py-10 text-center text-slate-400 font-bold italic">
                            আজ কোনো বিভাগের ডাটা নেই
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient Analysis */}
                    <div className="bg-white p-5 md:p-10 rounded-none border-2 border-slate-200 shadow-xl shadow-slate-200/10">
                      <h3 className="font-black text-lg md:text-2xl text-slate-900 mb-6 md:mb-10 flex items-center gap-3 md:gap-5">
                        <div className="p-2 md:p-4 bg-emerald-600 rounded-none text-white shadow-lg">
                          <Users size={18} className="md:w-6 md:h-6" />
                        </div>
                        রোগীর ধরণ বিশ্লেষণ
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        <div>
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ধরণ</p>
                              <p className="font-black text-slate-900 text-lg">নতুন রোগী</p>
                            </div>
                            <p className="font-black text-emerald-600 text-3xl tracking-tighter">{patientTypeStats.new}</p>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">মোট নতুন রোগী পরিসংখ্যান</p>
                        </div>
                        <div>
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ধরণ</p>
                              <p className="font-black text-slate-900 text-lg">ফলোআপ রোগী</p>
                            </div>
                            <p className="font-black text-blue-600 text-3xl tracking-tighter">{patientTypeStats.followup}</p>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-none overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">মোট ফলোআপ রোগী পরিসংখ্যান</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Grid */}
                  {canViewActivityLogs && (
                    <div className="bg-gradient-to-br from-white to-slate-50 p-5 md:p-10 rounded-none border-2 border-slate-200 shadow-2xl shadow-slate-200/20 mb-12">
                      <div className="flex flex-row items-center justify-between mb-6 md:mb-10">
                        <h3 className="font-black text-lg md:text-3xl text-slate-900 flex items-center gap-3 md:gap-5">
                          <div className="p-2 md:p-4 bg-orange-500 rounded-none text-white shadow-xl shadow-orange-600/30">
                            <Clock size={18} className="md:w-7 md:h-7" />
                          </div>
                          অ্যাক্টিভিটি
                        </h3>
                        <div className="flex items-center gap-2 md:gap-4">
                          <button
                            onClick={() => setShowAllActivities(true)}
                            className="px-2 md:px-4 py-1 md:py-1.5 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 transition-all active:scale-95"
                          >
                            সব
                          </button>
                          <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-1.5 bg-orange-50 text-orange-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-orange-100">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full animate-pulse" />
                            <span className="hidden sm:inline">লাইভ</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {canViewActivityLogs && activityLogs.length > 0 ? activityLogs.slice(0, 12).map((log, index) => (
                          <div
                            key={`log-dash-${log.id}-${index}`} className="p-6 bg-white rounded-none border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-none flex items-center justify-center shadow-sm border border-slate-100",
                                log.type === 'patient' ? "bg-blue-500 text-white" : 
                                log.type === 'doctor' ? "bg-emerald-500 text-white" : 
                                log.type === 'settings' ? "bg-purple-500 text-white" : "bg-slate-500 text-white"
                              )}>
                                {log.type === 'patient' ? <Users size={20} /> : 
                                 log.type === 'doctor' ? <Stethoscope size={20} /> : 
                                 log.type === 'settings' ? <Settings size={20} /> : <Activity size={20} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-900 leading-tight line-clamp-1">{log.action}</p>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{log.userName}</p>
                              </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-50">
                              <p className="text-[11px] font-bold text-slate-600 mb-2 line-clamp-2">
                                {log.details}
                              </p>
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('bn-BD') : 'এখনই'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full py-10 text-center text-slate-400 font-bold italic">
                            আজ কোনো অ্যাক্টিভিটি নেই
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {dashboardSearchQuery && !/^\d{4}-\d{2}-\d{2}$/.test(dashboardSearchQuery) && (
                    <div
                      className="bg-gradient-to-br from-white to-slate-50 p-10 rounded-none border-2 border-blue-400/30 shadow-2xl shadow-slate-200/30 mb-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-2xl text-slate-900 flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-none text-blue-600 shadow-sm">
                            <Search size={24} />
                          </div>
                          অনুসন্ধানের ফলাফল: "{dashboardSearchQuery}"
                        </h3>
                        <button
                          onClick={() => setDashboardSearchQuery('')}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                        >
                          বন্ধ করুন
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allPatients
                          .filter(p => p.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || p.serialNumber.toString().includes(dashboardSearchQuery))
                          .map(p => (
                            <div key={`search-${p.id}`} className="flex items-center justify-between p-6 bg-gradient-to-br from-white to-slate-50/50 rounded-none border border-slate-100 hover:shadow-md transition-all">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-white to-slate-50 rounded-none flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100">
                                  {p.serialNumber}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-lg flex items-center gap-1">
                                    {p.name}
                                  </p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-1">
                                    <span className="inline-flex items-center gap-1">
                                      {doctors.find(d => d.id === p.doctorId)?.name}
                                      <VerificationBadge badge={doctors.find(d => d.id === p.doctorId)?.verifiedBadge} size={10} />
                                    </span> • {p.patientType === 'new' ? 'নতুন' : 'ফলোআপ'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                                  p.status === 'running' ? 'bg-red-100 text-red-600' : 
                                  p.status === 'next' ? 'bg-blue-100 text-blue-600' :
                                  p.status === 'absent' ? 'bg-orange-100 text-orange-600' :
                                  p.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'
                                )}>
                                  {p.status === 'running' ? 'রানিং' : p.status === 'next' ? 'এরপর' : p.status === 'absent' ? 'অনুপস্থিত' : p.status === 'completed' ? 'সম্পন্ন' : 'অপেক্ষমান'}
                                </span>
                              </div>
                            </div>
                          ))}
                        {allPatients.filter(p => p.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || p.serialNumber.toString().includes(dashboardSearchQuery)).length === 0 && (
                          <div className="col-span-full py-10 text-center text-slate-400 font-bold italic">
                            কোনো ফলাফল পাওয়া যায়নি
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'dashboard-opd-summary' && (
              <div className="w-full">
                <DoctorOverview 
                  selectedDate={selectedDate} 
                  onQuickView={(doctor) => setQuickViewDoctor(doctor)} 
                />
              </div>
            )}
            {activeTab === 'opd-summary' && canViewOpdDashboard && (
              <div className="w-full overflow-x-auto pb-8">
                <OpdSummary 
                  doctors={doctors} 
                  patients={allPatients} 
                  settings={settings} 
                  selectedDate={selectedDate} 
                  userProfile={userProfile}
                  showToast={showToast}
                  logActivity={logActivity}
                />
              </div>
            )}
          {activeTab === 'user-management' && (
            <div className="w-full space-y-8 px-2 md:px-4">
              <div className="mb-8">
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-4 md:mb-6 uppercase">ইউজার ম্যানেজমেন্ট</h2>
                
                {(canManageUsers || canManagePatients) && (
                  <div className="md:hidden mb-8">
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setUserTab('my-profile')}
                        className={cn(
                          "px-2 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                          userTab === 'my-profile' 
                            ? "bg-white text-blue-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <UserIcon size={14} />
                        প্রোফাইল
                      </button>
                      {canManageUsers && (
                        <button
                          onClick={() => setUserTab('staff-users')}
                          className={cn(
                            "px-2 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                            userTab === 'staff-users' 
                              ? "bg-white text-blue-600 shadow-sm" 
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <ShieldCheck size={14} />
                          স্টাফ
                        </button>
                      )}
                      {canManagePatients && (
                        <button
                          onClick={() => setUserTab('patient-management')}
                          className={cn(
                            "px-2 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                            userTab === 'patient-management' 
                              ? "bg-white text-blue-600 shadow-sm" 
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <Users size={14} />
                          পেশেন্ট
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(canManageUsers || canManagePatients) && (
                  <div className="hidden md:flex lg:hidden p-1.5 bg-slate-100 rounded-none w-fit mb-10 gap-1">
                    <button
                      onClick={() => setUserTab('my-profile')}
                      className={cn(
                        "px-8 py-3 rounded-none font-black text-sm transition-all flex items-center justify-center gap-2",
                        userTab === 'my-profile' 
                          ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-lg shadow-slate-200" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <UserIcon size={18} />
                      আমার প্রোফাইল
                    </button>
                    {canManageUsers && (
                      <button
                        onClick={() => setUserTab('staff-users')}
                        className={cn(
                          "px-8 py-3 rounded-none font-black text-sm transition-all flex items-center justify-center gap-2",
                          userTab === 'staff-users' 
                            ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-lg shadow-slate-200" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <ShieldCheck size={18} />
                        স্টাফ ম্যানেজমেন্ট
                      </button>
                    )}
                    {canManagePatients && (
                      <button
                        onClick={() => setUserTab('patient-management')}
                        className={cn(
                          "px-8 py-3 rounded-none font-black text-sm transition-all flex items-center justify-center gap-2",
                          userTab === 'patient-management' 
                            ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-lg shadow-slate-200" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <Users size={18} />
                        পেশেন্ট ম্যানেজমেন্ট
                      </button>
                    )}
                  </div>
                )}

                
                  <div
                    key={userTab}>
                    {userTab === 'my-profile' && (
                      <div className="w-full space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Profile Sidebar/Summary */}
                          <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 relative overflow-hidden">
                              <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative group">
                                  <div className="w-32 h-32 bg-slate-100 border-4 border-white shadow-md rounded-full flex items-center justify-center overflow-hidden">
                                    {userProfile?.photoURL ? (
                                      <img 
                                        src={userProfile.photoURL} 
                                        alt={profileName} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <UserIcon size={64} className="text-slate-300" />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
                                    {profileName}
                                    {userProfile?.role !== 'patient' && (
                                      <VerificationBadge badge={userProfile?.verifiedBadge} size={20} />
                                    )}
                                  </h3>
                                  <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">{userProfile?.role || 'User'}</p>
                                </div>
                                <div className="w-full pt-6 border-t border-slate-100 flex justify-around">
                                  <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">স্ট্যাটাস</p>
                                    <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest mt-1">Active</span>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">জয়েনিং</p>
                                    <p className="text-xs font-bold text-slate-700 mt-1">{userProfile?.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Advanced Settings Quick Access */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Settings size={16} className="text-blue-500" />
                                অ্যাডভান্সড সেটিংস
                              </h4>
                              <div className="space-y-2">
                                <button 
                                  onClick={() => setActiveAdvancedSetting('profile-info')}
                                  className={`w-full flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-all ${activeAdvancedSetting === 'profile-info' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeAdvancedSetting === 'profile-info' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                      <UserIcon size={16} />
                                    </div>
                                    <span className={`text-xs font-bold ${activeAdvancedSetting === 'profile-info' ? 'text-blue-700' : 'text-slate-700'}`}>প্রোফাইল তথ্য</span>
                                  </div>
                                  <ChevronRight size={16} className={`${activeAdvancedSetting === 'profile-info' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                                </button>

                                <button 
                                  onClick={() => setActiveAdvancedSetting('change-password')}
                                  className={`w-full flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-all ${activeAdvancedSetting === 'change-password' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeAdvancedSetting === 'change-password' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                      <Lock size={16} />
                                    </div>
                                    <span className={`text-xs font-bold ${activeAdvancedSetting === 'change-password' ? 'text-blue-700' : 'text-slate-700'}`}>পাসওয়ার্ড পরিবর্তন</span>
                                  </div>
                                  <ChevronRight size={16} className={`${activeAdvancedSetting === 'change-password' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                                </button>

                                <div className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                      <Fingerprint size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">টু-ফ্যাক্টর অথেনটিকেশন</span>
                                  </div>
                                  <div className="w-10 h-5 bg-slate-200 rounded-full relative p-1">
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                  </div>
                                </div>

                                <button 
                                  onClick={() => setActiveAdvancedSetting('activity-logs')}
                                  className={`w-full flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-all ${activeAdvancedSetting === 'activity-logs' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeAdvancedSetting === 'activity-logs' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                      <History size={16} />
                                    </div>
                                    <span className={`text-xs font-bold ${activeAdvancedSetting === 'activity-logs' ? 'text-blue-700' : 'text-slate-700'}`}>অ্যাক্টিভিটি লগ</span>
                                  </div>
                                  <ChevronRight size={16} className={`${activeAdvancedSetting === 'activity-logs' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                                </button>

                                <button 
                                  onClick={() => setActiveAdvancedSetting('sessions')}
                                  className={`w-full flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-all ${activeAdvancedSetting === 'sessions' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeAdvancedSetting === 'sessions' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                      <Smartphone size={16} />
                                    </div>
                                    <span className={`text-xs font-bold ${activeAdvancedSetting === 'sessions' ? 'text-blue-700' : 'text-slate-700'}`}>সেশন ম্যানেজমেন্ট</span>
                                  </div>
                                  <ChevronRight size={16} className={`${activeAdvancedSetting === 'sessions' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Main Settings Form */}
                          <div className="lg:col-span-2 space-y-8">
                            {activeAdvancedSetting === null && (
                              <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 md:p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px] md:min-h-[500px]">
                                <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-50 text-blue-600 flex items-center justify-center rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900">
                                  <Settings size={24} className="md:w-10 md:h-10" />
                                </div>
                                <div>
                                  <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">অ্যাডভান্সড সেটিংস</h3>
                                  <p className="text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-widest max-w-md">
                                    আপনার প্রোফাইল এবং সিকিউরিটি সেটিংস ম্যানেজ করার জন্য বাম পাশের মেনু থেকে একটি অপশন সিলেক্ট করুন।
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                  <div className="p-4 border-2 border-slate-100 flex flex-col items-center gap-2">
                                    <UserIcon size={20} className="text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">প্রোফাইল</span>
                                  </div>
                                  <div className="p-4 border-2 border-slate-100 flex flex-col items-center gap-2">
                                    <Lock size={20} className="text-red-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">সিকিউরিটি</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeAdvancedSetting === 'profile-info' && (
                              <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-4 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
                                
                                <div className="flex items-center gap-4 mb-10">
                                  <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl">
                                    <UserIcon size={24} />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">প্রোফাইল সেটিংস</h3>
                                    <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">আপনার ব্যক্তিগত তথ্য আপডেট করুন</p>
                                  </div>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-8">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">আপনার নাম</label>
                                      <input 
                                        type="text" 
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="আপনার নাম লিখুন"
                                        required
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">মোবাইল নম্বর</label>
                                      <input 
                                        type="tel" 
                                        value={profileMobile}
                                        onChange={(e) => setProfileMobile(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="আপনার মোবাইল নম্বর লিখুন"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ইউজারনেম (Username)</label>
                                      <input 
                                        type="text" 
                                        value={profileUsername}
                                        onChange={(e) => setProfileUsername(e.target.value.replace(/\s/g, ''))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="যেমন: admin"
                                        required
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ইমেইল (Email)</label>
                                      <input 
                                        type="email" 
                                        value={profileEmail}
                                        onChange={(e) => setProfileEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="example@mail.com"
                                        required
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">প্রোফাইল ফটো লিঙ্ক (URL)</label>
                                    <input 
                                      type="url" 
                                      value={profilePhotoURL}
                                      onChange={(e) => setProfilePhotoURL(e.target.value)}
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                      placeholder="https://example.com/photo.jpg"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={isUpdatingProfile} className="w-full md:w-fit px-12 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-[6px_6px_0px_0px_rgba(51,65,85,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isUpdatingProfile ? <Loader2 className="animate-spin" size={18} /> : 'সেভ করুন'}
                                  </button>
                                </form>
                              </div>
                            )}

                            {activeAdvancedSetting === 'change-password' && (
                              <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-4 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
                                
                                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] shrink-0">
                                    <Lock size={20} className="md:w-6 md:h-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">পাসওয়ার্ড পরিবর্তন</h3>
                                    <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">নিরাপত্তার জন্য পাসওয়ার্ড আপডেট করুন</p>
                                  </div>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="space-y-8">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">নতুন পাসওয়ার্ড</label>
                                      <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-600 transition-colors">
                                          <Lock size={18} />
                                        </div>
                                        <input 
                                          type="password" 
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-red-600 transition-colors"
                                          placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                                          required
                                          minLength={6}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                                      <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-600 transition-colors">
                                          <ShieldCheck size={18} />
                                        </div>
                                        <input 
                                          type="password" 
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-red-600 transition-colors"
                                          placeholder="আবার পাসওয়ার্ড লিখুন"
                                          required
                                          minLength={6}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={isUpdatingPassword} className="w-full md:w-fit px-12 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-xs shadow-[6px_6px_0px_0px_rgba(153,27,27,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isUpdatingPassword ? <Loader2 className="animate-spin" size={18} /> : 'পাসওয়ার্ড আপডেট করুন'}
                                  </button>
                                </form>
                              </div>
                            )}

                            {activeAdvancedSetting === 'activity-logs' && (
                              <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-4 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
                                
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-10">
                                  <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] shrink-0">
                                      <History size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <div>
                                      <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">অ্যাক্টিভিটি লগ</h3>
                                      <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">আপনার সাম্প্রতিক কার্যক্রমের তালিকা</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      if (userProfile?.uid) {
                                        setIsLoadingLogs(true);
                                        const q = query(
                                          collection(db, 'activityLogs'),
                                          where('userId', '==', userProfile.uid),
                                          orderBy('timestamp', 'desc'),
                                          limit(50)
                                        );
                                        const querySnapshot = await getDocs(q);
                                        setUserActivityLogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                                        setIsLoadingLogs(false);
                                      }
                                    }}
                                    className="p-3 bg-slate-100 border-2 border-slate-200 hover:border-blue-600 transition-colors"
                                  >
                                    <RefreshCw size={20} className={isLoadingLogs ? "animate-spin" : ""} />
                                  </button>
                                </div>

                                {isLoadingLogs ? (
                                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="animate-spin text-blue-600" size={40} />
                                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">লোড হচ্ছে...</p>
                                  </div>
                                ) : userActivityLogs.length === 0 ? (
                                  <div className="text-center py-20 border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold">কোনো অ্যাক্টিভিটি পাওয়া যায়নি।</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                                    {userActivityLogs.map((log) => (
                                      <div key={log.id} className="p-6 bg-slate-50 border-2 border-slate-200 flex items-start gap-4 hover:border-blue-600 transition-colors group">
                                        <div className="w-10 h-10 bg-white border-2 border-slate-200 flex items-center justify-center text-blue-600 group-hover:border-blue-600 transition-colors">
                                          <Activity size={20} />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{log.action}</h4>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('bn-BD') : 'এখনই'}
                                            </span>
                                          </div>
                                          <p className="text-slate-500 font-bold text-xs">{log.details}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {activeAdvancedSetting === 'sessions' && (
                              <div className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-4 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
                                
                                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] shrink-0">
                                    <Smartphone size={20} className="md:w-6 md:h-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">সেশন ম্যানেজমেন্ট</h3>
                                    <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">আপনার বর্তমান লগইন সেশন</p>
                                  </div>
                                </div>

                                {currentSession ? (
                                  <div className="space-y-6">
                                    <div className="p-6 bg-blue-50 border-2 border-blue-200">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                        <h4 className="font-black text-blue-900 uppercase tracking-widest text-sm">বর্তমান সেশন (অ্যাক্টিভ)</h4>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">ডিভাইস / ব্রাউজার</p>
                                          <p className="font-bold text-blue-900 text-sm">{currentSession.userAgent}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">প্লাটফর্ম</p>
                                          <p className="font-bold text-blue-900 text-sm">{currentSession.platform}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">শেষ লগইন</p>
                                          <p className="font-bold text-blue-900 text-sm">{new Date(currentSession.lastSignInTime).toLocaleString('bn-BD')}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">অ্যাকাউন্ট তৈরি</p>
                                          <p className="font-bold text-blue-900 text-sm">{new Date(currentSession.creationTime).toLocaleString('bn-BD')}</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t-2 border-slate-100">
                                      <button
                                        onClick={signOut}
                                        className="px-8 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
                                      >
                                        <LogOut size={16} />
                                        লগআউট করুন
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-10">
                                    <p className="text-slate-400 font-bold">সেশন তথ্য পাওয়া যাচ্ছে না।</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {userTab === 'staff-users' && (
                      <div className="w-full">
                        <UserManagement 
                          logActivity={logActivity} 
                          showToast={showToast}
                          roleFilter={['super-admin', 'admin', 'staff']}
                        />
                      </div>
                    )}

                    {userTab === 'patient-management' && (
                      <div className="w-full">
                        <PatientManagement 
                          logActivity={logActivity} 
                          showToast={showToast}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {(activeTab === 'registration' || activeTab === 'registration-procedure' || activeTab === 'registration-list') && (
            <div className="w-full px-2 md:px-4">
              <div className="mb-4 md:mb-6">
                <div className="flex flex-row items-start justify-between gap-2 md:gap-4 mb-0 md:mb-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      <div className="p-1.5 md:p-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-none shadow-2xl shadow-blue-600/30 shrink-0">
                        <UserPlus size={14} className="md:w-4 md:h-4" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight mb-0.5 md:mb-0.5">
                          {activeTab === 'registration' ? 'নতুন রেজিস্ট্রেশন' : 'প্রসিডিওর'}
                        </h2>
                        <p className="text-[10px] sm:text-xs md:text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">রোগীর তথ্য এন্ট্রি ফর্ম</p>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2 md:mt-3">
                      <button 
                        onClick={() => setActiveTab('registration')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-[11px] md:text-[10px] rounded-none transition-all ${activeTab === 'registration' ? 'bg-blue-600 text-white shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <UserIcon size={12} />
                        রোগী
                      </button>
                      <button 
                        onClick={() => setActiveTab('registration-procedure')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-[11px] md:text-[10px] rounded-none transition-all ${activeTab === 'registration-procedure' ? 'bg-blue-600 text-white shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Activity size={12} />
                        প্রসিডিওর
                      </button>
                    </div>
                  </div>

                  {/* Stats Cards (Header Right) */}
                  <div className="flex gap-0.5 sm:gap-1.5 shrink-0 ml-auto items-center">
                    {activeTab === 'registration' && (
                      <>
                        <div className="w-16 sm:w-24 md:w-28 lg:w-32">
                          <StatCard 
                            icon={<Users />} 
                            label="মোট রোগী" 
                            value={patients.filter(p => p.service === 'general' || !p.service).length} 
                            trend={isToday ? "আজ" : selectedDate}
                            color="bg-gradient-to-br from-blue-600 to-blue-700"
                            accentColor="text-blue-600"
                          />
                        </div>
                        <div className="w-16 sm:w-24 md:w-28 lg:w-32">
                          <StatCard 
                            icon={<UserPlus />} 
                            label="মোট ফলোআপ" 
                            value={patients.filter(p => (p.service === 'general' || !p.service) && p.patientType === 'followup').length} 
                            trend={isToday ? "আজ" : selectedDate}
                            color="bg-gradient-to-br from-emerald-600 to-emerald-700"
                            accentColor="text-emerald-600"
                          />
                        </div>
                        <div className="w-16 sm:w-24 md:w-28 lg:w-32">
                          <StatCard 
                            icon={<Plus />} 
                            label="নতুন রোগী" 
                            value={patients.filter(p => (p.service === 'general' || !p.service) && p.patientType === 'new').length} 
                            trend={isToday ? "আজ" : selectedDate}
                            color="bg-gradient-to-br from-amber-600 to-amber-700"
                            accentColor="text-amber-600"
                          />
                        </div>
                      </>
                    )}
                    
                    {activeTab === 'registration-procedure' && (
                      <>
                        <div className="w-16 sm:w-28 md:w-32">
                          <StatCard 
                            icon={<Activity />} 
                            label="মোট প্রসিডিওর" 
                            value={patients.filter(p => p.service && p.service !== 'general').length} 
                            trend={isToday ? "আজ" : selectedDate}
                            color="bg-gradient-to-br from-blue-600 to-blue-700"
                            accentColor="text-blue-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4">
                  <div className="lg:col-span-4 xl:col-span-3">
                    <div className="bg-white border-2 border-slate-200 shadow-xl p-6 sm:p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                      
                      <form onSubmit={handleAddPatient} className="space-y-4 sm:space-y-4 mt-4 sm:mt-0">

                        {/* Modern Doctor Selection */}
                        <RegistrationDoctorSelector 
                          doctors={doctors}
                          selectedDoctorId={selectedDoctorId}
                          setSelectedDoctorId={setSelectedDoctorId}
                          required
                        />

                        {/* Procedure Selection */}
                        {activeTab === 'registration-procedure' && (
                          <RegistrationServiceSelector 
                            services={(() => {
                              const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
                              if (selectedDoctor?.procedures && selectedDoctor.procedures.length > 0) {
                                return selectedDoctor.procedures;
                              }
                              return settings?.procedures?.filter(proc => {
                                if (!selectedDoctor) return true;
                                const procDept = settings?.procedureDepartmentMap?.[proc];
                                return procDept === selectedDoctor.department;
                              }) || [];
                            })()}
                            selectedServices={selectedServices}
                            setSelectedServices={(services) => {
                              setSelectedServices(services);
                              if (services.length > 0) {
                                const proc = services[0];
                                const currentDoc = doctors.find(d => d.id === selectedDoctorId);
                                const supportsService = currentDoc?.procedures?.includes(proc) || 
                                                       settings?.procedureDepartmentMap?.[proc] === currentDoc?.department;
                                
                                if (activeTab === 'registration-procedure' && !supportsService && settings?.procedureDoctorMap?.[proc]) {
                                  setSelectedDoctorId(settings.procedureDoctorMap[proc]);
                                }
                              }
                            }}
                            required
                          />
                        )}

                        <div className="space-y-1.5 sm:space-y-1.5">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-blue-700 font-black text-base sm:text-sm uppercase tracking-widest mb-1 sm:mb-1">
                            <UserIcon size={14} className="sm:w-4 sm:h-4" />
                            রোগীর নাম <span className="text-red-500">*</span>
                          </div>
                          <input 
                            type="text" 
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="w-full p-3.5 sm:p-3 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-black text-slate-800 text-base sm:text-base focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                            placeholder="রোগীর সম্পূর্ণ নাম লিখুন"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          {/* Patient Age */}
                          <div className="space-y-1.5 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 font-black text-sm sm:text-sm uppercase tracking-widest mb-1 sm:mb-1">
                              <Clock size={14} className="sm:w-4 sm:h-4" />
                              রোগীর বয়স
                            </div>
                            <input 
                              type="text" 
                              value={patientAge}
                              onChange={(e) => setPatientAge(e.target.value)}
                              className="w-full p-3 sm:p-2.5 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 text-base sm:text-base focus:border-slate-400 transition-colors"
                              placeholder="যেমন: ২৫"
                            />
                          </div>

                          {/* Serial Number */}
                          <div className="space-y-1.5 sm:space-y-1.5">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-purple-700 font-black text-sm sm:text-sm uppercase tracking-widest mb-1 sm:mb-1">
                              <Activity size={14} className="sm:w-4 sm:h-4" />
                              সিরিয়াল নাম্বার
                            </div>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={manualSerial}
                                onChange={(e) => setManualSerial(parseInt(e.target.value) || 0)}
                                className="w-full p-3 sm:p-2.5 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-black text-purple-700 text-base sm:text-base focus:border-purple-500 transition-colors"
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0">
                                <button type="button" onClick={() => setManualSerial(prev => prev + 1)} className="p-1 hover:bg-purple-100 text-purple-600 rounded-none transition-colors"><ChevronDown className="rotate-180" size={16} /></button>
                                <button type="button" onClick={() => setManualSerial(prev => Math.max(1, prev - 1))} className="p-1 hover:bg-purple-100 text-purple-600 rounded-none transition-colors"><ChevronDown size={16} /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                  {/* Patient Type */}
                  {activeTab === 'registration' && (
                    <div className="space-y-1.5 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 font-black text-sm sm:text-sm uppercase tracking-widest mb-1 sm:mb-1">
                        <Users size={14} className="sm:w-4 sm:h-4" />
                        রোগীর ধরন
                      </div>
                      <div className="flex flex-row gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setPatientType('new')}
                          className={cn(
                            "flex-1 py-3 sm:py-2.5 px-4 sm:px-4 font-black text-base sm:text-base rounded-none transition-all border-2 flex items-center justify-center gap-1.5 sm:gap-2",
                            patientType === 'new' 
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-600"
                          )}
                        >
                          <Plus size={18} className="sm:w-5 sm:h-5" />
                          নতুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientType('followup')}
                          className={cn(
                            "flex-1 py-3 sm:py-2.5 px-4 sm:px-4 font-black text-base sm:text-base rounded-none transition-all border-2 flex items-center justify-center gap-1.5 sm:gap-2",
                            patientType === 'followup' 
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600"
                          )}
                        >
                          <CalendarIcon size={18} className="sm:w-5 sm:h-5" />
                          ফলোআপ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hospital Number */}
                  <div className="space-y-1.5 sm:space-y-1.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-slate-600 font-black text-sm sm:text-sm uppercase tracking-widest mb-1 sm:mb-1">
                      <Hash size={14} className="sm:w-4 sm:h-4" />
                      হাসপাতাল নাম্বার (H)
                    </div>
                    <input 
                      type="text" 
                      value={hospitalNumber}
                      onChange={(e) => setHospitalNumber(e.target.value)}
                      className="w-full p-3.5 sm:p-3 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 text-base sm:text-base focus:border-slate-400 transition-colors uppercase"
                      placeholder="যেমন: H12345678"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="space-y-2 sm:space-y-3 pt-4 sm:pt-3">
                    <button
                      type="submit"
                      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-500 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 flex items-center p-3 sm:p-3"
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      
                      <div 
                        className={cn(
                          "relative z-10 flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md transition-all duration-300 cursor-pointer border",
                          autoPrint 
                            ? "bg-white/20 border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                            : "bg-black/10 border-black/20 hover:bg-black/20"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAutoPrint(!autoPrint);
                        }}
                        title={autoPrint ? "অটো প্রিন্ট চালু আছে" : "অটো প্রিন্ট বন্ধ আছে"}
                      >
                        <div className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center transition-all duration-300",
                          autoPrint ? "bg-white text-indigo-600 scale-110" : "bg-white/20 text-white/0"
                        )}>
                          <CheckCircle2 size={12} className={cn("sm:w-3.5 sm:h-3.5 transition-all duration-300", autoPrint ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                        </div>
                        <Printer size={16} className={cn("sm:w-4 sm:h-4 transition-all duration-300", autoPrint ? "text-white" : "text-white/70")} />
                      </div>

                      <div className="relative z-10 flex-1 flex items-center justify-center gap-2 sm:gap-3 pr-4 sm:pr-6 pl-2">
                        <span className="font-black text-lg sm:text-lg tracking-wide drop-shadow-md">
                          {editingPatientId ? 'আপডেট' : 'সাবমিট'}
                        </span>
                        <ArrowRight size={20} className="sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-md" />
                      </div>
                    </button>
                    {editingPatientId && (
                      <button
                        type="button"
                        onClick={cancelPatientEdit} className="w-full py-1.5 sm:py-2 bg-slate-100 text-slate-600 rounded-none font-black text-xs sm:text-sm hover:bg-slate-200 transition-all active:scale-95 border-b-4 border-slate-300 flex items-center justify-center gap-2.5 sm:gap-3"
                      >
                        <X size={16} className="sm:w-4.5 sm:h-4.5" />
                        বাতিল করুন
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

              {/* List Column */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-2 sm:space-y-4 mt-0 lg:mt-0">
                <div className="bg-white rounded-none shadow-xl border-2 border-slate-200 overflow-hidden mt-0 sm:mt-0">
                  <div className="flex flex-col sm:flex-row border-b-2 border-slate-200 items-stretch">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 font-black text-base sm:text-base md:text-lg flex-1 flex items-center gap-2 sm:gap-2.5">
                      <Activity size={16} className="sm:w-4 sm:h-4 text-blue-200" />
                      {activeTab === 'registration-procedure' && selectedServices.length > 0 
                        ? `${getProcedureConfig(selectedServices[0]).label} সিরিয়াল তালিকা` 
                        : `${doctors.find(d => d.id === selectedDoctorId)?.name || 'আজকের'} এর সিরিয়াল তালিকা`}
                    </div>
                    <div className="bg-slate-50 p-1.5 px-2 md:px-3 flex items-center gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-slate-200 min-w-0 sm:min-w-[240px]">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-slate-200 rounded-none px-2 sm:px-2.5 py-1 w-full focus-within:border-blue-500 transition-all">
                        <Search size={14} className="sm:w-3.5 sm:h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="সিরিয়াল বা নাম দিয়ে খুঁজুন..."
                          value={patientSearchTerm}
                          onChange={(e) => setPatientSearchTerm(e.target.value)}
                          className="bg-transparent outline-none font-bold text-slate-700 text-[10px] sm:text-xs w-full placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto hidden sm:block">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 border-b-2 border-slate-200">
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em] text-center w-16">টোকেন</th>
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em]">রোগীর নাম</th>
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em] text-center w-16">বয়স</th>
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em] text-center">হাসপাতাল নাম্বার</th>
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em] text-center">রোগীর ধরন</th>
                          <th className="px-3 py-2 font-black text-[9px] uppercase tracking-[0.15em] text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patients
                          .filter(p => activeTab === 'registration' 
                            ? (p.service === 'general' || !p.service)
                            : (p.service && p.service !== 'general')
                          )
                          .filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                                       p.serialNumber.toString().includes(patientSearchTerm) ||
                                       (p.hospitalNumber && p.hospitalNumber.toLowerCase().includes(patientSearchTerm.toLowerCase())))
                          .map((p, idx) => (
                          <tr key={`stat-proc-${p.id}-${idx}`} className={cn(
                            "hover:bg-blue-50/30 transition-colors group",
                            editingPatientId === p.id ? "bg-blue-50" : 
                            p.status === 'running' ? "bg-red-50/50 border-l-4 border-l-red-500" : 
                            "bg-white"
                          )}>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                "inline-flex items-center justify-center w-7 h-7 rounded-none font-black transition-all text-xs",
                                editingPatientId === p.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white"
                              )}>
                                {p.serialNumber}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-black text-slate-900 text-sm flex items-center gap-1">
                                {p.name}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.service || 'General'}</p>
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-600 text-xs">{p.age || '-'}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-500 text-[10px]">{p.hospitalNumber || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                p.patientType === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              )}>
                                {p.patientType === 'new' ? 'নতুন' : 'ফলোআপ'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditPatientForm(p)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded-none transition-all"
                                  title="এডিট করুন"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => deletePatient(p.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded-none transition-all"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for Patients */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {patients
                      .filter(p => activeTab === 'registration' 
                        ? (p.service === 'general' || !p.service)
                        : (p.service && p.service !== 'general')
                      )
                      .filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                                   p.serialNumber.toString().includes(patientSearchTerm) ||
                                   (p.hospitalNumber && p.hospitalNumber.toLowerCase().includes(patientSearchTerm.toLowerCase())))
                      .map((p, idx) => (
                      <div key={`mobile-patient-${p.id}-${idx}`} className={cn(
                        "p-4 flex flex-col gap-3",
                        editingPatientId === p.id ? "bg-blue-50" : 
                        p.status === 'running' ? "bg-red-50/50 border-l-4 border-l-red-500" : 
                        "bg-white"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-none font-black text-sm",
                              editingPatientId === p.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                            )}>
                              {p.serialNumber}
                            </span>
                            <div>
                              <p className="font-black text-slate-900 text-base leading-none mb-1">{p.name}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                  p.patientType === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                )}>
                                  {p.patientType === 'new' ? 'নতুন' : 'ফলোআপ'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.service || 'General'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPatientForm(p)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-none transition-all"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deletePatient(p.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-none transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 bg-slate-50 p-2 border border-slate-100">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            বয়স: {p.age || '-'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Hash size={10} />
                            H: {p.hospitalNumber || '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(activeTab === 'registration' 
                    ? patients.filter(p => p.service === 'general' || !p.service)
                    : patients.filter(p => p.service && p.service !== 'general')
                  ).length === 0 && (
                    <div className="px-4 py-20 text-center text-slate-400 font-bold italic border-t-2 border-slate-100">
                      কোনো সিরিয়াল পাওয়া যায়নি
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'management' && (
          <div className="w-full px-2 md:px-4">
            <div className="mb-8 md:mb-12">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-8">
                {/* Header Content */}
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-none shadow-xl shadow-blue-600/20 shrink-0">
                    <Activity size={20} className="md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight mb-0">লাইভ সিরিয়াল কন্ট্রোল</h2>
                    <p className="text-[9px] md:text-sm font-bold text-slate-400 uppercase tracking-[0.15em]">পেশেন্ট ম্যানেজমেন্ট ড্যাশবোর্ড</p>
                  </div>
                </div>

                {/* Live Serial Control Cards (Inside header, aligned right) */}
                <div className="grid grid-cols-5 gap-1 md:gap-2 w-full md:w-auto shrink-0 ml-auto">
                  <div className="w-16 md:w-24">
                    <StatCard 
                      icon={<CheckCircle2 />} 
                      label="সম্পন্ন" 
                      value={patients.filter(p => p.status === 'completed').length} 
                      trend="আজ"
                      color="bg-gradient-to-br from-emerald-600 to-emerald-700"
                      accentColor="text-emerald-600"
                    />
                  </div>
                  <div className="w-16 md:w-24">
                    <StatCard 
                      icon={<Clock />} 
                      label="অপেক্ষমান" 
                      value={patients.filter(p => p.status === 'waiting').length} 
                      trend="আজ"
                      color="bg-gradient-to-br from-amber-600 to-amber-700"
                      accentColor="text-amber-600"
                    />
                  </div>
                  <div className="w-16 md:w-24">
                    <StatCard 
                      icon={<Play />} 
                      label="রানিং" 
                      value={patients.filter(p => p.status === 'running').length} 
                      trend="আজ"
                      color="bg-gradient-to-br from-blue-600 to-blue-700"
                      accentColor="text-blue-600"
                    />
                  </div>
                  <div className="w-16 md:w-24">
                    <StatCard 
                      icon={<UserX />} 
                      label="অনুপস্থিত" 
                      value={patients.filter(p => p.status === 'absent').length} 
                      trend="আজ"
                      color="bg-gradient-to-br from-red-600 to-red-700"
                      accentColor="text-red-600"
                    />
                  </div>
                  <div className="w-16 md:w-24">
                    <StatCard 
                      icon={<FileText />} 
                      label="রিপোর্ট" 
                      value={patients.filter(p => p.status === 'reported').length} 
                      trend="আজ"
                      color="bg-gradient-to-br from-purple-600 to-purple-700"
                      accentColor="text-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Selection */}
              <div className="mb-8 md:mb-12">
                <DoctorSelector 
                  doctors={displayDoctors}
                  allPatients={allPatients}
                  selectedDoctorId={selectedDoctorId}
                  setSelectedDoctorId={setSelectedDoctorId}
                />
              </div>
            </div>

            <div className="bg-white rounded-none shadow-2xl shadow-slate-200/60 border-2 border-slate-200 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
              
              {/* Mobile Summary Line */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b-2 border-slate-200 md:hidden">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">সিরিয়াল কন্ট্রোল লাইন</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 border border-blue-100 uppercase tracking-widest">
                  {patients.length} জন রোগী
                </span>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">টোকেন</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">রোগীর বিস্তারিত তথ্য</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">বর্তমান অবস্থা</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">অ্যাকশন প্যানেল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPatients.length > 0 ? currentPatients.map(p => (
                      <tr
                        key={`table-${p.id}`} className={cn(
                          "hover:bg-blue-50/30 transition-all group", 
                          p.status === 'running' && "bg-emerald-50/50"
                        )}>
                        <td className="px-8 py-8">
                          <div className="w-14 h-14 bg-slate-100 rounded-none flex items-center justify-center font-black text-2xl text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border-2 border-transparent group-hover:border-blue-400">
                            {p.serialNumber}
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <div className="flex items-center gap-4 mb-1">
                            <p className="font-black text-slate-900 text-2xl tracking-tight flex items-center gap-2">
                              {p.name}
                            </p>
                            {p.patientType && (
                              <span className={cn(
                                "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                                p.patientType === 'new' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                              )}>
                                {p.patientType === 'new' ? 'নতুন রোগী' : 'ফলোআপ'}
                              </span>
                            )}
                            {p.service && p.service !== 'general' && (
                              <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border bg-orange-50 text-orange-700 border-orange-100">
                                {p.service}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 font-bold">
                            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest">
                              <Clock size={14} />
                              বয়স: {p.age || 'N/A'}
                            </span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest">
                              <Activity size={14} />
                              সার্ভিস: {p.service || 'General'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <div className="relative w-fit">
                            <select 
                              value={p.status || 'waiting'}
                              onChange={(e) => updatePatientStatus(p.id, e.target.value)}
                              className={cn(
                                "text-[11px] font-black px-6 py-3 rounded-none outline-none border-2 transition-all cursor-pointer uppercase tracking-[0.2em] appearance-none pr-12",
                                p.status === 'running' ? "bg-red-600 text-white border-red-700 shadow-xl shadow-red-600/20" :
                                p.status === 'next' ? "bg-blue-600 text-white border-blue-700 shadow-xl shadow-blue-600/20" :
                                p.status === 'absent' ? "bg-orange-600 text-white border-orange-700 shadow-xl shadow-orange-600/20" :
                                p.status === 'completed' ? "bg-slate-100 text-slate-400 border-slate-200" :
                                "bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-600/20"
                              )}
                            >
                              <option value="waiting" className="bg-white text-slate-900">অপেক্ষমান</option>
                              <option value="next" className="bg-white text-slate-900">এরপর</option>
                              <option value="calling" className="bg-white text-slate-900">কল করা হচ্ছে</option>
                              <option value="running" className="bg-white text-slate-900">রানিং</option>
                              <option value="absent" className="bg-white text-slate-900">অনুপস্থিত</option>
                              <option value="completed" className="bg-white text-slate-900">সম্পন্ন</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                          </div>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => updatePatientStatus(p.id, 'calling')}
                              className="w-12 h-12 flex items-center justify-center text-orange-600 bg-orange-50 hover:bg-orange-600 hover:text-white rounded-none transition-all active:scale-90 border-2 border-orange-100 hover:border-orange-600 shadow-sm"
                              title="কল করুন"
                            >
                              <Phone size={22} />
                            </button>
                            <button
                              onClick={() => printSerial(p)}
                              className="w-12 h-12 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-none transition-all active:scale-90 border-2 border-indigo-100 hover:border-indigo-600 shadow-sm"
                              title="প্রিন্ট করুন"
                            >
                              <Download size={22} />
                            </button>
                            <button
                              onClick={() => openEditPatientForm(p)}
                              className="w-12 h-12 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-none transition-all active:scale-90 border-2 border-blue-100 hover:border-blue-600 shadow-sm"
                              title="এডিট করুন"
                            >
                              <Edit size={22} />
                            </button>
                            <button
                              onClick={() => updatePatientStatus(p.id, 'completed')}
                              className="w-12 h-12 flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-none transition-all active:scale-90 border-2 border-emerald-100 hover:border-emerald-600 shadow-sm"
                              title="সম্পন্ন করুন"
                            >
                              <CheckCircle2 size={24} />
                            </button>
                            <button
                              onClick={() => deletePatient(p.id)}
                              className="w-12 h-12 flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-500 hover:text-white rounded-none transition-all active:scale-90 border-2 border-red-100 hover:border-red-500 shadow-sm"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-24 text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-black italic">এই ডাক্তারের জন্য কোনো সিরিয়াল নেই</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="flex justify-center items-center gap-2 py-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-4 py-2 bg-slate-100 rounded-none disabled:opacity-50 font-black text-xs uppercase tracking-widest"
                  >
                    পূর্বের
                  </button>
                  <span className="font-black text-xs uppercase tracking-widest">পৃষ্ঠা {currentPage} / {Math.ceil(patients.length / patientsPerPage) || 1}</span>
                  <button
                    disabled={currentPage >= Math.ceil(patients.length / patientsPerPage)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-4 py-2 bg-slate-100 rounded-none disabled:opacity-50 font-black text-xs uppercase tracking-widest"
                  >
                    পরবর্তী
                  </button>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {currentPatients.length > 0 ? currentPatients.map(p => (
                  <div key={p.id} className={cn(
                    "p-6 space-y-4",
                    p.status === 'running' ? "bg-emerald-50/30" : "bg-white"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-slate-100 rounded-none flex items-center justify-center font-black text-xl text-slate-600 border-2 border-slate-200">
                        {p.serialNumber}
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
                        <button
                          onClick={() => updatePatientStatus(p.id, 'calling')}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-orange-600 bg-orange-50 border border-orange-100"
                          title="কল করুন"
                        >
                          <Phone size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => printSerial(p)}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-indigo-600 bg-indigo-50 border border-indigo-100"
                          title="প্রিন্ট করুন"
                        >
                          <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => openEditPatientForm(p)}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-blue-600 bg-blue-50 border border-blue-100"
                        >
                          <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => updatePatientStatus(p.id, 'completed')}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 border border-emerald-100"
                        >
                          <CheckCircle2 size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </button>
                        <button
                          onClick={() => deletePatient(p.id)}
                          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-red-400 bg-red-50 border border-red-100"
                        >
                          <Trash2 size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-black text-slate-900 text-xl tracking-tight flex items-center gap-1">
                          {p.name}
                        </p>
                        {p.patientType && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                            p.patientType === 'new' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                          )}>
                            {p.patientType === 'new' ? 'নতুন' : 'ফলোআপ'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        <span>বয়স: {p.age || 'N/A'}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span>সার্ভিস: {p.service || 'General'}</span>
                      </div>
                    </div>

                    <div className="relative">
                      <select 
                        value={p.status || 'waiting'}
                        onChange={(e) => updatePatientStatus(p.id, e.target.value)}
                        className={cn(
                          "w-full text-[10px] font-black px-4 py-3 rounded-none outline-none border-2 transition-all uppercase tracking-[0.2em] appearance-none",
                          p.status === 'running' ? "bg-red-600 text-white border-red-700" :
                          p.status === 'next' ? "bg-blue-600 text-white border-blue-700" :
                          p.status === 'absent' ? "bg-orange-600 text-white border-orange-700" :
                          p.status === 'completed' ? "bg-slate-100 text-slate-400 border-slate-200" :
                          "bg-emerald-600 text-white border-emerald-700"
                        )}
                      >
                        <option value="waiting">অপেক্ষমান</option>
                        <option value="next">এরপর</option>
                        <option value="running">রানিং</option>
                        <option value="absent">অনুপস্থিত</option>
                        <option value="completed">সম্পন্ন</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-slate-400 font-black italic">এই ডাক্তারের জন্য কোনো সিরিয়াল নেই</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system-settings' && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div className="mb-8">
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-4 md:mb-6 uppercase">সিস্টেম কনফিগারেশন</h2>
              
              {/* Sub-tabs Navigation - Visible only on mobile */}
              <div className="md:hidden mb-8">
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                  {canManageHospitalProfile && (
                    <button
                      onClick={() => setSystemTab('profile')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'profile' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Building2 size={12} />
                      প্রোফাইল
                    </button>
                  )}
                  {canManageDisplaySettings && (
                    <button
                      onClick={() => setSystemTab('display')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'display' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Monitor size={12} />
                      ডিসপ্লে
                    </button>
                  )}
                  {canManagePatientPortal && (
                    <button
                      onClick={() => setSystemTab('patient-portal')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'patient-portal' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Users size={12} />
                      পোর্টাল
                    </button>
                  )}
                  {canManageMobileNav && (
                    <button
                      onClick={() => setSystemTab('mobile-nav')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'mobile-nav' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Menu size={12} />
                      মোবাইল
                    </button>
                  )}
                  {canManagePushNotifications && (
                    <button
                      onClick={() => setSystemTab('push-notifications')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'push-notifications' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <BellRing size={12} />
                      পুশ
                    </button>
                  )}
                  {canManageBackup && (
                    <button
                      onClick={() => setSystemTab('data-backup')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'data-backup' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Database size={12} />
                      ব্যাকআপ
                    </button>
                  )}
                  {canManageWelcomePopup && (
                    <button
                      onClick={() => setSystemTab('welcome-popup')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'welcome-popup' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Sparkles size={12} />
                      পপআপ
                    </button>
                  )}
                  {canManageLoginPage && (
                    <button
                      onClick={() => setSystemTab('login-settings')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'login-settings' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <LogIn size={12} />
                      লগইন
                    </button>
                  )}
                  {canManageSettings && (
                    <button
                      onClick={() => setSystemTab('opd-summary-settings')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'opd-summary-settings' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <FileText size={12} />
                      সামারি
                    </button>
                  )}
                  {canManageSettings && (
                    <button
                      onClick={() => setSystemTab('profile')}
                      className={cn(
                        "px-1 py-3 rounded-lg font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 text-center",
                        systemTab === 'profile' 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Settings size={12} />
                      সেটিংস
                    </button>
                  )}
                </div>
              </div>

              {/* Header - Visible only on desktop */}
              <div className="mb-6 hidden md:block">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  {systemTab === 'profile' && <><Building2 className="text-blue-600" size={24} /> হাসপাতাল প্রোফাইল</>}
                  {systemTab === 'display' && <><Monitor className="text-blue-600" size={24} /> ডিসপ্লে সেটিংস</>}
                  {systemTab === 'patient-portal' && <><Users className="text-blue-600" size={24} /> পেশেন্ট পোর্টাল সেটিংস</>}
                  {systemTab === 'mobile-nav' && <><Menu className="text-blue-600" size={24} /> মোবাইল নেভিগেশন</>}
                  {systemTab === 'push-notifications' && <><BellRing className="text-blue-600" size={24} /> পুশ নোটিফিকেশন</>}
                  {systemTab === 'data-backup' && <><Database className="text-blue-600" size={24} /> ডেটা ব্যাকআপ</>}
                  {systemTab === 'welcome-popup' && <><Sparkles className="text-blue-600" size={24} /> ওয়েলকাম পপআপ</>}
                  {systemTab === 'login-settings' && <><LogIn className="text-blue-600" size={24} /> লগইন পেজ সেটিংস</>}
                  {systemTab === 'opd-summary-settings' && <><FileText className="text-blue-600" size={24} /> সামারি সেটিংস</>}
                </h3>
              </div>

              
                <div
                  key={systemTab}>
                  {systemTab === 'opd-summary-settings' && canManageSettings && (
                    <div className="space-y-10">
                      <div className="bg-white p-8 rounded-none border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                          <FileText className="text-blue-600" size={24} />
                          সামারি সেকশন সেটিংস
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">সেকশন সেটিংস (Section Settings)</label>
                              
                              <div className="space-y-6">
                                {/* OPD Summary Header Settings */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-widest mb-4">হেডার সেটিংস (Header Settings)</h4>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">হাসপাতালের নাম</label>
                                      <input 
                                        type="text"
                                        value={settings?.hospitalName || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, hospitalName: e.target.value } : null)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                        placeholder="হাসপাতালের নাম"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">স্লোগান</label>
                                      <input 
                                        type="text"
                                        value={settings?.slogan || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, slogan: e.target.value } : null)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                        placeholder="স্লোগান"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">হাসপাতালের লোগো</label>
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 bg-white border border-slate-300 rounded-none flex items-center justify-center overflow-hidden">
                                        {settings?.hospitalLogo ? (
                                          <img src={settings.hospitalLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                        ) : (
                                          <Building2 className="text-slate-300 w-8 h-8" />
                                        )}
                                      </div>
                                      <div className="flex-1 space-y-2">
                                        <input 
                                          type="text"
                                          value={settings?.hospitalLogo || ''}
                                          onChange={(e) => setSettings(prev => prev ? { ...prev, hospitalLogo: e.target.value } : null)}
                                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          placeholder="লোগো URL"
                                        />
                                        <button 
                                          onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = async (e) => {
                                              const file = (e.target as HTMLInputElement).files?.[0];
                                              if (file) {
                                                // Handle file upload here
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                  const url = e.target?.result as string;
                                                  setSettings(prev => prev ? { ...prev, hospitalLogo: url } : null);
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            };
                                            input.click();
                                          }}
                                          className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-800 text-white hover:bg-slate-900"
                                        >
                                          আপলোড লোগো
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">হেডার অ্যালাইনমেন্ট</label>
                                    <div className="flex gap-2">
                                      {['left', 'center', 'right'].map((align) => (
                                        <button
                                          key={align}
                                          onClick={() => setSettings(prev => prev ? { ...prev, headerAlignment: align as 'left' | 'center' | 'right' } : null)}
                                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border ${settings?.headerAlignment === align ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                        >
                                          {align}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Patient Summary */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.patientSummary !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, patientSummary: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.patientSummary || 'PATIENT SUMMARY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, patientSummary: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="PATIENT SUMMARY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.patientSummary || 'PATIENT SUMMARY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, patientSummary: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="PATIENT SUMMARY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.patientSummary || [
                                        { id: 'new', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.new || 'TOTAL NEW PATIENT', source: 'auto', key: 'new' },
                                        { id: 'followup', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.followup || 'TOTAL FOLLOW UP', source: 'auto', key: 'followup' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.patientSummary || [
                                                { id: 'new', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.new || 'TOTAL NEW PATIENT', source: 'auto', key: 'new' },
                                                { id: 'followup', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.followup || 'TOTAL FOLLOW UP', source: 'auto', key: 'followup' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, patientSummary: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.patientSummary || [
                                                { id: 'new', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.new || 'TOTAL NEW PATIENT', source: 'auto', key: 'new' },
                                                { id: 'followup', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.followup || 'TOTAL FOLLOW UP', source: 'auto', key: 'followup' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, patientSummary: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.patientSummary || [
                                          { id: 'new', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.new || 'TOTAL NEW PATIENT', source: 'auto', key: 'new' },
                                          { id: 'followup', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.followup || 'TOTAL FOLLOW UP', source: 'auto', key: 'followup' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন ফিল্ড', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, patientSummary: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ফিল্ড যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Ultrasonogram */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.ultrasonogram !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, ultrasonogram: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.ultrasonogram || 'ULTRASONOGRAM'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, ultrasonogram: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="ULTRASONOGRAM"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.ultrasonogram || 'ULTRASONOGRAM'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, ultrasonogram: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="ULTRASONOGRAM"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.ultrasonogram || [
                                        { id: 'total', label: settings?.opdSummarySectionFieldLabels?.ultrasonogram?.total || 'TOTAL USG', source: 'auto', key: 'total' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.ultrasonogram || [
                                                { id: 'total', label: settings?.opdSummarySectionFieldLabels?.ultrasonogram?.total || 'TOTAL USG', source: 'auto', key: 'total' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, ultrasonogram: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.ultrasonogram || [
                                                { id: 'total', label: settings?.opdSummarySectionFieldLabels?.ultrasonogram?.total || 'TOTAL USG', source: 'auto', key: 'total' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, ultrasonogram: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.ultrasonogram || [
                                          { id: 'total', label: settings?.opdSummarySectionFieldLabels?.ultrasonogram?.total || 'TOTAL USG', source: 'auto', key: 'total' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন ফিল্ড', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, ultrasonogram: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ফিল্ড যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.ultrasonogram || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.ultrasonogram || [])];
                                              newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), ultrasonogram: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.ultrasonogram || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), ultrasonogram: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.ultrasonogram || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), ultrasonogram: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Gynecology */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.gynecology !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, gynecology: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.gynecology || 'GYNECOLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, gynecology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="GYNECOLOGY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.gynecology || 'GYNAE & OBS'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, gynecology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="GYNAE & OBS"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.gynecology || [
                                        { id: 'cesarean', label: settings?.opdSummarySectionFieldLabels?.gynecology?.cesarean || 'CESAREAN OPERATION', source: 'auto', key: 'cesarean' },
                                        { id: 'normal', label: settings?.opdSummarySectionFieldLabels?.gynecology?.normal || 'NORMAL DELIVERY', source: 'auto', key: 'normal' },
                                        { id: 'dc', label: settings?.opdSummarySectionFieldLabels?.gynecology?.dc || 'D & C', source: 'auto', key: 'dc' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.gynecology || [
                                                { id: 'cesarean', label: settings?.opdSummarySectionFieldLabels?.gynecology?.cesarean || 'CESAREAN OPERATION', source: 'auto', key: 'cesarean' },
                                                { id: 'normal', label: settings?.opdSummarySectionFieldLabels?.gynecology?.normal || 'NORMAL DELIVERY', source: 'auto', key: 'normal' },
                                                { id: 'dc', label: settings?.opdSummarySectionFieldLabels?.gynecology?.dc || 'D & C', source: 'auto', key: 'dc' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, gynecology: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.gynecology || [
                                                { id: 'cesarean', label: settings?.opdSummarySectionFieldLabels?.gynecology?.cesarean || 'CESAREAN OPERATION', source: 'auto', key: 'cesarean' },
                                                { id: 'normal', label: settings?.opdSummarySectionFieldLabels?.gynecology?.normal || 'NORMAL DELIVERY', source: 'auto', key: 'normal' },
                                                { id: 'dc', label: settings?.opdSummarySectionFieldLabels?.gynecology?.dc || 'D & C', source: 'auto', key: 'dc' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, gynecology: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.gynecology || [
                                          { id: 'cesarean', label: settings?.opdSummarySectionFieldLabels?.gynecology?.cesarean || 'CESAREAN OPERATION', source: 'auto', key: 'cesarean' },
                                          { id: 'normal', label: settings?.opdSummarySectionFieldLabels?.gynecology?.normal || 'NORMAL DELIVERY', source: 'auto', key: 'normal' },
                                          { id: 'dc', label: settings?.opdSummarySectionFieldLabels?.gynecology?.dc || 'D & C', source: 'auto', key: 'dc' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন ফিল্ড', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, gynecology: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ফিল্ড যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.gynecology || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.gynecology || [])];
                                              newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gynecology: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.gynecology || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gynecology: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.gynecology || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gynecology: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Radiology */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.radiology !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, radiology: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.radiology || 'RADIOLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, radiology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="RADIOLOGY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.radiology || 'RADIOLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, radiology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="RADIOLOGY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.radiology || [
                                        { id: 'ct', label: settings?.opdSummarySectionFieldLabels?.radiology?.ct || 'TOTAL CT-SCAN', source: 'auto', key: 'ct' },
                                        { id: 'xray', label: settings?.opdSummarySectionFieldLabels?.radiology?.xray || 'TOTAL X-RAY', source: 'auto', key: 'xray' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.radiology || [
                                                { id: 'ct', label: settings?.opdSummarySectionFieldLabels?.radiology?.ct || 'TOTAL CT-SCAN', source: 'auto', key: 'ct' },
                                                { id: 'xray', label: settings?.opdSummarySectionFieldLabels?.radiology?.xray || 'TOTAL X-RAY', source: 'auto', key: 'xray' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, radiology: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.radiology || [
                                                { id: 'ct', label: settings?.opdSummarySectionFieldLabels?.radiology?.ct || 'TOTAL CT-SCAN', source: 'auto', key: 'ct' },
                                                { id: 'xray', label: settings?.opdSummarySectionFieldLabels?.radiology?.xray || 'TOTAL X-RAY', source: 'auto', key: 'xray' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, radiology: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.radiology || [
                                          { id: 'ct', label: settings?.opdSummarySectionFieldLabels?.radiology?.ct || 'TOTAL CT-SCAN', source: 'auto', key: 'ct' },
                                          { id: 'xray', label: settings?.opdSummarySectionFieldLabels?.radiology?.xray || 'TOTAL X-RAY', source: 'auto', key: 'xray' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন ফিল্ড', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, radiology: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ফিল্ড যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.radiology || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.radiology || [])];
                                              newRows[rIdx].name = e.target.value;
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), radiology: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.radiology || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), radiology: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.radiology || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), radiology: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Emergency */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.emergency !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, emergency: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.emergency || 'EMERGENCY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, emergency: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="EMERGENCY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.emergency || 'EMERGENCY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, emergency: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="EMERGENCY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.emergency || [
                                        { id: 'total', label: settings?.opdSummarySectionFieldLabels?.emergency?.total || 'TOTAL PATIENT', source: 'auto', key: 'total' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.emergency || [
                                                { id: 'total', label: settings?.opdSummarySectionFieldLabels?.emergency?.total || 'TOTAL PATIENT', source: 'auto', key: 'total' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, emergency: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.emergency || [
                                                { id: 'total', label: settings?.opdSummarySectionFieldLabels?.emergency?.total || 'TOTAL PATIENT', source: 'auto', key: 'total' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, emergency: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.emergency || [
                                          { id: 'total', label: settings?.opdSummarySectionFieldLabels?.emergency?.total || 'TOTAL PATIENT', source: 'auto', key: 'total' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন ফিল্ড', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, emergency: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ফিল্ড যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.emergency || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.emergency || [])];
                                              newRows[rIdx].name = e.target.value;
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), emergency: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.emergency || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), emergency: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.emergency || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), emergency: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Dental Surgery */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-4">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.dentalSurgery !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, dentalSurgery: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.dentalSurgery || 'DENTAL SURGERY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, dentalSurgery: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="DENTAL SURGERY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.dentalSurgery || 'DENTAL SURGERY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, dentalSurgery: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="DENTAL SURGERY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রসিডিওরসমূহ (Procedures / Rows)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.dentalSurgery || [
                                        { id: 'root_canal', label: 'ROOT CANAL', source: 'manual' },
                                        { id: 'filling', label: 'FILLING', source: 'manual' },
                                        { id: 'extraction', label: 'EXTRACTION', source: 'manual' },
                                        { id: 'pulpectomy', label: 'PULPECTOMY', source: 'manual' },
                                        { id: 'dental_scalling', label: 'DENTAL SCALLING', source: 'manual' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.dentalSurgery || [
                                                { id: 'root_canal', label: 'ROOT CANAL', source: 'manual' },
                                                { id: 'filling', label: 'FILLING', source: 'manual' },
                                                { id: 'extraction', label: 'EXTRACTION', source: 'manual' },
                                                { id: 'pulpectomy', label: 'PULPECTOMY', source: 'manual' },
                                                { id: 'dental_scalling', label: 'DENTAL SCALLING', source: 'manual' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, dentalSurgery: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.dentalSurgery || [
                                                { id: 'root_canal', label: 'ROOT CANAL', source: 'manual' },
                                                { id: 'filling', label: 'FILLING', source: 'manual' },
                                                { id: 'extraction', label: 'EXTRACTION', source: 'manual' },
                                                { id: 'pulpectomy', label: 'PULPECTOMY', source: 'manual' },
                                                { id: 'dental_scalling', label: 'DENTAL SCALLING', source: 'manual' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, dentalSurgery: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.dentalSurgery || [
                                          { id: 'root_canal', label: 'ROOT CANAL', source: 'manual' },
                                          { id: 'filling', label: 'FILLING', source: 'manual' },
                                          { id: 'extraction', label: 'EXTRACTION', source: 'manual' },
                                          { id: 'pulpectomy', label: 'PULPECTOMY', source: 'manual' },
                                          { id: 'dental_scalling', label: 'DENTAL SCALLING', source: 'manual' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন প্রসিডিওর', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, dentalSurgery: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> প্রসিডিওর যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.dentalSurgery || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.dentalSurgery || [])];
                                              newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), dentalSurgery: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.dentalSurgery || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), dentalSurgery: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.dentalSurgery || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), dentalSurgery: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Cardiology */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-4">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.cardiology !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, cardiology: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.cardiology || 'CARDIOLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, cardiology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="CARDIOLOGY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.cardiology || 'CARDIOLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, cardiology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="CARDIOLOGY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রসিডিওরসমূহ (Procedures / Rows)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.cardiology || [
                                        { id: 'echo_2d', label: 'ECHO 2D', source: 'auto' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.cardiology || [
                                                { id: 'echo_2d', label: 'ECHO 2D', source: 'auto' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, cardiology: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.cardiology || [
                                                { id: 'echo_2d', label: 'ECHO 2D', source: 'auto' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, cardiology: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.cardiology || [
                                          { id: 'echo_2d', label: 'ECHO 2D', source: 'auto' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন প্রসিডিওর', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, cardiology: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> প্রসিডিওর যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.cardiology || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.cardiology || [])];
                                              newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), cardiology: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.cardiology || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), cardiology: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.cardiology || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), cardiology: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>

                                {/* Gastroenterology */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-4">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                      <input 
                                        type="checkbox" 
                                        checked={settings?.opdSummarySections?.gastroenterology !== false}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev, 
                                          opdSummarySections: { ...prev.opdSummarySections, gastroenterology: e.target.checked }
                                        } : null)}
                                        className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                    </label>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionTitles?.gastroenterology || 'GASTROENTEROLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionTitles: { ...prev.opdSummarySectionTitles, gastroenterology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="GASTROENTEROLOGY"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                      <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                      <input 
                                        type="text"
                                        value={settings?.opdSummarySectionDepts?.gastroenterology || 'GASTROENTEROLOGY'}
                                        onChange={(e) => setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionDepts: { ...prev.opdSummarySectionDepts, gastroenterology: e.target.value }
                                        } : null)}
                                        className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                        placeholder="GASTROENTEROLOGY"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 pl-8">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রসিডিওরসমূহ (Procedures / Rows)</p>
                                    <div className="space-y-2">
                                      {(settings?.opdSummarySectionFields?.gastroenterology || [
                                        { id: 'endoscopy', label: 'ENDOSCOPY', source: 'auto' },
                                        { id: 'colonoscopy', label: 'COLONOSCOPY', source: 'auto' },
                                        { id: 'fibroscan', label: 'FIBROSCAN', source: 'auto' },
                                        { id: 'ercp', label: 'ERCP', source: 'auto' }
                                      ]).map((field, fIdx) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                              const currentFields = settings?.opdSummarySectionFields?.gastroenterology || [
                                                { id: 'endoscopy', label: 'ENDOSCOPY', source: 'auto' },
                                                { id: 'colonoscopy', label: 'COLONOSCOPY', source: 'auto' },
                                                { id: 'fibroscan', label: 'FIBROSCAN', source: 'auto' },
                                                { id: 'ercp', label: 'ERCP', source: 'auto' }
                                              ];
                                              const newFields = [...currentFields];
                                              newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, gastroenterology: newFields }
                                              } : null);
                                            }}
                                            className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                          />
                                          <button 
                                            onClick={() => {
                                              const currentFields = settings?.opdSummarySectionFields?.gastroenterology || [
                                                { id: 'endoscopy', label: 'ENDOSCOPY', source: 'auto' },
                                                { id: 'colonoscopy', label: 'COLONOSCOPY', source: 'auto' },
                                                { id: 'fibroscan', label: 'FIBROSCAN', source: 'auto' },
                                                { id: 'ercp', label: 'ERCP', source: 'auto' }
                                              ];
                                              const newFields = currentFields.filter((_, idx) => idx !== fIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionFields: { ...prev.opdSummarySectionFields, gastroenterology: newFields }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentFields = settings?.opdSummarySectionFields?.gastroenterology || [
                                          { id: 'endoscopy', label: 'ENDOSCOPY', source: 'auto' },
                                          { id: 'colonoscopy', label: 'COLONOSCOPY', source: 'auto' },
                                          { id: 'fibroscan', label: 'FIBROSCAN', source: 'auto' },
                                          { id: 'ercp', label: 'ERCP', source: 'auto' }
                                        ];
                                        const newFields = [...currentFields, { id: `manual_${Date.now()}`, label: 'নতুন প্রসিডিওর', source: 'manual' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionFields: { ...prev.opdSummarySectionFields, gastroenterology: newFields }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> প্রসিডিওর যোগ করুন
                                    </button>
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                    <div className="space-y-2 mb-2">
                                      {(settings?.opdSummarySectionRows?.gastroenterology || []).map((row, rIdx) => (
                                        <div key={row.id} className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={row.name}
                                            onChange={(e) => {
                                              const newRows = [...(settings?.opdSummarySectionRows?.gastroenterology || [])];
                                              newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gastroenterology: newRows }
                                              } : null);
                                            }}
                                            placeholder="ডাক্তারের নাম"
                                            className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              const newRows = (settings?.opdSummarySectionRows?.gastroenterology || []).filter((_, idx) => idx !== rIdx);
                                              setSettings(prev => prev ? {
                                                ...prev,
                                                opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gastroenterology: newRows }
                                              } : null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentRows = settings?.opdSummarySectionRows?.gastroenterology || [];
                                        const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), gastroenterology: newRows }
                                        } : null);
                                      }}
                                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> ডাক্তার যোগ করুন
                                    </button>
                                  </div>
                                </div>



                                {/* Custom Sections */}
                                {(settings?.opdSummaryCustomSections || []).map((section, sIdx) => (
                                  <div key={section.id} className="p-4 bg-slate-50 border border-slate-200 rounded-none space-y-3">
                                    <div className="flex flex-wrap items-center gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer min-w-fit">
                                        <input 
                                          type="checkbox" 
                                          checked={section.enabled}
                                          onChange={(e) => {
                                            const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                            newSections[sIdx] = { ...newSections[sIdx], enabled: e.target.checked };
                                            setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                          }}
                                          className="w-5 h-5 rounded-none border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">সক্রিয়</span>
                                      </label>
                                      <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                        <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Title:</span>
                                        <input 
                                          type="text"
                                          value={section.title}
                                          onChange={(e) => {
                                            const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                            newSections[sIdx] = { ...newSections[sIdx], title: e.target.value };
                                            setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                          }}
                                          className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                          placeholder="সেকশন টাইটেল"
                                        />
                                      </div>
                                      <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                                        <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Dept:</span>
                                        <input 
                                          type="text"
                                          value={section.dept || section.title}
                                          onChange={(e) => {
                                            const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                            newSections[sIdx] = { ...newSections[sIdx], dept: e.target.value };
                                            setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                          }}
                                          className="flex-1 bg-transparent border-b border-slate-300 font-bold text-slate-700 focus:border-blue-500 outline-none text-sm"
                                          placeholder="ডিপার্টমেন্ট"
                                        />
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newSections = (settings?.opdSummaryCustomSections || []).filter((_, idx) => idx !== sIdx);
                                          const newOrder = (settings?.opdSummarySectionOrder || []).filter(id => id !== section.id);
                                          setSettings(prev => prev ? { 
                                            ...prev, 
                                            opdSummaryCustomSections: newSections,
                                            opdSummarySectionOrder: newOrder
                                          } : null);
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        title="সেকশন মুছুন"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>

                                    <div className="space-y-3 pl-8">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ফিল্ডসমূহ (Fields / Columns)</p>
                                      <div className="space-y-2">
                                        {section.fields.map((field, fIdx) => (
                                          <div key={field.id} className="flex items-center gap-2">
                                            <input 
                                              type="text"
                                              value={field.label}
                                              onChange={(e) => {
                                                const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                                const newFields = [...newSections[sIdx].fields];
                                                newFields[fIdx] = { ...newFields[fIdx], label: e.target.value };
                                                newSections[sIdx] = { ...newSections[sIdx], fields: newFields };
                                                setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                              }}
                                              className="flex-1 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-600 bg-transparent"
                                            />
                                            <button 
                                              onClick={() => {
                                                const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                                const newFields = newSections[sIdx].fields.filter((_, idx) => idx !== fIdx);
                                                newSections[sIdx] = { ...newSections[sIdx], fields: newFields };
                                                setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                              }}
                                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newSections = [...(settings?.opdSummaryCustomSections || [])];
                                          const newFields = [...newSections[sIdx].fields, { id: `field_${Date.now()}`, label: 'নতুন ফিল্ড' }];
                                          newSections[sIdx] = { ...newSections[sIdx], fields: newFields };
                                          setSettings(prev => prev ? { ...prev, opdSummaryCustomSections: newSections } : null);
                                        }}
                                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                      >
                                        <Plus size={10} /> ফিল্ড যোগ করুন
                                      </button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ম্যানুয়াল ডাক্তার/রো সমূহ (ঐচ্ছিক)</label>
                                      <div className="space-y-2 mb-2">
                                        {(settings?.opdSummarySectionRows?.[section.id] || []).map((row, rIdx) => (
                                          <div key={row.id} className="flex items-center gap-2">
                                            <input 
                                              type="text"
                                              value={row.name}
                                              onChange={(e) => {
                                                const newRows = [...(settings?.opdSummarySectionRows?.[section.id] || [])];
                                                newRows[rIdx] = { ...newRows[rIdx], name: e.target.value };
                                                setSettings(prev => prev ? {
                                                  ...prev,
                                                  opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), [section.id]: newRows }
                                                } : null);
                                              }}
                                              placeholder="ডাক্তারের নাম"
                                              className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-none focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                            <button 
                                              onClick={() => {
                                                const newRows = (settings?.opdSummarySectionRows?.[section.id] || []).filter((_, idx) => idx !== rIdx);
                                                setSettings(prev => prev ? {
                                                  ...prev,
                                                  opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), [section.id]: newRows }
                                                } : null);
                                              }}
                                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const currentRows = settings?.opdSummarySectionRows?.[section.id] || [];
                                          const newRows = [...currentRows, { id: `row_${Date.now()}`, name: '' }];
                                          setSettings(prev => prev ? {
                                            ...prev,
                                            opdSummarySectionRows: { ...(prev.opdSummarySectionRows || {}), [section.id]: newRows }
                                          } : null);
                                        }}
                                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                      >
                                        <Plus size={10} /> ডাক্তার যোগ করুন
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <button 
                                  onClick={() => {
                                    const newId = `custom_${Date.now()}`;
                                    const newSection = {
                                      id: newId,
                                      title: 'নতুন সেকশন',
                                      dept: 'নতুন ডিপার্টমেন্ট',
                                      enabled: true,
                                      fields: [{ id: `field_${Date.now()}`, label: 'নতুন ফিল্ড' }]
                                    };
                                    setSettings(prev => prev ? {
                                      ...prev,
                                      opdSummaryCustomSections: [...(prev.opdSummaryCustomSections || []), newSection],
                                      opdSummarySectionOrder: [...(prev.opdSummarySectionOrder || []), newId]
                                    } : null);
                                  }}
                                  className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 font-bold text-xs uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 bg-slate-50"
                                >
                                  <Plus size={16} /> নতুন সেকশন যোগ করুন
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                                <div className="space-y-4 border-t border-slate-100 pt-6">
                                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">সেকশন ক্রম (Section Order)</label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const defaultSections = ['patientSummary', 'ultrasonogram', 'gynecology', 'radiology', 'emergency', 'dentalSurgery', 'cardiology', 'gastroenterology'];
                                      const customSections = settings?.opdSummaryCustomSections?.map(s => s.id) || [];
                                      let order = settings?.opdSummarySectionOrder || [...defaultSections, ...customSections];
                                      
                                      // Ensure all sections are present in the order
                                      const allSections = [...defaultSections, ...customSections];
                                      allSections.forEach(sectionId => {
                                        if (!order.includes(sectionId)) {
                                          order = [...order, sectionId];
                                        }
                                      });
                                      
                                      // Remove sections that no longer exist
                                      order = order.filter(sectionId => allSections.includes(sectionId));

                                      return order.map((sectionId, index, array) => {
                                        const isCustom = sectionId.startsWith('custom_');
                                        const customSection = settings?.opdSummaryCustomSections?.find(s => s.id === sectionId);
                                        const title = isCustom ? (customSection?.title || 'Custom Section') : (
                                          sectionId === 'patientSummary' ? (settings?.opdSummarySectionTitles?.patientSummary || 'PATIENT SUMMARY') :
                                          sectionId === 'ultrasonogram' ? (settings?.opdSummarySectionTitles?.ultrasonogram || 'ULTRASONOGRAM') :
                                          sectionId === 'gynecology' ? (settings?.opdSummarySectionTitles?.gynecology || 'GYNECOLOGY') :
                                          sectionId === 'radiology' ? (settings?.opdSummarySectionTitles?.radiology || 'RADIOLOGY') :
                                          sectionId === 'emergency' ? (settings?.opdSummarySectionTitles?.emergency || 'EMERGENCY') :
                                          sectionId === 'dentalSurgery' ? (settings?.opdSummarySectionTitles?.dentalSurgery || 'DENTAL SURGERY') :
                                          sectionId === 'cardiology' ? (settings?.opdSummarySectionTitles?.cardiology || 'CARDIOLOGY') :
                                          sectionId === 'gastroenterology' ? (settings?.opdSummarySectionTitles?.gastroenterology || 'GASTROENTEROLOGY') : sectionId
                                        );

                                    const moveUp = () => {
                                      if (index === 0) return;
                                      const newOrder = [...array];
                                      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                      setSettings(prev => prev ? { ...prev, opdSummarySectionOrder: newOrder } : null);
                                    };

                                    const moveDown = () => {
                                      if (index === array.length - 1) return;
                                      const newOrder = [...array];
                                      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                      setSettings(prev => prev ? { ...prev, opdSummarySectionOrder: newOrder } : null);
                                    };

                                    return (
                                      <div key={sectionId} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-none">
                                        <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{title}</span>
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={moveUp}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                          >
                                            <ArrowUp className="w-4 h-4 text-slate-600" />
                                          </button>
                                          <button 
                                            onClick={moveDown}
                                            disabled={index === array.length - 1}
                                            className="p-1 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                          >
                                            <ArrowDown className="w-4 h-4 text-slate-600" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-10 flex justify-end">
                          <button 
                            onClick={async () => {
                              try {
                                await setDoc(doc(db, 'settings', 'general'), { ...settings }, { merge: true });
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'সফল!',
                                  message: 'সামারি সেটিংস সফলভাবে আপডেট করা হয়েছে।',
                                  onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                                  type: 'success'
                                });
                              } catch (error) {
                                console.error('Error updating settings:', error);
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'ত্রুটি!',
                                  message: 'সেটিংস আপডেট করা সম্ভব হয়নি।',
                                  onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                                  type: 'error'
                                });
                              }
                            }}
                            className="px-8 py-4 bg-blue-600 text-white font-black rounded-none hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3"
                          >
                            <Save size={20} />
                            সেটিংস সংরক্ষণ করুন
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {systemTab === 'login-settings' && canManageLoginPage && (
                    <div className="space-y-10">
                      <div className="bg-white p-8 rounded-none border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                          <Palette className="text-blue-600" size={24} />
                          লগইন ইন্টারফেস কাস্টমাইজেশন
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">লগইন টাইটেল (HTML সাপোর্ট করে)</label>
                              <textarea 
                                value={settings?.loginSettings?.title || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev, 
                                  loginSettings: { ...prev.loginSettings, title: e.target.value }
                                } : null)}
                                placeholder="আধুনিক <span className='text-blue-500'>হাসপাতাল</span><br />ম্যানেজমেন্ট সিস্টেম"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">সাবটাইটেল</label>
                              <input 
                                type="text" 
                                value={settings?.loginSettings?.subtitle || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev, 
                                  loginSettings: { ...prev.loginSettings, subtitle: e.target.value }
                                } : null)}
                                placeholder="Smart Healthcare"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">বর্ণনা (Description)</label>
                              <textarea 
                                value={settings?.loginSettings?.description || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev, 
                                  loginSettings: { ...prev.loginSettings, description: e.target.value }
                                } : null)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ব্যাকগ্রাউন্ড কালার</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={settings?.loginSettings?.bgColor || '#0f172a'}
                                    onChange={(e) => setSettings(prev => prev ? {
                                      ...prev, 
                                      loginSettings: { ...prev.loginSettings, bgColor: e.target.value }
                                    } : null)}
                                    className="w-12 h-12 rounded-none cursor-pointer border-none p-0"
                                  />
                                  <input 
                                    type="text" 
                                    value={settings?.loginSettings?.bgColor || '#0f172a'}
                                    onChange={(e) => setSettings(prev => prev ? {
                                      ...prev, 
                                      loginSettings: { ...prev.loginSettings, bgColor: e.target.value }
                                    } : null)}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-none font-mono text-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">অ্যাকসেন্ট কালার</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={settings?.loginSettings?.accentColor || '#3b82f6'}
                                    onChange={(e) => setSettings(prev => prev ? {
                                      ...prev, 
                                      loginSettings: { ...prev.loginSettings, accentColor: e.target.value }
                                    } : null)}
                                    className="w-12 h-12 rounded-none cursor-pointer border-none p-0"
                                  />
                                  <input 
                                    type="text" 
                                    value={settings?.loginSettings?.accentColor || '#3b82f6'}
                                    onChange={(e) => setSettings(prev => prev ? {
                                      ...prev, 
                                      loginSettings: { ...prev.loginSettings, accentColor: e.target.value }
                                    } : null)}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-none font-mono text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ভার্সন টেক্সট</label>
                              <input 
                                type="text" 
                                value={settings?.loginSettings?.versionText || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev, 
                                  loginSettings: { ...prev.loginSettings, versionText: e.target.value }
                                } : null)}
                                placeholder="Version 2.0.4"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                              />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-none">
                              <div>
                                <p className="text-sm font-black text-slate-900">ব্র্যান্ডিং লোগো দেখান</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">লগইন পেজে হাসপাতালের লোগো এবং সাবটাইটেল দেখাবে কিনা</p>
                              </div>
                              <button
                                onClick={() => setSettings(prev => prev ? {
                                  ...prev, 
                                  loginSettings: { ...prev.loginSettings, showBranding: !prev.loginSettings?.showBranding }
                                } : null)}
                                className={cn(
                                  "w-12 h-6 rounded-full transition-all relative",
                                  settings?.loginSettings?.showBranding !== false ? "bg-blue-500" : "bg-slate-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                  settings?.loginSettings?.showBranding !== false ? "left-7" : "left-1"
                                )} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ফিচার লিস্ট (Features)</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(settings?.loginSettings?.features || [
                              { label: 'রিয়েল-টাইম আপডেট', icon: '⚡' },
                              { label: 'অ্যাডমিন কন্ট্রোল', icon: '🛡️' },
                              { label: 'পাবলিক ডিসপ্লে', icon: '📺' },
                              { label: 'সহজ সিরিয়াল', icon: '📝' }
                            ]).map((feature, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 border border-slate-200 rounded-none">
                                <input 
                                  type="text" 
                                  value={feature.icon}
                                  onChange={(e) => {
                                    const newFeatures = [...(settings?.loginSettings?.features || [])];
                                    if (newFeatures.length === 0) {
                                      // Initialize if empty
                                      newFeatures.push({ label: 'রিয়েল-টাইম আপডেট', icon: '⚡' }, { label: 'অ্যাডমিন কন্ট্রোল', icon: '🛡️' }, { label: 'পাবলিক ডিসপ্লে', icon: '📺' }, { label: 'সহজ সিরিয়াল', icon: '📝' });
                                    }
                                    newFeatures[idx] = { ...newFeatures[idx], icon: e.target.value };
                                    setSettings(prev => prev ? { ...prev, loginSettings: { ...prev.loginSettings, features: newFeatures } } : null);
                                  }}
                                  className="w-12 p-2 bg-white border border-slate-200 rounded-none text-center"
                                  placeholder="Icon"
                                />
                                <input 
                                  type="text" 
                                  value={feature.label}
                                  onChange={(e) => {
                                    const newFeatures = [...(settings?.loginSettings?.features || [])];
                                    if (newFeatures.length === 0) {
                                      newFeatures.push({ label: 'রিয়েল-টাইম আপডেট', icon: '⚡' }, { label: 'অ্যাডমিন কন্ট্রোল', icon: '🛡️' }, { label: 'পাবলিক ডিসপ্লে', icon: '📺' }, { label: 'সহজ সিরিয়াল', icon: '📝' });
                                    }
                                    newFeatures[idx] = { ...newFeatures[idx], label: e.target.value };
                                    setSettings(prev => prev ? { ...prev, loginSettings: { ...prev.loginSettings, features: newFeatures } } : null);
                                  }}
                                  className="flex-1 p-2 bg-white border border-slate-200 rounded-none"
                                  placeholder="Feature Label"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-10">
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                message: 'আপনি কি নিশ্চিত যে আপনি লগইন পেজ সেটিংস আপডেট করতে চান?',
                                onConfirm: async () => {
                                  if (settings) {
                                    try {
                                      await setDoc(doc(db, 'settings', 'general'), { ...settings }, { merge: true });
                                      await logActivity('settings', 'লগইন সেটিংস আপডেট', 'লগইন পেজ ইন্টারফেস কাস্টমাইজ করা হয়েছে।');
                                      showToast('লগইন সেটিংস সফলভাবে আপডেট করা হয়েছে');
                                    } catch (error) {
                                      console.error(error);
                                      showToast('আপডেট করতে সমস্যা হয়েছে');
                                    }
                                  }
                                }
                              });
                            }}
                            className="w-full py-5 text-white rounded-none font-black shadow-xl hover:opacity-90 transition-all active:scale-[0.98] tracking-wide bg-blue-600 shadow-blue-600/20"
                          >
                            লগইন সেটিংস সংরক্ষণ করুন
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {systemTab === 'profile' && canManageHospitalProfile && (
                    <div className="space-y-10">
                      <div className="grid grid-cols-3 gap-2 md:flex md:flex-row md:flex-wrap md:justify-center md:gap-12">
                        {/* Hospital Logo */}
                        <div className="flex flex-col items-center">
                          <div className="relative group w-full">
                            <div className="w-full aspect-square md:w-40 md:h-40 rounded-none bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                              {settings?.hospitalLogo ? (
                                <img src={settings.hospitalLogo} className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                              ) : (
                                <Building2 className="text-slate-200 w-8 h-8 md:w-12 md:h-12" />
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const newUrl = window.prompt('লোগো লিঙ্ক (URL) লিখুন:', settings?.hospitalLogo || '');
                                if (newUrl !== null) setSettings(prev => prev ? {...prev, hospitalLogo: newUrl} : null);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 md:p-2 bg-white hover:bg-slate-50 rounded-full shadow-xl text-blue-600 transition-all z-20 border border-slate-100"
                              title="লিঙ্ক আপডেট করুন"
                            >
                              <LinkIcon size={12} className="md:w-4 md:h-4" />
                            </button>
                            <label className="absolute inset-0 flex items-center justify-center bg-blue-600/80 rounded-none opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                              <div className="text-center">
                                {isLogoUploading ? <Loader2 className="text-white animate-spin mx-auto w-4 h-4 md:w-6 md:h-6" /> : <Upload className="text-white mx-auto mb-1 w-4 h-4 md:w-6 md:h-6" />}
                                <p className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">আপলোড</p>
                              </div>
                              <input type="file" className="hidden" onChange={handleLogoUpload} disabled={isLogoUploading} />
                            </label>
                          </div>
                          <div className="text-center mt-2 md:mt-4">
                            <p className="text-[10px] md:text-sm font-black text-slate-900 leading-tight">হাসপাতাল লোগো</p>
                            <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 hidden md:block">PNG, JPG (MAX. 2MB)</p>
                          </div>
                        </div>

                        {/* Favicon */}
                        <div className="flex flex-col items-center">
                          <div className="relative group w-full">
                            <div className="w-full aspect-square md:w-40 md:h-40 rounded-none bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                              {settings?.favicon ? (
                                <img src={settings.favicon} className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                              ) : (
                                <Monitor className="text-slate-200 w-8 h-8 md:w-12 md:h-12" />
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const newUrl = window.prompt('ফেভিকন লিঙ্ক (URL) লিখুন:', settings?.favicon || '');
                                if (newUrl !== null) setSettings(prev => prev ? {...prev, favicon: newUrl} : null);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 md:p-2 bg-white hover:bg-slate-50 rounded-full shadow-xl text-purple-600 transition-all z-20 border border-slate-100"
                              title="লিঙ্ক আপডেট করুন"
                            >
                              <LinkIcon size={12} className="md:w-4 md:h-4" />
                            </button>
                            <label className="absolute inset-0 flex items-center justify-center bg-purple-600/80 rounded-none opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                              <div className="text-center">
                                {isFaviconUploading ? <Loader2 className="text-white animate-spin mx-auto w-4 h-4 md:w-6 md:h-6" /> : <Upload className="text-white mx-auto mb-1 w-4 h-4 md:w-6 md:h-6" />}
                                <p className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">আপলোড</p>
                              </div>
                              <input type="file" className="hidden" onChange={handleFaviconUpload} disabled={isFaviconUploading} />
                            </label>
                          </div>
                          <div className="text-center mt-2 md:mt-4">
                            <p className="text-[10px] md:text-sm font-black text-slate-900 leading-tight">ফেভিকন</p>
                            <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 hidden md:block">ICO, PNG (32x32)</p>
                          </div>
                        </div>

                        {/* Loader Logo */}
                        <div className="flex flex-col items-center">
                          <div className="relative group w-full">
                            <div className="w-full aspect-square md:w-40 md:h-40 rounded-none bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                              {settings?.loaderLogoUrl ? (
                                <img src={settings.loaderLogoUrl} className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                              ) : (
                                <RefreshCw className="text-slate-200 w-8 h-8 md:w-12 md:h-12" />
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                const newUrl = window.prompt('লোডার লোগো লিঙ্ক (URL) লিখুন:', settings?.loaderLogoUrl || '');
                                if (newUrl !== null) setSettings(prev => prev ? {...prev, loaderLogoUrl: newUrl} : null);
                              }}
                              className="absolute -top-2 -right-2 p-1.5 md:p-2 bg-white hover:bg-slate-50 rounded-full shadow-xl text-orange-600 transition-all z-20 border border-slate-100"
                              title="লিঙ্ক আপডেট করুন"
                            >
                              <LinkIcon size={12} className="md:w-4 md:h-4" />
                            </button>
                            <label className="absolute inset-0 flex items-center justify-center bg-orange-600/80 rounded-none opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                              <div className="text-center">
                                {isLoaderLogoUploading ? <Loader2 className="text-white animate-spin mx-auto w-4 h-4 md:w-6 md:h-6" /> : <Upload className="text-white mx-auto mb-1 w-4 h-4 md:w-6 md:h-6" />}
                                <p className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">আপলোড</p>
                              </div>
                              <input type="file" className="hidden" onChange={handleLoaderLogoUpload} disabled={isLoaderLogoUploading} />
                            </label>
                          </div>
                          <div className="text-center mt-2 md:mt-4">
                            <p className="text-[10px] md:text-sm font-black text-slate-900 leading-tight">লোডার লোগো</p>
                            <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 leading-relaxed hidden md:block">লগইন এর পর এবং অ্যাপ এ প্রবেশ করার সময় এই লোগোটি দেখাবে</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">হাসপাতালের নাম (বাংলায়)</label>
                            <input 
                              type="text" 
                              value={settings?.hospitalName || ''}
                              onChange={(e) => setSettings(prev => prev ? {...prev, hospitalName: e.target.value} : null)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ওয়েবসাইট টাইটেল (Browser Title)</label>
                            <input 
                              type="text" 
                              value={settings?.websiteTitle || ''}
                              onChange={(e) => setSettings(prev => prev ? {...prev, websiteTitle: e.target.value} : null)}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                              placeholder="যেমন: সাজেদা জব্বার হাসপাতাল | লাইভ সিরিয়াল"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">স্লোগান</label>
                          <input 
                            type="text" 
                            value={settings?.slogan || ''}
                            onChange={(e) => setSettings(prev => prev ? {...prev, slogan: e.target.value} : null)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            message: 'আপনি কি নিশ্চিত যে আপনি হাসপাতালের প্রোফাইল তথ্য আপডেট করতে চান?',
                            onConfirm: async () => {
                              if (settings) {
                                try {
                                  await setDoc(doc(db, 'settings', 'general'), { ...settings }, { merge: true });
                                  await logActivity('settings', 'প্রোফাইল আপডেট', 'হাসপাতালের প্রোফাইল তথ্য আপডেট করা হয়েছে।');
                                  showToast('প্রোফাইল সফলভাবে আপডেট করা হয়েছে');
                                } catch (error) {
                                  console.error(error);
                                  showToast('আপডেট করতে সমস্যা হয়েছে');
                                }
                              }
                            }
                          });
                        }}
                        className="w-full py-5 text-white rounded-none font-black shadow-xl hover:opacity-90 transition-all active:scale-[0.98] tracking-wide"
                        style={{ 
                          backgroundColor: settings?.primaryColor || '#2563eb',
                          boxShadow: `0 15px 30px -5px \${settings?.primaryColor || '#2563eb'}55`
                        }}
                      >
                        প্রোফাইল সংরক্ষণ করুন
                      </button>
                    </div>
                  )}

                  {systemTab === 'display' && canManageDisplaySettings && (
                    <div className="space-y-10">
                      {/* Display Colors Section */}
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-50 rounded-none text-blue-600">
                            <Palette size={20} />
                          </div>
                          <h3 className="font-black text-lg md:text-xl text-slate-900">ডিসপ্লে কালার সেটিংস</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">প্রাইমারি কালার (Primary Color)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.primaryColor || '#2563eb'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.primaryColor || '#2563eb'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ফন্ট কালার (Font Color)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.fontColor || '#1e293b'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, fontColor: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.fontColor || '#1e293b'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">রানিং রোগী ব্যাকগ্রাউন্ড</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.runningPatientBg || '#fbbf24'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, runningPatientBg: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.runningPatientBg || '#fbbf24'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">রানিং রোগী টেক্সট</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.runningPatientText || '#0f172a'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, runningPatientText: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.runningPatientText || '#0f172a'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অপেক্ষমান রোগী ব্যাকগ্রাউন্ড</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.waitingPatientBg || '#10b981'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, waitingPatientBg: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.waitingPatientBg || '#10b981'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অপেক্ষমান রোগী টেক্সট</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.waitingPatientText || '#ffffff'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, waitingPatientText: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.waitingPatientText || '#ffffff'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">এরপর (Next) রোগী ব্যাকগ্রাউন্ড</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.nextPatientBg || '#3b82f6'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, nextPatientBg: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.nextPatientBg || '#3b82f6'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">এরপর (Next) রোগী টেক্সট</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.nextPatientText || '#ffffff'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, nextPatientText: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.nextPatientText || '#ffffff'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অনুপস্থিত (Absent) রোগী ব্যাকগ্রাউন্ড</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.absentPatientBg || '#f97316'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, absentPatientBg: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.absentPatientBg || '#f97316'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অনুপস্থিত (Absent) রোগী টেক্সট</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.absentPatientText || '#ffffff'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, absentPatientText: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.absentPatientText || '#ffffff'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিসপ্লে ব্যাকগ্রাউন্ড (Display BG)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.displayBgColor || '#f8fafc'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, displayBgColor: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.displayBgColor || '#f8fafc'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিসপ্লে কার্ড ব্যাকগ্রাউন্ড (Card BG)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.displayCardBgColor || '#ffffff'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, displayCardBgColor: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.displayCardBgColor || '#ffffff'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিসপ্লে হেডার ব্যাকগ্রাউন্ড (Header BG)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="color" 
                                value={settings?.displayHeaderBgColor || '#ffffff'}
                                onChange={(e) => setSettings(prev => prev ? {...prev, displayHeaderBgColor: e.target.value} : null)}
                                className="w-8 h-8 rounded-none cursor-pointer border-none bg-transparent"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{settings?.displayHeaderBgColor || '#ffffff'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিসপ্লে ফন্ট সাইজ (Font Size)</label>
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-none">
                              <input 
                                type="range" 
                                min="12"
                                max="32"
                                step="1"
                                value={settings?.baseFontSize || 16}
                                onChange={(e) => setSettings(prev => prev ? {...prev, baseFontSize: parseInt(e.target.value)} : null)}
                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                              <span className="font-mono text-[10px] font-bold text-slate-500 w-8 text-center">{settings?.baseFontSize || 16}px</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (settings) {
                              setConfirmDialog({
                                isOpen: true,
                                message: 'আপনি কি নিশ্চিত যে আপনি ডিসপ্লে কালার সেটিংস সংরক্ষণ করতে চান?',
                                onConfirm: async () => {
                                  await setDoc(doc(db, 'settings', 'general'), { 
                                    primaryColor: settings.primaryColor || '#2563eb',
                                    fontColor: settings.fontColor || '#1e293b',
                                    runningPatientBg: settings.runningPatientBg || '#fbbf24',
                                    runningPatientText: settings.runningPatientText || '#0f172a',
                                    waitingPatientBg: settings.waitingPatientBg || '#10b981',
                                    waitingPatientText: settings.waitingPatientText || '#ffffff',
                                    nextPatientBg: settings.nextPatientBg || '#3b82f6',
                                    nextPatientText: settings.nextPatientText || '#ffffff',
                                    absentPatientBg: settings.absentPatientBg || '#f97316',
                                    absentPatientText: settings.absentPatientText || '#ffffff',
                                    displayBgColor: settings.displayBgColor || '#f8fafc',
                                    displayCardBgColor: settings.displayCardBgColor || '#ffffff',
                                    displayHeaderBgColor: settings.displayHeaderBgColor || '#ffffff',
                                    baseFontSize: settings.baseFontSize || 16,
                                  }, { merge: true });
                                  await logActivity('settings', 'ডিসপ্লে কালার আপডেট', 'ডিসপ্লে এবং টেক্সট কালার সেটিংস পরিবর্তন করা হয়েছে।');
                                  showToast('ডিসপ্লে কালার সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                }
                              });
                            }
                          }}
                          className="w-full py-4 text-white rounded-none font-black hover:opacity-90 transition-all shadow-lg bg-blue-600 shadow-blue-600/20"
                        >
                          ডিসপ্লে কালার সেটিংস সংরক্ষণ করুন
                        </button>
                      </div>

                      {/* Live Display Advanced Settings Section */}
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20 shrink-0">
                              <MonitorPlay size={24} />
                            </div>
                            <div>
                              <h3 className="font-black text-xl md:text-2xl text-slate-900 leading-tight">লাইভ ডিসপ্লে মাস্টার সেটিংস</h3>
                              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Advanced Display Configuration</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 self-start md:self-auto">
                            <Sparkles size={14} className="text-blue-500" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">Premium UI v2.0</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Column 1: Switching & Logic */}
                          <div className="space-y-8">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-blue-500" />
                                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">সুইচিং ও লজিক</h4>
                              </div>
                              <button
                                onClick={() => setSettings(prev => prev ? {...prev, displayEnableLogic: !prev.displayEnableLogic} : null)}
                                className={cn(
                                  "w-10 h-5 rounded-full relative transition-all duration-300",
                                  settings?.displayEnableLogic ? "bg-blue-600" : "bg-slate-300"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                  settings?.displayEnableLogic ? "left-5.5" : "left-0.5"
                                )} />
                              </button>
                            </div>

                            <div className={cn("space-y-8 transition-all duration-300", !settings?.displayEnableLogic && "opacity-30 pointer-events-none grayscale")}>
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <RefreshCw size={14} className="text-slate-400" />
                                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ডিসপ্লে মোড (Display Mode)</label>
                                </div>
                                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full">
                                  {(['manual', 'auto-rotate', 'all'] as const).map((mode) => (
                                    <button
                                      key={mode} onClick={() => setSettings(prev => prev ? {...prev, displayDoctorMode: mode} : null)}
                                      className={cn(
                                        "flex-1 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest flex flex-col items-center gap-1",
                                        (settings?.displayDoctorMode || 'manual') === mode 
                                          ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-md" 
                                          : "text-slate-500 hover:text-slate-700"
                                      )}
                                    >
                                      <span>{mode === 'manual' ? 'ম্যানুয়াল' : mode === 'auto-rotate' ? 'অটো-রোটেট' : 'সব (শিডিউল)'}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {(settings?.displayDoctorMode || 'manual') === 'manual' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ডাক্তার নির্বাচন করুন</label>
                                  <select 
                                    value={settings?.displaySelectedDoctorId || ''}
                                    onChange={(e) => setSettings(prev => prev ? {...prev, displaySelectedDoctorId: e.target.value} : null)}
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                  >
                                    <option value="" disabled>ডাক্তার নির্বাচন করুন</option>
                                    {doctors.map(d => (
                                      <option key={`display-opt-${d.id}`} value={d.id}>{d.name} ({d.department})</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {(settings?.displayDoctorMode === 'auto-rotate' || settings?.displayDoctorMode === 'all') && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পরিবর্তনের সময় (Interval)</label>
                                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full">
                                      {settings?.displayRotationInterval || 30}s
                                    </span>
                                  </div>
                                  <div className="px-4 py-6 bg-white border-2 border-slate-100 rounded-3xl shadow-inner">
                                    <input 
                                      type="range" 
                                      min="5" 
                                      max="300" 
                                      step="5"
                                      value={settings?.displayRotationInterval || 30}
                                      onChange={(e) => setSettings(prev => prev ? {...prev, displayRotationInterval: parseInt(e.target.value)} : null)}
                                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      <span>5s</span>
                                      <span>300s</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">অটো সুইচ (Empty হলে)</span>
                                  <button
                                    onClick={() => setSettings(prev => prev ? {...prev, displayAutoSwitchOnEmpty: !prev.displayAutoSwitchOnEmpty} : null)}
                                    className={cn(
                                      "w-8 h-4 rounded-full relative transition-all duration-300",
                                      settings?.displayAutoSwitchOnEmpty ? "bg-emerald-500" : "bg-slate-200"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                                      settings?.displayAutoSwitchOnEmpty ? "left-4.5" : "left-0.5"
                                    )} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">শুধুমাত্র সক্রিয় ডাক্তার</span>
                                  <button
                                    onClick={() => setSettings(prev => prev ? {...prev, displayShowOnlyActiveDoctors: !prev.displayShowOnlyActiveDoctors} : null)}
                                    className={cn(
                                      "w-8 h-4 rounded-full relative transition-all duration-300",
                                      settings?.displayShowOnlyActiveDoctors ? "bg-emerald-500" : "bg-slate-200"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                                      settings?.displayShowOnlyActiveDoctors ? "left-4.5" : "left-0.5"
                                    )} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Visual & Theme */}
                          <div className="space-y-8">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <Palette size={16} className="text-blue-500" />
                              <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">ভিজ্যুয়াল ও থিম</h4>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিসপ্লে থিম (Theme)</label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['modern', 'classic', 'dark', 'glass'] as const).map((theme) => (
                                  <button
                                    key={theme} onClick={() => setSettings(prev => prev ? {...prev, displayTheme: theme} : null)}
                                    className={cn(
                                      "p-3 rounded-xl border-2 transition-all text-center",
                                      (settings?.displayTheme || 'modern') === theme 
                                        ? "border-blue-600 bg-blue-50 text-blue-600 font-black" 
                                        : "border-slate-100 bg-white text-slate-400 font-bold"
                                    )}
                                  >
                                    <span className="text-[10px] uppercase tracking-widest">{theme}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ট্রানজিশন ইফেক্ট</label>
                              <div className="grid grid-cols-2 gap-2">
                                {(['fade', 'slide', 'zoom', 'none'] as const).map((effect) => (
                                  <button
                                    key={effect} onClick={() => setSettings(prev => prev ? {...prev, displayTransitionEffect: effect} : null)}
                                    className={cn(
                                      "py-2.5 rounded-xl border-2 transition-all text-[10px] uppercase tracking-widest",
                                      (settings?.displayTransitionEffect || 'fade') === effect 
                                        ? "border-blue-600 bg-blue-50 text-blue-600 font-black" 
                                        : "border-slate-100 bg-white text-slate-400 font-bold"
                                    )}
                                  >
                                    {effect}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ভিজিবিলিটি</label>
                              <div className="space-y-3">
                                {[
                                  { key: 'displayShowPhoto', label: 'ডাক্তারের ছবি', icon: ImageIcon },
                                  { key: 'displayShowSpecialty', label: 'স্পেশালিটি', icon: Type },
                                  { key: 'displayShowRoom', label: 'রুম নাম্বার', icon: MonitorPlay },
                                  { key: 'displayShowNextDoctor', label: 'পরবর্তী ডাক্তার', icon: Eye },
                                  { key: 'displayShowHistory', label: 'পেশেন্ট হিস্ট্রি', icon: History },
                                ].map((item) => (
                                  <div key={item.key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <item.icon size={12} className="text-slate-400" />
                                      <span className="text-[10px] font-bold text-slate-600">{item.label}</span>
                                    </div>
                                    <button
                                      onClick={() => setSettings(prev => prev ? {...prev, [item.key]: !((prev as any)[item.key] ?? true)} : null)}
                                      className={cn(
                                        "w-8 h-4 rounded-full transition-all relative",
                                        (settings as any)?.[item.key] !== false ? "bg-emerald-500" : "bg-slate-200"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                        (settings as any)?.[item.key] !== false ? "right-0.5" : "left-0.5"
                                      )} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Column 3: Clock & Customization */}
                          <div className="space-y-8">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <Clock size={16} className="text-blue-500" />
                              <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">ঘড়ি ও কাস্টমাইজেশন</h4>
                            </div>

                            <div className="space-y-4 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ঘড়ি ও তারিখ দেখান</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setSettings(prev => prev ? {...prev, displayShowClock: !(prev.displayShowClock ?? true)} : null)}
                                    className={cn("px-2 py-1 rounded text-[8px] font-black uppercase", settings?.displayShowClock !== false ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}
                                  >Clock</button>
                                  <button
                                    onClick={() => setSettings(prev => prev ? {...prev, displayShowDate: !(prev.displayShowDate ?? true)} : null)}
                                    className={cn("px-2 py-1 rounded text-[8px] font-black uppercase", settings?.displayShowDate !== false ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}
                                  >Date</button>
                                </div>
                              </div>
                              
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ঘড়ির থিম</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(['digital', 'analog', 'minimal'] as const).map((t) => (
                                  <button
                                    key={t} onClick={() => setSettings(prev => prev ? {...prev, displayClockTheme: t} : null)}
                                    className={cn(
                                      "py-2 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest",
                                      (settings?.displayClockTheme || 'digital') === t ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-slate-100 text-slate-400"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">কাস্টম মেসেজ ও স্পিড</label>
                              <input 
                                type="text"
                                placeholder="মেসেজ লিখুন..."
                                value={settings?.displayCustomMessage || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, displayCustomMessage: e.target.value} : null)}
                                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-xs text-slate-700 shadow-sm"
                              />
                              <div className="flex p-1 bg-slate-100 rounded-xl">
                                {(['slow', 'normal', 'fast'] as const).map((s) => (
                                  <button
                                    key={s} onClick={() => setSettings(prev => prev ? {...prev, displayTickerSpeed: s} : null)}
                                    className={cn(
                                      "flex-1 py-2 rounded-lg font-black text-[8px] transition-all uppercase tracking-widest",
                                      (settings?.displayTickerSpeed || 'normal') === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                                    )}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ব্যাকগ্রাউন্ড ইমেজ</label>
                              <div className="relative group w-full h-32 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                {settings?.displayCustomBgUrl ? (
                                  <img src={settings.displayCustomBgUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                                ) : (
                                  <ImageIcon className="text-slate-200" size={32} />
                                )}
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newUrl = window.prompt('ব্যাকগ্রাউন্ড ইমেজ লিঙ্ক (URL) লিখুন:', settings?.displayCustomBgUrl || '');
                                    if (newUrl !== null) setSettings(prev => prev ? {...prev, displayCustomBgUrl: newUrl} : null);
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-white hover:bg-slate-50 rounded-full shadow-lg text-blue-600 transition-all z-20 border border-slate-100"
                                  title="লিঙ্ক আপডেট করুন"
                                >
                                  <LinkIcon size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: 'আপনি কি নিশ্চিত যে আপনি ডিসপ্লে অ্যাডভান্সড সেটিংস সংরক্ষণ করতে চান?',
                              onConfirm: async () => {
                                if (settings) {
                                  try {
                                    await setDoc(doc(db, 'settings', 'general'), { 
                                      displayDoctorMode: settings.displayDoctorMode || 'manual',
                                      displaySelectedDoctorId: settings.displaySelectedDoctorId || '',
                                      displayRotationInterval: settings.displayRotationInterval || 30,
                                      displayTransitionEffect: settings.displayTransitionEffect || 'fade',
                                      displayTheme: settings.displayTheme || 'modern',
                                      displayShowPhoto: settings.displayShowPhoto !== false,
                                      displayShowSpecialty: settings.displayShowSpecialty !== false,
                                      displayShowRoom: settings.displayShowRoom !== false,
                                      displayShowNextDoctor: settings.displayShowNextDoctor !== false,
                                      displayShowHistory: settings.displayShowHistory !== false,
                                      displayCustomMessage: settings.displayCustomMessage || '',
                                      displaySwitchOnCall: settings.displaySwitchOnCall || false,
                                      displayClockTheme: settings.displayClockTheme || 'digital',
                                      displayCustomBgUrl: settings.displayCustomBgUrl || '',
                                      displayTickerSpeed: settings.displayTickerSpeed || 'normal',
                                      displayShowClock: settings.displayShowClock !== false,
                                      displayShowDate: settings.displayShowDate !== false,
                                      displayEnableLogic: settings.displayEnableLogic || false,
                                      displayAutoSwitchOnEmpty: settings.displayAutoSwitchOnEmpty || false,
                                      displayShowOnlyActiveDoctors: settings.displayShowOnlyActiveDoctors || false,
                                    }, { merge: true });
                                    await logActivity('settings', 'ডিসপ্লে অ্যাডভান্সড সেটিংস আপডেট', 'লাইভ ডিসপ্লে অ্যাডভান্সড সেটিংস পরিবর্তন করা হয়েছে।');
                                    showToast('ডিসপ্লে অ্যাডভান্সড সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে');
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full py-6 text-white rounded-[2rem] font-black hover:opacity-90 transition-all shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30 flex items-center justify-center gap-4 group"
                        >
                          <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
                            <MonitorPlay size={24} />
                          </div>
                          <span className="text-lg tracking-wider uppercase">সেটিংস সংরক্ষণ করুন</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {systemTab === 'patient-portal' && canManagePatientPortal && (
                    <div className="space-y-10">
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-none shadow-xl shadow-slate-200/40 border-2 border-slate-300 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-none text-blue-600 shrink-0">
                              <Users size={20} />
                            </div>
                            <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight">পেশেন্ট পোর্টাল সেটিংস</h3>
                          </div>
                          <div className="flex items-center gap-3 self-start md:self-auto">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2",
                              settings?.enablePatientPortal ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              {settings?.enablePatientPortal ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                            <button
                              onClick={() => setSettings(prev => prev ? {...prev, enablePatientPortal: !prev.enablePatientPortal} : null)}
                              className={cn(
                                "w-14 h-7 rounded-full relative transition-all duration-300",
                                settings?.enablePatientPortal ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm",
                                settings?.enablePatientPortal ? "left-8" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পেশেন্ট পোর্টাল স্বাগতম বার্তা (Welcome Message)</label>
                              <input 
                                type="text" 
                                value={settings?.patientPortalWelcomeMessage || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, patientPortalWelcomeMessage: e.target.value} : null)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="যেমন: আমাদের হাসপাতালে আপনাকে স্বাগতম"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">হাসপাতাল কন্টাক্ট নম্বর</label>
                              <input 
                                type="text" 
                                value={settings?.portalContactNumber || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, portalContactNumber: e.target.value} : null)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="যেমন: +৮৮০ ১৭০০-০০০০০০"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">হাসপাতাল ঠিকানা</label>
                              <input 
                                type="text" 
                                value={settings?.portalAddress || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, portalAddress: e.target.value} : null)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="হাসপাতালের পূর্ণ ঠিকানা লিখুন"
                              />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পেশেন্ট পোর্টাল নোটিশ (Notice)</label>
                              <textarea 
                                rows={4}
                                value={settings?.patientPortalNotice || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, patientPortalNotice: e.target.value} : null)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none min-h-[120px]"
                                placeholder="পেশেন্ট পোর্টাল এর জন্য বিশেষ কোনো নোটিশ থাকলে এখানে লিখুন..."
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">জরুরী নোটিশ (Emergency Notice)</label>
                              <input 
                                type="text" 
                                value={settings?.portalEmergencyNotice || ''}
                                onChange={(e) => setSettings(prev => prev ? {...prev, portalEmergencyNotice: e.target.value} : null)}
                                className="w-full p-4 bg-red-50 border-2 border-red-200 rounded-none focus:border-red-500 outline-none transition-all font-bold text-red-700"
                                placeholder="যেমন: আজ সকল ওপিডি বন্ধ থাকবে"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">ডাক্তার শিডিউল দেখান</span>
                            <button
                              onClick={() => setSettings(prev => prev ? {...prev, portalShowDoctorSchedule: !prev.portalShowDoctorSchedule} : null)}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-all duration-300",
                                settings?.portalShowDoctorSchedule ? "bg-blue-500" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                settings?.portalShowDoctorSchedule ? "left-5.5" : "left-0.5"
                              )} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">অনলাইন রেজিস্ট্রেশন</span>
                            <button
                              onClick={() => setSettings(prev => prev ? {...prev, portalEnableOnlineRegistration: !prev.portalEnableOnlineRegistration} : null)}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-all duration-300",
                                settings?.portalEnableOnlineRegistration ? "bg-blue-500" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                settings?.portalEnableOnlineRegistration ? "left-5.5" : "left-0.5"
                              )} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">পোর্টাল থিম কালার</span>
                            <input 
                              type="color" 
                              value={settings?.portalThemeColor || '#2563eb'}
                              onChange={(e) => setSettings(prev => prev ? {...prev, portalThemeColor: e.target.value} : null)}
                              className="w-10 h-10 rounded-none cursor-pointer border-none bg-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">স্বাস্থ্য টিপস (Health Tips - প্রতি লাইনে একটি)</label>
                            <textarea 
                              rows={5}
                              value={settings?.portalHealthTips?.join('\n') || ''}
                              onChange={(e) => setSettings(prev => prev ? {...prev, portalHealthTips: e.target.value.split('\n').filter(t => t.trim())} : null)}
                              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none"
                              placeholder="১. প্রতিদিন অন্তত ৮ গ্লাস পানি পান করুন..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">জরুরী কন্টাক্ট (Emergency Contacts - নাম: নম্বর)</label>
                            <textarea 
                              rows={5}
                              value={settings?.portalEmergencyContacts?.map(c => `${c.name}: ${c.number}`).join('\n') || ''}
                              onChange={(e) => {
                                const lines = e.target.value.split('\n').filter(l => l.includes(':'));
                                const contacts = lines.map(l => {
                                  const [name, number] = l.split(':').map(s => s.trim());
                                  return { name, number };
                                });
                                setSettings(prev => prev ? {...prev, portalEmergencyContacts: contacts} : null);
                              }}
                              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none"
                              placeholder="অ্যাম্বুলেন্স: ০১৭০০-০০০০০০"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: 'আপনি কি নিশ্চিত যে আপনি পেশেন্ট পোর্টাল সেটিংস সংরক্ষণ করতে চান?',
                              onConfirm: async () => {
                                if (settings) {
                                  try {
                                    await setDoc(doc(db, 'settings', 'general'), { 
                                      enablePatientPortal: settings.enablePatientPortal || false,
                                      patientPortalWelcomeMessage: settings.patientPortalWelcomeMessage || '',
                                      patientPortalNotice: settings.patientPortalNotice || '',
                                      portalContactNumber: settings.portalContactNumber || '',
                                      portalAddress: settings.portalAddress || '',
                                      portalEmergencyNotice: settings.portalEmergencyNotice || '',
                                      portalShowDoctorSchedule: settings.portalShowDoctorSchedule || false,
                                      portalEnableOnlineRegistration: settings.portalEnableOnlineRegistration || false,
                                      portalThemeColor: settings.portalThemeColor || '#2563eb',
                                      portalLogoUrl: settings.portalLogoUrl || settings.hospitalLogo || '',
                                      portalHealthTips: settings.portalHealthTips || [],
                                      portalEmergencyContacts: settings.portalEmergencyContacts || [],
                                    }, { merge: true });
                                    await logActivity('settings', 'পেশেন্ট পোর্টাল আপডেট', 'পেশেন্ট পোর্টাল সেটিংস পরিবর্তন করা হয়েছে।');
                                    showToast('পেশেন্ট পোর্টাল সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে');
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full py-4 text-white rounded-none font-black hover:opacity-90 transition-all shadow-lg bg-blue-600 shadow-blue-600/20 uppercase tracking-widest text-xs"
                        >
                          পেশেন্ট পোর্টাল সেটিংস সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {systemTab === 'mobile-nav' && canManageMobileNav && (
                    <div className="space-y-10">
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-none shadow-xl shadow-slate-200/40 border-2 border-slate-300 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-none text-blue-600 shrink-0">
                              <Menu size={20} />
                            </div>
                            <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight">মোবাইল নেভিগেশন সেটিংস</h3>
                          </div>
                          <div className="flex items-center gap-3 self-start md:self-auto">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2",
                              settings?.mobileNavEnabled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              {settings?.mobileNavEnabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                            <button
                              onClick={() => setSettings(prev => prev ? {...prev, mobileNavEnabled: !prev.mobileNavEnabled} : null)}
                              className={cn(
                                "w-14 h-7 rounded-full relative transition-all duration-300",
                                settings?.mobileNavEnabled ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm",
                                settings?.mobileNavEnabled ? "left-8" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        <div className={cn("space-y-8 transition-all duration-300", !settings?.mobileNavEnabled && "opacity-30 pointer-events-none grayscale")}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">মেনু আইটেম দৃশ্যমানতা</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {[
                                    { key: 'doctorOverview', label: 'Doctor Overview' },
                                    { key: 'opdSummary', label: 'OPD Summary' },
                                    { key: 'dashboard', label: 'Dashboard' },
                                    { key: 'registration', label: 'Registration' },
                                    { key: 'doctor', label: 'Doctor' },
                                    { key: 'patient', label: 'Patient' },
                                    { key: 'settings', label: 'Settings' },
                                    { key: 'account', label: 'Account' },
                                  ].map((item) => (
                                    <div key={item.key} className="flex flex-col gap-3 p-3 bg-white border border-slate-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                        <button
                                          onClick={() => {
                                            const items = { ...(settings?.mobileNavItems || { doctorOverview: true, opdSummary: true, dashboard: true, registration: true, doctor: true, patient: true, settings: true, account: true }) };
                                            (items as any)[item.key] = !(items as any)[item.key];
                                            setSettings(prev => prev ? { ...prev, mobileNavItems: items } : null);
                                          }}
                                          className={cn(
                                            "w-10 h-5 rounded-full relative transition-all duration-300",
                                            (settings?.mobileNavItems as any)?.[item.key] !== false ? "bg-blue-500" : "bg-slate-200"
                                          )}
                                        >
                                          <div className={cn(
                                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                            (settings?.mobileNavItems as any)?.[item.key] !== false ? "left-5.5" : "left-0.5"
                                          )} />
                                        </button>
                                      </div>
                                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">আইকন</span>
                                          <button
                                            onClick={() => setIconPicker({ 
                                              isOpen: true, 
                                              key: item.key, 
                                              currentIcon: (settings?.mobileNavIcons as any)?.[item.key] || null 
                                            })}
                                            className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all group"
                                          >
                                            {(() => {
                                              const iconValue = (settings?.mobileNavIcons as any)?.[item.key];
                                              if (iconValue?.startsWith('http')) {
                                                return <img src={iconValue} alt="icon" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />;
                                              }
                                              const Icon = iconMap[iconValue] || HelpCircle;
                                              return <Icon size={14} className="text-blue-600" />;
                                            })()}
                                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                                              {(settings?.mobileNavIcons as any)?.[item.key] || 'Default'}
                                            </span>
                                          </button>
                                        </div>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            placeholder="অথবা আইকন লিংক দিন..."
                                            value={(settings?.mobileNavIcons as any)?.[item.key] || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const icons = { ...(settings?.mobileNavIcons || {}) };
                                              (icons as any)[item.key] = val;
                                              setSettings(prev => prev ? { ...prev, mobileNavIcons: icons } : null);
                                            }}
                                            className="w-full p-2 pr-8 text-[9px] bg-slate-50 border border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-600"
                                          />
                                          <LinkIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                          <div className="relative mt-2">
                                            <input
                                              type="text"
                                              placeholder="নিকনেম (নাম)..."
                                              value={(settings?.mobileNavNicknames as any)?.[item.key] || ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const nicknames = { ...(settings?.mobileNavNicknames || {}) };
                                                (nicknames as any)[item.key] = val;
                                                setSettings(prev => prev ? { ...prev, mobileNavNicknames: nicknames } : null);
                                              }}
                                              className="w-full p-2 text-[9px] bg-slate-50 border border-slate-200 rounded-none focus:border-blue-500 outline-none transition-all font-bold text-slate-600"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">মেনু স্টাইল</label>
                                <div className="flex flex-wrap p-1 bg-slate-100 rounded-none gap-1">
                                  {['modern', 'classic', 'minimal', 'bottom-bar', 'bottom-bar-modern', 'bottom-bar-glass', 'bottom-bar-neon', 'bottom-bar-pill', 'bottom-bar-floating', 'bottom-bar-minimal', 'bottom-bar-curved', 'bottom-bar-detached', 'bottom-bar-gradient', 'bottom-bar-material', 'bottom-bar-ios', 'bottom-bar-3d', 'glass', 'neon', 'pill', 'floating'].map((style) => (
                                    <button
                                      key={style} onClick={() => setSettings(prev => prev ? {...prev, mobileNavStyle: style as any} : null)}
                                      className={cn(
                                        "flex-1 py-3 px-2 rounded-none font-bold text-[10px] transition-all uppercase tracking-widest min-w-[80px]",
                                        (settings?.mobileNavStyle || 'bottom-bar') === style 
                                          ? "bg-white text-slate-900 shadow-sm"
                                          : "text-slate-500 hover:text-slate-700"
                                      )}
                                    >
                                      {style}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-4 bg-white border border-slate-200">
                                <div>
                                  <p className="text-xs font-bold text-slate-700">অ্যানিমেশন সক্রিয়</p>
                                  <p className="text-[10px] text-slate-400 font-medium">Smooth transition effects</p>
                                </div>
                                <button
                                  onClick={() => setSettings(prev => prev ? {...prev, mobileNavAnimation: !prev.mobileNavAnimation} : null)}
                                  className={cn(
                                    "w-12 h-6 rounded-full relative transition-all duration-300",
                                    settings?.mobileNavAnimation !== false ? "bg-blue-500" : "bg-slate-200"
                                  )}
                                >
                                  <div className={cn(
                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                    settings?.mobileNavAnimation !== false ? "left-7" : "left-1"
                                  )} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: 'আপনি কি নিশ্চিত যে আপনি মোবাইল নেভিগেশন সেটিংস সংরক্ষণ করতে চান?',
                              onConfirm: async () => {
                                if (settings) {
                                  try {
                                    await setDoc(doc(db, 'settings', 'general'), { 
                                      mobileNavEnabled: settings.mobileNavEnabled || false,
                                      mobileNavItems: settings.mobileNavItems || { doctorOverview: true, opdSummary: true, dashboard: true, registration: true, doctor: true, patient: true, settings: true, account: true },
                                      mobileNavAnimation: settings.mobileNavAnimation !== false,
                                      mobileNavStyle: settings.mobileNavStyle || 'modern',
                                    }, { merge: true });
                                    await logActivity('settings', 'মোবাইল নেভিগেশন আপডেট', 'মোবাইল নেভিগেশন সেটিংস পরিবর্তন করা হয়েছে।');
                                    showToast('মোবাইল নেভিগেশন সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে');
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full py-4 text-white rounded-none font-black hover:opacity-90 transition-all shadow-lg bg-blue-600 shadow-blue-600/20 uppercase tracking-widest text-xs"
                        >
                          মোবাইল নেভিগেশন সেটিংস সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {systemTab === 'push-notifications' && canManagePushNotifications && (
                    <div className="space-y-10">
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-none shadow-xl shadow-slate-200/40 border-2 border-slate-300 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-none text-blue-600 shrink-0">
                              <BellRing size={20} />
                            </div>
                            <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight">পুশ নোটিফিকেশন সেটিংস</h3>
                          </div>
                          <div className="flex items-center gap-3 self-start md:self-auto">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2",
                              settings?.pushNotificationSettings?.enabled ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              {settings?.pushNotificationSettings?.enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                            <button
                              onClick={() => {
                                const current = settings?.pushNotificationSettings || { 
                                  enabled: false, 
                                  subjects: { newRegistration: true, doctorCall: true, statusChange: true, systemAlert: true },
                                  departments: [],
                                  menus: { dashboard: true, registration: true, doctor: true, settings: true }
                                };
                                setSettings(prev => prev ? {...prev, pushNotificationSettings: { ...current, enabled: !current.enabled }} : null);
                              }}
                              className={cn(
                                "w-14 h-7 rounded-full relative transition-all duration-300",
                                settings?.pushNotificationSettings?.enabled ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm",
                                settings?.pushNotificationSettings?.enabled ? "left-8" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        <div className={cn("space-y-8 transition-all duration-300", !settings?.pushNotificationSettings?.enabled && "opacity-30 pointer-events-none grayscale")}>
                          {/* Browser Permission Warning */}
                          <div className="bg-blue-50 border-2 border-blue-200 p-4 md:p-6 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                              <div className="p-2 bg-blue-100 rounded-none text-blue-600 self-start">
                                <Monitor size={20} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-black text-slate-900 uppercase tracking-tight mb-1">ব্রাউজার পারমিশন স্ট্যাটাস</h4>
                                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                  পুশ নোটিফিকেশন কাজ করার জন্য আপনার ব্রাউজারে অনুমতি প্রয়োজন। 
                                  {isIframe && (
                                    <span className="text-red-600 block mt-1">
                                      সতর্কতা: আপনি বর্তমানে একটি আইফ্রেমের (Iframe) ভেতরে আছেন। নোটিফিকেশন সঠিকভাবে কাজ করার জন্য দয়া করে অ্যাপটি নতুন ট্যাবে ওপেন করুন।
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2",
                                  notificationPermission === 'granted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                  notificationPermission === 'denied' ? "bg-red-50 text-red-600 border-red-100" :
                                  "bg-orange-50 text-orange-600 border-orange-100"
                                )}>
                                  {notificationPermission === 'granted' ? 'অনুমতি আছে' : 
                                   notificationPermission === 'denied' ? 'অনুমতি নেই' : 'অনুমতি প্রয়োজন'}
                                </span>
                                {notificationPermission !== 'granted' && (
                                  <button
                                    onClick={handleRequestPermission}
                                    className="px-4 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                  >
                                    অনুমতি দিন
                                  </button>
                                )}
                                {notificationPermission === 'granted' && (
                                  <button
                                    onClick={async () => {
                                      await sendNotification('টেস্ট নোটিফিকেশন', {
                                        body: 'আপনার পুশ নোটিফিকেশন সিস্টেম এখন সুন্দরভাবে কাজ করছে।',
                                        tag: 'test-notification'
                                      });
                                      showToast('টেস্ট নোটিফিকেশন পাঠানো হয়েছে', 'success');
                                    }}
                                    className="px-4 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                                  >
                                    টেস্ট করুন
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="pt-4 border-t border-blue-100">
                              <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                মোবাইল ইউজারদের জন্য: নোটিফিকেশন পেতে অ্যাপটি "Add to Home Screen" করে ব্যবহার করুন।
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Subjects */}
                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">নোটিফিকেশন বিষয় (Subjects)</label>
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { key: 'newRegistration', label: 'নতুন রেজিস্ট্রেশন' },
                                  { key: 'doctorCall', label: 'ডাক্তার কল' },
                                  { key: 'statusChange', label: 'সিরিয়াল স্ট্যাটাস পরিবর্তন' },
                                  { key: 'systemAlert', label: 'সিস্টেম অ্যালার্ট' },
                                ].map((item) => (
                                  <div key={item.key} className="flex items-center justify-between p-3 bg-white border border-slate-200">
                                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                    <button
                                      onClick={() => {
                                        const current = settings?.pushNotificationSettings || { 
                                          enabled: false, 
                                          subjects: { newRegistration: true, doctorCall: true, statusChange: true, systemAlert: true },
                                          departments: [],
                                          menus: { dashboard: true, registration: true, doctor: true, settings: true }
                                        };
                                        const subjects = { ...current.subjects };
                                        (subjects as any)[item.key] = !(subjects as any)[item.key];
                                        setSettings(prev => prev ? { ...prev, pushNotificationSettings: { ...current, subjects } } : null);
                                      }}
                                      className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        (settings?.pushNotificationSettings?.subjects as any)?.[item.key] !== false ? "bg-blue-500" : "bg-slate-200"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                        (settings?.pushNotificationSettings?.subjects as any)?.[item.key] !== false ? "left-5.5" : "left-0.5"
                                      )} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Menus */}
                            <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">মেনু নোটিফিকেশন (Menus)</label>
                              <div className="grid grid-cols-1 gap-3">
                                {[
                                  { key: 'dashboard', label: 'ড্যাশবোর্ড' },
                                  { key: 'registration', label: 'রেজিস্ট্রেশন' },
                                  { key: 'doctor', label: 'ডাক্তার প্যানেল' },
                                  { key: 'settings', label: 'সেটিংস' },
                                ].map((item) => (
                                  <div key={item.key} className="flex items-center justify-between p-3 bg-white border border-slate-200">
                                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                    <button
                                      onClick={() => {
                                        const current = settings?.pushNotificationSettings || { 
                                          enabled: false, 
                                          subjects: { newRegistration: true, doctorCall: true, statusChange: true, systemAlert: true },
                                          departments: [],
                                          menus: { dashboard: true, registration: true, doctor: true, settings: true }
                                        };
                                        const menus = { ...current.menus };
                                        (menus as any)[item.key] = !(menus as any)[item.key];
                                        setSettings(prev => prev ? { ...prev, pushNotificationSettings: { ...current, menus } } : null);
                                      }}
                                      className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        (settings?.pushNotificationSettings?.menus as any)?.[item.key] !== false ? "bg-blue-500" : "bg-slate-200"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                        (settings?.pushNotificationSettings?.menus as any)?.[item.key] !== false ? "left-5.5" : "left-0.5"
                                      )} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Departments */}
                          <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ডিপার্টমেন্ট ফিল্টার (Departments)</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-white border border-slate-200">
                              {(settings?.departments || ['মেডিসিন', 'কার্ডিওলজি', 'পেডিয়াট্রিক', 'গাইনি', 'ওটি (OT)', 'অর্থোপেডিক', 'দন্ত', 'ইএনটি (ENT)', 'ইউরোলজি']).map((dept, idx) => {
                                const isSelected = settings?.pushNotificationSettings?.departments?.includes(dept);
                                return (
                                  <button
                                    key={`push-dept-${dept}-${idx}`} onClick={() => {
                                      const current = settings?.pushNotificationSettings || { 
                                        enabled: false, 
                                        subjects: { newRegistration: true, doctorCall: true, statusChange: true, systemAlert: true },
                                        departments: [],
                                        menus: { dashboard: true, registration: true, doctor: true, settings: true }
                                      };
                                      const depts = isSelected 
                                        ? current.departments.filter(d => d !== dept)
                                        : [...current.departments, dept];
                                      setSettings(prev => prev ? { ...prev, pushNotificationSettings: { ...current, departments: depts } } : null);
                                    }}
                                    className={cn(
                                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                      isSelected 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    {dept}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Email Templates Section */}
                          <div className="pt-8 border-t-2 border-slate-100 space-y-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 rounded-none text-indigo-600 shrink-0">
                                <Mail size={20} />
                              </div>
                              <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tight">ইমেইল টেমপ্লেট সেটিংস</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                              {[
                                { key: 'newRegistration', label: 'নতুন রেজিস্ট্রেশন (New Registration)', icon: <UserPlus size={14} /> },
                                { key: 'passwordReset', label: 'পাসওয়ার্ড রিসেট (Password Reset)', icon: <Key size={14} /> },
                                { key: 'appointmentConfirmation', label: 'অ্যাপয়েন্টমেন্ট কনফার্মেশন (Appointment Confirmation)', icon: <CalendarCheck size={14} /> },
                              ].map((template) => (
                                <div key={template.key} className="space-y-4 p-6 bg-white border-2 border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                    {template.icon}
                                    <h4 className="font-black text-xs uppercase tracking-tight">{template.label}</h4>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল সাবজেক্ট (Subject)</label>
                                      <input 
                                        type="text"
                                        value={(settings?.emailTemplates as any)?.[template.key]?.subject || ''}
                                        onChange={(e) => {
                                          const currentTemplates = settings?.emailTemplates || {
                                            newRegistration: { subject: '', body: '' },
                                            passwordReset: { subject: '', body: '' },
                                            appointmentConfirmation: { subject: '', body: '' }
                                          };
                                          setSettings(prev => prev ? {
                                            ...prev,
                                            emailTemplates: {
                                              ...currentTemplates,
                                              [template.key]: {
                                                ...(currentTemplates as any)[template.key],
                                                subject: e.target.value
                                              }
                                            }
                                          } : null);
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                        placeholder="Enter email subject..."
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল বডি (Body Content)</label>
                                      <textarea 
                                        value={(settings?.emailTemplates as any)?.[template.key]?.body || ''}
                                        onChange={(e) => {
                                          const currentTemplates = settings?.emailTemplates || {
                                            newRegistration: { subject: '', body: '' },
                                            passwordReset: { subject: '', body: '' },
                                            appointmentConfirmation: { subject: '', body: '' }
                                          };
                                          setSettings(prev => prev ? {
                                            ...prev,
                                            emailTemplates: {
                                              ...currentTemplates,
                                              [template.key]: {
                                                ...(currentTemplates as any)[template.key],
                                                body: e.target.value
                                              }
                                            }
                                          } : null);
                                        }}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none"
                                        placeholder="Enter email body content..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* How to use notifications */}
                          <div className="bg-slate-50 border-2 border-slate-200 p-4 md:p-6 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                              <div className="p-2 bg-slate-100 rounded-none text-slate-600 self-start">
                                <HelpCircle size={20} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-black text-slate-900 uppercase tracking-tight mb-2">নোটিফিকেশন কীভাবে কাজ করে?</h4>
                                <ul className="space-y-2">
                                  <li className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    ব্রাউজারে নোটিফিকেশন অনুমতি (Permission) অবশ্যই থাকতে হবে।
                                  </li>
                                  <li className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    আইফ্রেমের (Iframe) ভেতরে নোটিফিকেশন কাজ করে না, অ্যাপটি নতুন ট্যাবে ওপেন করুন।
                                  </li>
                                  <li className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    মোবাইলে নোটিফিকেশন পেতে অ্যাপটি "Add to Home Screen" করে ব্যবহার করুন।
                                  </li>
                                  <li className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    ব্রাউজার ব্যাকগ্রাউন্ডে থাকলেও নোটিফিকেশন আসবে যদি সার্ভিস ওয়ার্কার সক্রিয় থাকে।
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: 'আপনি কি নিশ্চিত যে আপনি নোটিফিকেশন ও ইমেইল সেটিংস সংরক্ষণ করতে চান?',
                              onConfirm: async () => {
                                if (settings) {
                                  try {
                                    await updateDoc(doc(db, 'settings', 'general'), { 
                                      pushNotificationSettings: settings.pushNotificationSettings || null,
                                      emailTemplates: settings.emailTemplates || null
                                    });
                                    await logActivity('settings', 'নোটিফিকেশন ও ইমেইল সেটিংস আপডেট', 'পুশ নোটিফিকেশন এবং ইমেইল টেমপ্লেট সেটিংস পরিবর্তন করা হয়েছে।');
                                    showToast('সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে');
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full py-4 text-white rounded-none font-black hover:opacity-90 transition-all shadow-lg bg-blue-600 shadow-blue-600/20 uppercase tracking-widest text-xs"
                        >
                          সেটিংস সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {systemTab === 'data-backup' && canManageBackup && (
                    <DataBackup 
                      onExport={handleExportData}
                      onImport={handleImportData}
                      isExporting={isExporting}
                      isImporting={isImporting}
                    />
                  )}

                  {systemTab === 'welcome-popup' && canManageWelcomePopup && (
                    <div className="w-full mx-auto space-y-8">
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20 shrink-0">
                              <Sparkles size={24} />
                            </div>
                            <div>
                              <h3 className="font-black text-xl md:text-2xl text-slate-900">ওয়েলকাম পপআপ সেটিংস</h3>
                              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Welcome Popup Configuration</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 self-start md:self-auto">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">পপআপ সক্রিয় করুন</span>
                            <button
                              onClick={() => setSettings(prev => {
                                if (!prev) return null;
                                const welcomePopup = prev.welcomePopup || DEFAULT_SETTINGS.welcomePopup!;
                                return {
                                  ...prev,
                                  welcomePopup: {
                                    ...welcomePopup,
                                    enabled: !welcomePopup.enabled
                                  }
                                };
                              })}
                              className={cn(
                                "w-14 h-7 rounded-full transition-all relative",
                                settings?.welcomePopup?.enabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-200"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                settings?.welcomePopup?.enabled ? "left-8" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পপআপ টাইটেল (Title)</label>
                              <input 
                                type="text" 
                                value={settings?.welcomePopup?.title || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev,
                                  welcomePopup: {
                                    ...prev.welcomePopup!,
                                    title: e.target.value
                                  }
                                } : null)}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="স্বাগতম!"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পপআপ কন্টেন্ট (Content)</label>
                              <textarea 
                                value={settings?.welcomePopup?.content || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev,
                                  welcomePopup: {
                                    ...prev.welcomePopup!,
                                    content: e.target.value
                                  }
                                } : null)}
                                rows={4}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                placeholder="পপআপের মূল বার্তা এখানে লিখুন..."
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ফুটার টেক্সট (Footer Text)</label>
                              <input 
                                type="text" 
                                value={settings?.welcomePopup?.footerText || ''}
                                onChange={(e) => setSettings(prev => prev ? {
                                  ...prev,
                                  welcomePopup: {
                                    ...prev.welcomePopup!,
                                    footerText: e.target.value
                                  }
                                } : null)}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="DESIGN BY KAWSAR"
                              />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">সফটওয়্যার ফিচারসমূহ (Features)</label>
                              <div className="space-y-3">
                                {settings?.welcomePopup?.features?.map((feature, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={feature}
                                      onChange={(e) => {
                                        const newFeatures = [...(settings?.welcomePopup?.features || [])];
                                        newFeatures[idx] = e.target.value;
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          welcomePopup: {
                                            ...prev.welcomePopup!,
                                            features: newFeatures
                                          }
                                        } : null);
                                      }}
                                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    />
                                    <button 
                                      onClick={() => {
                                        const currentFeatures = settings?.welcomePopup?.features || [];
                                        const newFeatures = currentFeatures.filter((_, i) => i !== idx);
                                        setSettings(prev => prev ? {
                                          ...prev,
                                          welcomePopup: {
                                            ...prev.welcomePopup!,
                                            features: newFeatures
                                          }
                                        } : null);
                                      }}
                                      className="p-3 bg-red-50 text-red-600 hover:bg-red-100 transition-all rounded-none"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => {
                                    const newFeatures = [...(settings?.welcomePopup?.features || []), ''];
                                    setSettings(prev => prev ? {
                                      ...prev,
                                      welcomePopup: {
                                        ...prev.welcomePopup!,
                                        features: newFeatures
                                      }
                                    } : null);
                                  }}
                                  className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                  <Plus size={16} />
                                  নতুন ফিচার যোগ করুন
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-10">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-600/20 shrink-0">
                                <UserIcon size={24} />
                              </div>
                              <div>
                                <h3 className="font-black text-xl md:text-2xl text-slate-900">পেশেন্ট ওয়েলকাম পপআপ সেটিংস</h3>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Welcome Popup Configuration</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 self-start md:self-auto">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">পেশেন্ট পপআপ সক্রিয় করুন</span>
                              <button
                                onClick={() => setSettings(prev => {
                                  if (!prev) return null;
                                  const patientWelcomePopup = prev.patientWelcomePopup || DEFAULT_SETTINGS.patientWelcomePopup!;
                                  return {
                                    ...prev,
                                    patientWelcomePopup: {
                                      ...patientWelcomePopup,
                                      enabled: !patientWelcomePopup.enabled
                                    }
                                  };
                                })}
                                className={cn(
                                  "w-14 h-7 rounded-full transition-all relative",
                                  settings?.patientWelcomePopup?.enabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-200"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                                  settings?.patientWelcomePopup?.enabled ? "left-8" : "left-1"
                                )} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পপআপ টাইটেল (Title)</label>
                                <input 
                                  type="text" 
                                  value={settings?.patientWelcomePopup?.title || ''}
                                  onChange={(e) => setSettings(prev => prev ? {
                                    ...prev,
                                    patientWelcomePopup: {
                                      ...prev.patientWelcomePopup!,
                                      title: e.target.value
                                    }
                                  } : null)}
                                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="পেশেন্ট পোর্টালে স্বাগতম!"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পপআপ কন্টেন্ট (Content)</label>
                                <textarea 
                                  value={settings?.patientWelcomePopup?.content || ''}
                                  onChange={(e) => setSettings(prev => prev ? {
                                    ...prev,
                                    patientWelcomePopup: {
                                      ...prev.patientWelcomePopup!,
                                      content: e.target.value
                                    }
                                  } : null)}
                                  rows={4}
                                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                  placeholder="পেশেন্টদের জন্য মূল বার্তা এখানে লিখুন..."
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ফুটার টেক্সট (Footer Text)</label>
                                <input 
                                  type="text" 
                                  value={settings?.patientWelcomePopup?.footerText || ''}
                                  onChange={(e) => setSettings(prev => prev ? {
                                    ...prev,
                                    patientWelcomePopup: {
                                      ...prev.patientWelcomePopup!,
                                      footerText: e.target.value
                                    }
                                  } : null)}
                                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="DESIGN BY KAWSAR"
                                />
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">পেশেন্ট পোর্টাল ফিচারসমূহ (Features)</label>
                                <div className="space-y-3">
                                  {settings?.patientWelcomePopup?.features?.map((feature, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input 
                                        type="text" 
                                        value={feature}
                                        onChange={(e) => {
                                          const newFeatures = [...(settings?.patientWelcomePopup?.features || [])];
                                          newFeatures[idx] = e.target.value;
                                          setSettings(prev => prev ? {
                                            ...prev,
                                            patientWelcomePopup: {
                                              ...prev.patientWelcomePopup!,
                                              features: newFeatures
                                            }
                                          } : null);
                                        }}
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                      />
                                      <button 
                                        onClick={() => {
                                          const currentFeatures = settings?.patientWelcomePopup?.features || [];
                                          const newFeatures = currentFeatures.filter((_, i) => i !== idx);
                                          setSettings(prev => prev ? {
                                            ...prev,
                                            patientWelcomePopup: {
                                              ...prev.patientWelcomePopup!,
                                              features: newFeatures
                                            }
                                          } : null);
                                        }}
                                        className="p-3 bg-red-50 text-red-600 hover:bg-red-100 transition-all rounded-none"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  ))}
                                  <button 
                                    onClick={() => {
                                      const newFeatures = [...(settings?.patientWelcomePopup?.features || []), ''];
                                      setSettings(prev => prev ? {
                                        ...prev,
                                        patientWelcomePopup: {
                                          ...prev.patientWelcomePopup!,
                                          features: newFeatures
                                        }
                                      } : null);
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                  >
                                    <Plus size={16} />
                                    নতুন ফিচার যোগ করুন
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: 'আপনি কি নিশ্চিত যে আপনি ওয়েলকাম পপআপ সেটিংস সংরক্ষণ করতে চান?',
                              onConfirm: async () => {
                                if (settings && (settings.welcomePopup || settings.patientWelcomePopup)) {
                                  try {
                                    await updateDoc(doc(db, 'settings', 'general'), { 
                                      welcomePopup: settings.welcomePopup,
                                      patientWelcomePopup: settings.patientWelcomePopup
                                    });
                                    await logActivity('settings', 'ওয়েলকাম পপআপ আপডেট', 'ওয়েলকাম পপআপ সেটিংস পরিবর্তন করা হয়েছে।');
                                    showToast('ওয়েলকাম পপআপ সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে');
                                  } catch (error) {
                                    console.error(error);
                                    showToast('সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে');
                                  }
                                }
                              }
                            });
                          }}
                          className="w-full py-4 text-white rounded-none font-black hover:opacity-90 transition-all shadow-lg bg-blue-600 shadow-blue-600/20 uppercase tracking-widest text-xs"
                        >
                          ওয়েলকাম পপআপ সেটিংস সংরক্ষণ করুন
                        </button>
                      </div>
                    </div>
                  )}

                  {systemTab === 'emergency' && (
                    <div className="w-full mx-auto space-y-8">
                      {/* Emergency Notice Section */}
                      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-none text-red-600 shrink-0">
                              <AlertCircle size={20} />
                            </div>
                            <h3 className="font-black text-lg md:text-xl text-slate-900">জরুরী নোটিশ</h3>
                          </div>
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse self-start md:self-auto">লাইভ কন্ট্রোল</span>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">নোটিশের ধরণ নির্বাচন করুন</label>
                            <div className="flex flex-col sm:flex-row p-1.5 bg-slate-100 rounded-2xl w-full gap-2 sm:gap-0">
                              <button
                                onClick={() => setSelectedDoctorForNotice('global')}
                                className={cn(
                                  "flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2",
                                  selectedDoctorForNotice === 'global' 
                                    ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-md" 
                                    : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <Megaphone size={16} />
                                সাধারণ নোটিশ
                              </button>
                              <div className="hidden sm:block w-px h-6 bg-slate-200 self-center mx-1" />
                              <select 
                                value={selectedDoctorForNotice === 'global' ? '' : selectedDoctorForNotice}
                                onChange={(e) => setSelectedDoctorForNotice(e.target.value)}
                                className={cn(
                                  "flex-1 py-3 bg-transparent rounded-xl font-black text-sm transition-all outline-none text-center cursor-pointer",
                                  selectedDoctorForNotice !== 'global' ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-md" : "text-slate-500"
                                )}
                              >
                                <option value="" disabled>ডাক্তার নির্বাচন করুন</option>
                                {availableDoctorsToday.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {selectedDoctorForNotice === 'global' ? 'সাধারণ' : doctors.find(d => d.id === selectedDoctorForNotice)?.name} এর জন্য নোটিশ
                              </label>
                            </div>

                            {/* Category Tabs */}
                            <div className="flex flex-wrap gap-2 mb-4">
                            {Object.keys(noticeCategories).map((cat, idx) => (
                                <button
                                  key={`cat-${cat}-${idx}`} onClick={() => setSelectedNoticeCategory(cat)}
                                  className={cn(
                                    "px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-wider transition-all border",
                                    selectedNoticeCategory === cat
                                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                      : "bg-gradient-to-br from-white to-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                                  )}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {noticeCategories[selectedNoticeCategory]?.map((notice, idx) => {
                                const isActive = selectedDoctorForNotice === 'global' 
                                  ? settings?.activeNotice === notice
                                  : doctors.find(d => d.id === selectedDoctorForNotice)?.activeNotice === notice;
                                
                                return (
                                  <button
                                    key={`notice-${notice}-${idx}`} onClick={() => updateNotice(notice)}
                                    className={cn(
                                      "text-xs p-4 rounded-none border-2 transition-all text-left font-bold relative overflow-hidden group",
                                      isActive 
                                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30" 
                                        : "bg-slate-50 border-slate-100 text-slate-600 hover:border-red-200 hover:bg-slate-50"
                                    )}
                                  >
                                    {isActive && (
                                      <div
                                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                                      />
                                    )}
                                    <div className="flex items-center justify-between relative z-10">
                                      <span>{notice}</span>
                                      {isActive && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => updateNotice('')}
                                className={cn(
                                  "text-xs p-4 rounded-none border-2 transition-all text-left font-bold flex items-center justify-between",
                                  !(selectedDoctorForNotice === 'global' ? settings?.activeNotice : doctors.find(d => d.id === selectedDoctorForNotice)?.activeNotice)
                                    ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                                    : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300"
                                )}
                              >
                                <span>কোনো নোটিশ নেই</span>
                                {!(selectedDoctorForNotice === 'global' ? settings?.activeNotice : doctors.find(d => d.id === selectedDoctorForNotice)?.activeNotice) && <X size={14} />}
                              </button>
                            </div>

                            {/* Custom Notice Input */}
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">কাস্টম নোটিশ লিখুন</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="এখানে আপনার কাস্টম নোটিশ লিখুন..."
                                  value={customNotice}
                                  onChange={(e) => setCustomNotice(e.target.value)}
                                  className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-slate-700"
                                />
                                <button
                                  onClick={() => {
                                    if (customNotice.trim()) {
                                      updateNotice(customNotice);
                                      setCustomNotice('');
                                    }
                                  }}
                                  className="px-6 bg-red-600 text-white font-black rounded-none hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                >
                                  প্রয়োগ করুন
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6 bg-slate-50 rounded-none border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বর্তমান অবস্থা</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {selectedDoctorForNotice !== 'global' && (
                                  <img 
                                    src={doctors.find(d => d.id === selectedDoctorForNotice)?.photoUrl || `https://picsum.photos/seed/${selectedDoctorForNotice}/100/100`} 
                                    className="w-10 h-10 rounded-xl object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-black text-slate-900">
                                    {selectedDoctorForNotice === 'global' ? 'সাধারণ নোটিশ' : doctors.find(d => d.id === selectedDoctorForNotice)?.name}
                                  </p>
                                  <p className="text-xs font-bold text-red-600">
                                    {(selectedDoctorForNotice === 'global' ? settings?.activeNotice : doctors.find(d => d.id === selectedDoctorForNotice)?.activeNotice) || 'কোনো নোটিশ সক্রিয় নেই'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
        )}

        {(activeTab === 'doctors-list' || activeTab === 'doctors-today' || activeTab === 'doctors-schedule' || activeTab === 'doctors-department' || activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports') && (
          <div className="w-full mx-auto px-2 md:px-4">
            {/* Doctor Sub-tabs */}
            <div className="mb-6 lg:hidden">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm">
                {canManageDoctors && (
                  <button
                    onClick={() => setActiveTab('doctors-list')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-list' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Users size={16} />
                    তালিকা
                  </button>
                )}
                {canViewDoctorToday && (
                  <button
                    onClick={() => setActiveTab('doctors-today')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-today' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Clock size={16} />
                    আজকের
                  </button>
                )}
                {canViewDoctorSchedule && (
                  <button
                    onClick={() => setActiveTab('doctors-schedule')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-schedule' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <CalendarIcon size={16} />
                    শিডিউল
                  </button>
                )}
                {canManageDepartments && (
                  <button
                    onClick={() => setActiveTab('doctors-department')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-department' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Building2 size={16} />
                    বিভাগ
                  </button>
                )}
                {canManageProcedures && (
                  <button
                    onClick={() => setActiveTab('doctors-procedure')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-procedure' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Activity size={16} />
                    প্রসিডিওর
                  </button>
                )}
                {canViewPatientReports && (
                  <button
                    onClick={() => setActiveTab('doctors-patient-reports')}
                    className={cn(
                      "px-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1.5 text-center",
                      activeTab === 'doctors-patient-reports' 
                        ? "bg-white text-blue-600 shadow-md border border-blue-100" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <FileText size={16} />
                    রিপোর্ট
                  </button>
                )}
              </div>
            </div>

        {activeTab === 'doctors-patient-reports' && canViewPatientReports && (
          <div className="w-full space-y-6 md:space-y-8 px-2 md:px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
              <div>
                <h2 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 md:mb-2">রোগী রিপোর্ট</h2>
                <p className="text-slate-500 font-medium text-xs md:text-base">ডাক্তার এবং তারিখ অনুযায়ী রোগীদের বিস্তারিত রিপোর্ট</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* Filter Panel */}
              <div className="lg:col-span-1 space-y-4 md:space-y-6">
                <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-100">
                  <h3 className="text-base md:text-lg font-black text-slate-900 mb-4 md:mb-6 flex items-center gap-3">
                    <Filter className="text-blue-600 w-[18px] h-[18px] md:w-[20px] md:h-[20px]" />
                    ফিল্টার অপশন
                  </h3>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <DoctorSelector 
                        doctors={displayDoctors}
                        allPatients={allPatients}
                        selectedDoctorId={selectedDoctorId}
                        setSelectedDoctorId={setSelectedDoctorId}
                        className="max-w-none"
                        showAll={true}
                      />
                      <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                        <option value="">সকল বিভাগ</option>
                        {settings?.departments?.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={selectedProcedure} onChange={(e) => setSelectedProcedure(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                        <option value="">সকল প্রসিডিউর</option>
                        {settings?.procedures?.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                      <div className="grid grid-cols-2 gap-4">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                          <option value="">মাস</option>
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                          <option value="">বছর</option>
                          {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="relative group mb-4">
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-3 md:p-4 bg-slate-50 border-2 border-slate-100 group-hover:border-blue-200 transition-all rounded-xl md:rounded-2xl font-black text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-sm md:text-base"
                        />
                      </div>
                      <div className="relative group">
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-3 md:p-4 bg-slate-50 border-2 border-slate-100 group-hover:border-blue-200 transition-all rounded-xl md:rounded-2xl font-black text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-sm md:text-base"
                        />
                      </div>

                    <div className="pt-6">
                      <button
                        onClick={() => setHasSearched(true)}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 rounded-2xl"
                      >
                        <Search size={20} />
                        সার্চ করুন
                      </button>
                    </div>

                    {hasSearched && (
                      <div className="pt-6 grid grid-cols-2 gap-4">
                        <button
                          onClick={downloadPDF}
                          disabled={filteredPatients.length === 0}
                          className="flex flex-col items-center justify-center gap-3 p-4 bg-white hover:bg-red-50 disabled:opacity-50 border-2 border-red-100 text-red-600 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-100/50 active:scale-95 rounded-2xl"
                        >
                          <FileText size={24} />
                          পিডিএফ
                        </button>
                        <button
                          onClick={downloadExcel}
                          disabled={filteredPatients.length === 0}
                          className="flex flex-col items-center justify-center gap-3 p-4 bg-white hover:bg-emerald-50 disabled:opacity-50 border-2 border-emerald-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100/50 active:scale-95 rounded-2xl"
                        >
                          <FileSpreadsheet size={24} />
                          এক্সেল
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-3xl md:rounded-[2rem] text-white shadow-2xl shadow-blue-600/30">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className="p-2 md:p-3 bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl">
                      <Activity className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 md:px-3 py-1 rounded-full">সারসংক্ষেপ</span>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex justify-between items-end">
                      <p className="text-blue-100 font-bold text-xs md:text-sm">মোট রোগী</p>
                      <p className="text-3xl md:text-4xl font-black tracking-tighter">{patients.length}</p>
                    </div>
                    <div className="h-px bg-white/10 w-full" />
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <p className="text-blue-200 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1">নতুন</p>
                        <p className="text-lg md:text-xl font-black">{patients.filter(p => p.patientType === 'new').length}</p>
                      </div>
                      <div>
                        <p className="text-blue-200 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1">ফলোআপ</p>
                        <p className="text-lg md:text-xl font-black">{patients.filter(p => p.patientType === 'followup').length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                  <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">রোগীদের তালিকা</h3>
                    </div>
                    <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {selectedDate}
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                          <th className="px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">টোকেন</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">রোগীর নাম</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">বয়স</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">সার্ভিস</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">অবস্থা</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patients.length > 0 ? patients.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <span className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-100 rounded-lg md:rounded-xl font-black text-xs md:text-base text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                {p.serialNumber}
                              </span>
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-sm md:text-lg tracking-tight">{p.name}</span>
                                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.patientType === 'new' ? 'নতুন রোগী' : 'ফলোআপ'}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6 font-bold text-xs md:text-base text-slate-600">{p.age || 'N/A'}</td>
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <span className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-50 text-blue-600 text-[8px] md:text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100">
                                {p.service || 'General'}
                              </span>
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <span className={cn(
                                "px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-[10px] font-black rounded-full uppercase tracking-widest border",
                                p.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                p.status === 'running' ? "bg-red-50 text-red-600 border-red-100" :
                                "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                {p.status === 'completed' ? 'সম্পন্ন' : p.status === 'running' ? 'রানিং' : 'অপেক্ষমান'}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-4 md:px-8 py-12 md:py-20 text-center">
                              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-200 w-7 h-7 md:w-8 md:h-8" />
                              </div>
                              <p className="text-slate-400 font-black italic text-xs md:text-base">এই ফিল্টারে কোনো রোগী পাওয়া যায়নি</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'doctors-list' && canManageDoctors && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 md:mb-2">ডাক্তার তালিকা</h2>
                <p className="text-slate-500 font-medium">হাসপাতালের সকল বিশেষজ্ঞ ডাক্তারদের তালিকা</p>
              </div>
              <button
                onClick={() => setShowDoctorForm(true)}
                className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95 tracking-wide w-full md:w-auto justify-center"
              >
                <Plus size={20} className="md:w-6 md:h-6" />
                <span>নতুন ডাক্তার যোগ করুন</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-blue-600 shadow-[0_10px_40px_-15px_rgba(37,99,235,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-blue-600 text-white rounded-none shadow-lg shadow-blue-600/20 relative z-10">
                  <Users size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">মোট ডাক্তার</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">{doctors.length}</p>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-none">জন</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-emerald-600 shadow-[0_10px_40px_-15px_rgba(16,185,129,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-emerald-600 text-white rounded-none shadow-lg shadow-emerald-600/20 relative z-10">
                  <ShieldCheck size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">সক্রিয় ডাক্তার</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">{doctors.filter(d => d.status !== 'inactive').length}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-none">লাইভ</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-rose-600 shadow-[0_10px_40px_-15px_rgba(225,29,72,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-rose-600 text-white rounded-none shadow-lg shadow-rose-600/20 relative z-10">
                  <AlertCircle size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ছুটিতে আছেন</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">{doctors.filter(d => d.status === 'inactive').length}</p>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-none">অফ</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-amber-600 shadow-[0_10px_40px_-15px_rgba(245,158,11,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-amber-600 text-white rounded-none shadow-lg shadow-amber-600/20 relative z-10">
                  <CalendarCheck size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">আজকের ডিউটি</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">
                      {doctors.filter(d => d.availableDays?.includes(new Date().toLocaleDateString('en-US', { weekday: 'long' }))).length}
                    </p>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-none">শিডিউল</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-indigo-600 shadow-[0_10px_40px_-15px_rgba(79,70,229,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-indigo-600 text-white rounded-none shadow-lg shadow-indigo-600/20 relative z-10">
                  <Activity size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">প্রসিডিওর</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">
                      {doctors.filter(d => d.procedures && d.procedures.length > 0).length}
                    </p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-none">সার্ভিস</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-none border-b-4 border-purple-600 shadow-[0_10px_40px_-15px_rgba(147,51,234,0.2)] flex flex-col items-center md:items-start gap-3 md:gap-4 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="p-3 bg-purple-600 text-white rounded-none shadow-lg shadow-purple-600/20 relative z-10">
                  <Layers size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">মোট বিভাগ</p>
                  <div className="flex items-baseline gap-1 justify-center md:justify-start">
                    <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">
                      {new Set(doctors.map(d => d.department)).size}
                    </p>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-none">ইউনিট</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor List Tabs */}
            <div className="flex flex-row overflow-x-auto p-1 bg-slate-100 rounded-2xl w-full md:w-fit mb-6 gap-1 no-scrollbar">
              <button
                onClick={() => setDoctorListTab('all')}
                className={cn(
                  "px-6 py-3 rounded-xl font-black text-[10px] md:text-xs transition-all uppercase tracking-widest whitespace-nowrap",
                  doctorListTab === 'all' 
                    ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                All Doctors
              </button>
              <button
                onClick={() => setDoctorListTab('today')}
                className={cn(
                  "px-6 py-3 rounded-xl font-black text-[10px] md:text-xs transition-all uppercase tracking-widest whitespace-nowrap",
                  doctorListTab === 'today' 
                    ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Today's Schedule
              </button>
              <button
                onClick={() => setDoctorListTab('procedures')}
                className={cn(
                  "px-6 py-3 rounded-xl font-black text-[10px] md:text-xs transition-all uppercase tracking-widest whitespace-nowrap",
                  doctorListTab === 'procedures' 
                    ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Doctors with Procedures
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="ডাক্তারের নাম বা বিভাগ দিয়ে খুঁজুন..."
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm"
                />
              </div>
              <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                {(['all', 'active', 'inactive'] as const).map((status) => (
                  <button
                    key={status} onClick={() => setDoctorFilterStatus(status)}
                    className={cn(
                      "px-6 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest",
                      doctorFilterStatus === status 
                        ? "bg-gradient-to-br from-white to-slate-50 text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {status === 'all' ? 'সব' : status === 'active' ? 'একটিভ' : 'ইন-একটিভ'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              
                {paginatedDoctors.map((d, index) => (
                  <div
                    key={`doc-card-${d.id}`} className="bg-gradient-to-br from-white to-slate-50 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 shadow-lg overflow-hidden hover:shadow-2xl hover:border-blue-200 transition-all group relative flex flex-col"
                  >
                    <div className="relative h-40 md:h-44 overflow-hidden">
                      <img 
                        src={d.photoUrl || `https://picsum.photos/seed/${d.id}/400/400`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                      
                      <div className="absolute top-3 md:top-4 right-3 md:right-4 flex gap-2">
                        <button
                          onClick={() => setQuickViewDoctor(d)}
                          className="p-2 bg-slate-900/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-slate-900/60 transition-all shadow-lg active:scale-90"
                          title="কুইক ভিউ"
                        >
                          <Eye size={14} />
                        </button>
                        <div className={cn(
                          "px-3 md:px-4 py-1 md:py-1.5 rounded-full border backdrop-blur-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg",
                          d.status === 'inactive' 
                            ? "bg-red-500/30 text-red-100 border-red-400/40" 
                            : "bg-emerald-500/30 text-emerald-100 border-emerald-400/40"
                        )}>
                          {d.status === 'inactive' ? 'অফ' : 'অন'}
                        </div>
                      </div>

                      <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4">
                        <p className="font-black text-base md:text-xl tracking-tight leading-tight text-white drop-shadow-md line-clamp-1 flex items-center gap-1">
                          {d.name}
                          <VerificationBadge badge={d.verifiedBadge} size={16} />
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-blue-500/40 backdrop-blur-md border border-blue-400/30 rounded-md text-[9px] font-black text-blue-50 uppercase tracking-widest truncate">
                            {d.department}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-6 flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-slate-50/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">রুম</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                              <Monitor size={14} />
                            </div>
                            <span className="font-bold text-xs md:text-sm">{d.roomNumber}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">সময়সূচী</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
                              <Clock size={14} />
                            </div>
                            <span className="font-bold text-[10px] md:text-sm truncate">{d.schedule || 'সেট নেই'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 md:gap-3 mt-6">
                        <button
                          onClick={() => setSelectedDoctorForProfile(d)}
                          className="flex-1 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                          প্রোফাইল
                        </button>
                        <button
                          onClick={() => openEditDoctorForm(d)}
                          className="flex-1 py-2.5 md:py-3 bg-gradient-to-br from-white to-slate-50 text-slate-700 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border-2 border-slate-100 shadow-sm"
                        >
                          এডিট
                        </button>
                        <button
                          onClick={() => deleteDoctor(d.id)}
                          className="p-2.5 md:p-3 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl md:rounded-2xl transition-all active:scale-95 border-2 border-transparent hover:border-rose-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              
            </div>

            {/* Pagination Controls */}
            {totalDoctorPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setDoctorCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={doctorCurrentPage === 1}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                >
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalDoctorPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={`page-${page}`} onClick={() => setDoctorCurrentPage(page)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-black text-xs transition-all",
                        doctorCurrentPage === page
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setDoctorCurrentPage(prev => Math.min(totalDoctorPages, prev + 1))}
                  disabled={doctorCurrentPage === totalDoctorPages}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {filteredDoctors.length === 0 && (
              <div className="py-20 text-center bg-gradient-to-br from-white to-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">কোনো ডাক্তার পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'doctors-today' && canViewDoctorToday && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 md:mb-2">আজকের শিডিউল</h2>
              <p className="text-xs md:text-base text-slate-500 font-medium">আজকের দিনে উপলব্ধ ডাক্তারদের তালিকা</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                const todayDay = dayMap[new Date().getDay()];
                const todayDoctors = doctors.filter(d => d.availableDays?.includes(todayDay));

                if (todayDoctors.length === 0) {
                  return (
                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                      <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">আজকের শিডিউলে কোনো ডাক্তার নেই</p>
                    </div>
                  );
                }

                return paginatedTodayDoctors.map((d) => (
                  <div key={`today-doc-${d.id}`} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-blue-200 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <button
                        onClick={() => setQuickViewDoctor(d)}
                        className="p-3 bg-slate-900/80 backdrop-blur-md text-white rounded-2xl shadow-lg hover:bg-slate-900 transition-all active:scale-95"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <img src={d.photoUrl || `https://picsum.photos/seed/${d.id}/100/100`} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                      <div>
                        <h3 className="font-black text-lg text-slate-900 leading-tight mb-1 flex items-center gap-1">
                          {d.name}
                          <VerificationBadge badge={d.verifiedBadge} size={14} />
                        </h3>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                          {d.department}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সময়</span>
                        <span className="text-sm font-bold text-slate-700">{d.schedule || 'সেট নেই'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রুম</span>
                        <span className="text-sm font-bold text-slate-700">{d.room || 'সেট নেই'}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {totalTodayPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setTodayCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={todayCurrentPage === 1}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                >
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalTodayPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={`today-page-${page}`} onClick={() => setTodayCurrentPage(page)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-black text-xs transition-all",
                        todayCurrentPage === page
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setTodayCurrentPage(prev => Math.min(totalTodayPages, prev + 1))}
                  disabled={todayCurrentPage === totalTodayPages}
                  className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'doctors-schedule' && canViewDoctorSchedule && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 md:mb-2">ডাক্তার শিডিউল</h2>
                <p className="text-xs md:text-base text-slate-500 font-medium">ডাক্তারদের সাপ্তাহিক ডিউটি শিডিউল ম্যানেজমেন্ট</p>
              </div>
              <div className="w-full md:w-72 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="ডাক্তার খুঁজুন..."
                  value={scheduleSearchQuery}
                  onChange={(e) => {
                    setScheduleSearchQuery(e.target.value);
                    setScheduleCurrentPage(1);
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ডাক্তার</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">বিভাগ</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">উপলব্ধ দিনসমূহ</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">সময়</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScheduleDoctors.map(d => (
                    <tr key={`doc-table-${d.id}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <img src={d.photoUrl || `https://picsum.photos/seed/${d.id}/100/100`} className="w-10 h-10 rounded-xl object-cover" />
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            {d.name}
                            <VerificationBadge badge={d.verifiedBadge} size={12} />
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                          {d.department}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-1">
                          {d.availableDays?.map((day, idx) => (
                            <span key={`sched-day-${day}-${idx}`} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                              {day}
                            </span>
                          ))}
                          {(!d.availableDays || d.availableDays.length === 0) && (
                            <span className="text-slate-400 text-xs italic">সেট নেই</span>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-bold text-slate-600 text-sm">{d.schedule || '-'}</span>
                      </td>
                      <td className="p-6 text-right">
                        <button
                          onClick={() => openScheduleEditModal(d)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredScheduleDoctors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">কোনো ডাক্তার পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
              
              {totalSchedulePages > 1 && (
                <div className="flex justify-center items-center gap-2 p-6 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setScheduleCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={scheduleCurrentPage === 1}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"
                  >
                    <ChevronRight className="rotate-180" size={18} />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalSchedulePages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={`sched-page-${page}`} onClick={() => setScheduleCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg font-bold text-xs transition-all",
                          scheduleCurrentPage === page
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setScheduleCurrentPage(prev => Math.min(totalSchedulePages, prev + 1))}
                    disabled={scheduleCurrentPage === totalSchedulePages}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'doctors-department' && canManageDepartments && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-12 border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-10 -mr-32 -mt-32 opacity-50" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-1 md:mb-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                      <Building2 size={16} className="md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">ডিপার্টমেন্ট ম্যানেজমেন্ট</h3>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 font-bold">হাসপাতালের সকল বিভাগ এখান থেকে নিয়ন্ত্রণ করুন</p>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 border border-slate-100 mb-10">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">নতুন বিভাগ যোগ করুন</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input 
                      id="dept-page-input"
                      type="text" 
                      placeholder="বিভাগের নাম লিখুন (উদাঃ মেডিসিন)"
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const val = input.value.trim();
                          if (val && !settings?.departments?.includes(val)) {
                            setConfirmDialog({
                              isOpen: true,
                              message: `আপনি কি নিশ্চিত যে আপনি "${val}" বিভাগটি যোগ করতে চান?`,
                              onConfirm: () => {
                                setSettings(prev => prev ? {...prev, departments: [...(prev.departments || []), val]} : null);
                                input.value = '';
                              }
                            });
                          }
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById('dept-page-input') as HTMLInputElement;
                      const val = input.value.trim();
                      if (val && !settings?.departments?.includes(val)) {
                        setConfirmDialog({
                          isOpen: true,
                          message: `আপনি কি নিশ্চিত যে আপনি "${val}" বিভাগটি যোগ করতে চান?`,
                          onConfirm: () => {
                            setSettings(prev => prev ? {...prev, departments: [...(prev.departments || []), val]} : null);
                            input.value = '';
                          }
                        });
                      }
                    }}
                    className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    যোগ করুন
                  </button>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">বর্তমান বিভাগসমূহ ({settings?.departments?.length || 0})</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                    {settings?.departments?.map((dept, idx) => (
                      <div
                        key={`dept-list-${dept}-${idx}`} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl group hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Building2 size={18} />
                          </div>
                          <span className="font-black text-slate-700 text-sm md:text-base">{dept}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newName = window.prompt('নতুন নাম লিখুন:', dept);
                            if (newName && newName !== dept) {
                              setSettings(prev => prev ? {
                                ...prev,
                                departments: prev.departments?.map(d => d === dept ? newName : d)
                              } : null);
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: `আপনি কি নিশ্চিত যে আপনি "${dept}" বিভাগটি মুছে ফেলতে চান?`,
                              onConfirm: () => {
                                setSettings(prev => prev ? {...prev, departments: prev.departments?.filter(d => d !== dept)} : null);
                              }
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={async () => {
                    if (settings) {
                      setConfirmDialog({
                        isOpen: true,
                        message: 'আপনি কি নিশ্চিত যে আপনি ডিপার্টমেন্ট তালিকা সংরক্ষণ করতে চান?',
                        onConfirm: async () => {
                          try {
                            await setDoc(doc(db, 'settings', 'general'), { 
                              departments: settings.departments || []
                            }, { merge: true });
                            showToast('ডিপার্টমেন্ট তালিকা সফলভাবে আপডেট করা হয়েছে');
                          } catch (error) {
                            console.error("Error updating departments:", error);
                            showToast('ডিপার্টমেন্ট আপডেট করতে সমস্যা হয়েছে');
                          }
                        }
                      });
                    }
                  }}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  ডিপার্টমেন্ট তালিকা সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'doctors-procedure' && canManageProcedures && (
          <div className="w-full space-y-8 px-2 md:px-4">
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-12 border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 -mr-32 -mt-32 opacity-50" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-1 md:mb-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                      <Activity size={16} className="md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">প্রসিডিওর ম্যানেজমেন্ট</h3>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 font-bold">হাসপাতালের সকল প্রসিডিওর সার্ভিস এখান থেকে নিয়ন্ত্রণ করুন</p>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 border border-slate-100 mb-10">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">নতুন প্রসিডিওর যোগ করুন</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input 
                      id="proc-page-input"
                      type="text" 
                      placeholder="প্রসিডিওর এর নাম লিখুন (উদাঃ এন্ডোস্কপি)"
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const val = input.value.trim();
                          if (val && !settings?.procedures?.includes(val)) {
                            setConfirmDialog({
                              isOpen: true,
                              message: `আপনি কি নিশ্চিত যে আপনি "${val}" প্রসিডিওরটি যোগ করতে চান?`,
                              onConfirm: () => {
                                setSettings(prev => prev ? {...prev, procedures: [...(prev.procedures || []), val]} : null);
                                input.value = '';
                              }
                            });
                          }
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById('proc-page-input') as HTMLInputElement;
                      const val = input.value.trim();
                      if (val && !settings?.procedures?.includes(val)) {
                        setConfirmDialog({
                          isOpen: true,
                          message: `আপনি কি নিশ্চিত যে আপনি "${val}" প্রসিডিওরটি যোগ করতে চান?`,
                          onConfirm: () => {
                            setSettings(prev => prev ? {...prev, procedures: [...(prev.procedures || []), val]} : null);
                            input.value = '';
                          }
                        });
                      }
                    }}
                    className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    যোগ করুন
                  </button>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">বর্তমান প্রসিডিওরসমূহ ({settings?.procedures?.length || 0})</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                    {settings?.procedures?.map((proc, idx) => (
                      <div
                        key={`proc-list-${proc}-${idx}`} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl group hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <Activity size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700 text-sm md:text-base">{proc}</span>
                            <select
                              value={settings?.procedureDoctorMap?.[proc] || ''}
                              onChange={(e) => {
                                const doctorId = e.target.value;
                                setSettings(prev => prev ? {
                                  ...prev,
                                  procedureDoctorMap: {
                                    ...(prev.procedureDoctorMap || {}),
                                    [proc]: doctorId
                                  }
                                } : null);
                              }}
                              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1 mt-1 outline-none"
                            >
                              <option value="">ডাক্তার নির্বাচন করুন</option>
                              {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                              </select>
                              <select
                                value={settings?.procedureDepartmentMap?.[proc] || ''}
                                onChange={(e) => {
                                  const deptName = e.target.value;
                                  setSettings(prev => prev ? {
                                    ...prev,
                                    procedureDepartmentMap: {
                                      ...(prev.procedureDepartmentMap || {}),
                                      [proc]: deptName
                                    }
                                  } : null);
                                }}
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 mt-1 outline-none"
                              >
                                <option value="">ডিপার্টমেন্ট নির্বাচন করুন</option>
                                {settings?.departments?.map(dept => (
                                  <option key={`dept-map-${dept}`} value={dept}>{dept}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="ছবির URL"
                                value={settings?.procedureImageMap?.[proc] || ''}
                                onChange={(e) => {
                                  const imageUrl = e.target.value;
                                  setSettings(prev => prev ? {
                                    ...prev,
                                    procedureImageMap: {
                                      ...(prev.procedureImageMap || {}),
                                      [proc]: imageUrl
                                    }
                                  } : null);
                                }}
                                className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg px-2 py-1 mt-1 outline-none w-full"
                              />
                            </div>
                          </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              const newName = window.prompt('নতুন নাম লিখুন:', proc);
                              if (newName && newName !== proc) {
                                setSettings(prev => prev ? {
                                  ...prev,
                                  procedures: prev.procedures?.map(p => p === proc ? newName : p),
                                  procedureDoctorMap: prev.procedureDoctorMap ? {
                                    ...prev.procedureDoctorMap,
                                    [newName]: prev.procedureDoctorMap[proc]
                                  } : undefined,
                                  procedureDepartmentMap: prev.procedureDepartmentMap ? {
                                    ...prev.procedureDepartmentMap,
                                    [newName]: prev.procedureDepartmentMap[proc]
                                  } : undefined,
                                  procedureImageMap: prev.procedureImageMap ? {
                                    ...prev.procedureImageMap,
                                    [newName]: prev.procedureImageMap[proc]
                                  } : undefined
                                } : null);
                                // Remove old keys if renamed
                                if (newName !== proc) {
                                  setSettings(prev => {
                                    if (!prev) return null;
                                    const newMap = { ...prev.procedureDoctorMap };
                                    delete newMap[proc];
                                    const newDeptMap = { ...prev.procedureDepartmentMap };
                                    delete newDeptMap[proc];
                                    const newImageMap = { ...prev.procedureImageMap };
                                    delete newImageMap[proc];
                                    return {
                                      ...prev,
                                      procedureDoctorMap: newMap,
                                      procedureDepartmentMap: newDeptMap,
                                      procedureImageMap: newImageMap
                                    };
                                  });
                                }
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                message: `আপনি কি নিশ্চিত যে আপনি "${proc}" প্রসিডিওরটি মুছে ফেলতে চান?`,
                                onConfirm: () => {
                                  setSettings(prev => prev ? {...prev, procedures: prev.procedures?.filter(p => p !== proc)} : null);
                                }
                              });
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={async () => {
                    if (settings) {
                      setConfirmDialog({
                        isOpen: true,
                        message: 'আপনি কি নিশ্চিত যে আপনি প্রসিডিওর তালিকা সংরক্ষণ করতে চান?',
                        onConfirm: async () => {
                          try {
                            await setDoc(doc(db, 'settings', 'general'), { 
                              procedures: settings.procedures || [],
                              procedureDoctorMap: settings.procedureDoctorMap || {},
                              procedureDepartmentMap: settings.procedureDepartmentMap || {},
                              procedureImageMap: settings.procedureImageMap || {}
                            }, { merge: true });
                            showToast('প্রসিডিওর তালিকা সফলভাবে আপডেট করা হয়েছে');
                          } catch (error) {
                            console.error("Error updating procedures:", error);
                            showToast('প্রসিডিওর আপডেট করতে সমস্যা হয়েছে');
                          }
                        }
                      });
                    }
                  }}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  প্রসিডিওর তালিকা সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  </main>
      {/* Doctor Modal */}
      
        {showDoctorForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div
              className="bg-gradient-to-br from-white to-slate-50 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingDoctorId ? 'ডাক্তারের তথ্য পরিবর্তন করুন' : 'নতুন ডাক্তার যোগ করুন'}
                </h3>
                <button onClick={closeDoctorForm} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddDoctor} className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto custom-scrollbar">
                <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                      {docPhoto ? (
                        <img src={docPhoto} className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope className="text-slate-300" size={32} />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {isUploading ? <Loader2 className="text-white animate-spin" /> : <Upload className="text-white" />}
                      <input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        const newUrl = window.prompt('ডাক্তারের ছবি লিঙ্ক (URL) লিখুন:', docPhoto || '');
                        if (newUrl !== null) setDocPhoto(newUrl);
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-white hover:bg-slate-50 rounded-full shadow-lg text-blue-600 transition-all z-20 border border-slate-100"
                      title="লিঙ্ক আপডেট করুন"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">ডাক্তারের ছবি আপলোড করুন</p>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">কাভার ফটো</label>
                  <div className="relative group w-full h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {docCover ? (
                      <img src={docCover} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300">
                        <Upload size={24} />
                        <span className="text-[10px] font-bold">কাভার ফটো আপলোড</span>
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {isUploading ? <Loader2 className="text-white animate-spin" /> : <Upload className="text-white" />}
                      <input type="file" className="hidden" onChange={handleCoverUpload} disabled={isUploading} />
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        const newUrl = window.prompt('কাভার ফটো লিঙ্ক (URL) লিখুন:', docCover || '');
                        if (newUrl !== null) setDocCover(newUrl);
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-white hover:bg-slate-50 rounded-full shadow-lg text-blue-600 transition-all z-20 border border-slate-100"
                      title="লিঙ্ক আপডেট করুন"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ডাক্তারের নাম</label>
                  <input 
                    type="text" 
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">বিভাগ</label>
                  <select 
                    value={docDept}
                    onChange={(e) => setDocDept(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    required
                  >
                    <option value="" disabled>বিভাগ নির্বাচন করুন</option>
                    {settings?.departments?.map((dept, idx) => (
                      <option key={`dept-opt-edit-${dept}-${idx}`} value={dept}>{dept}</option>
                    ))}
                    {!settings?.departments?.includes(docDept) && docDept && (
                      <option key={`dept-opt-edit-custom-${docDept}`} value={docDept}>{docDept}</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ডিগ্রী</label>
                  <input 
                    type="text" 
                    value={docDeg}
                    onChange={(e) => setDocDeg(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">পদবী</label>
                  <input 
                    type="text" 
                    value={docDesig}
                    onChange={(e) => setDocDesig(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">সময়সূচী</label>
                  <input 
                    type="text" 
                    value={docSched}
                    onChange={(e) => setDocSched(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">রুম নাম্বার</label>
                  <input 
                    type="text" 
                    value={docRoom}
                    onChange={(e) => setDocRoom(e.target.value)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ভেরিফিকেশন ব্যাজ</label>
                  <select 
                    value={docVerifiedBadge}
                    onChange={(e) => setDocVerifiedBadge(e.target.value as any)}
                    className="w-full p-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                  >
                    <option value="none">None</option>
                    <option value="blue">Blue (Verified)</option>
                    <option value="black">Black (Official)</option>
                    <option value="green">Green (Trusted)</option>
                    <option value="red">Red (Urgent/Special)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ডাক্তারের অবস্থা</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDocStatus('active')}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg font-black text-[10px] transition-all uppercase tracking-widest",
                        docStatus === 'active' ? "bg-gradient-to-br from-white to-slate-50 text-emerald-600 shadow-sm" : "text-slate-500"
                      )}
                    >
                      একটিভ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocStatus('inactive')}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg font-black text-[10px] transition-all uppercase tracking-widest",
                        docStatus === 'inactive' ? "bg-gradient-to-br from-white to-slate-50 text-red-600 shadow-sm" : "text-slate-500"
                      )}
                    >
                      ইন-একটিভ
                    </button>
                  </div>
                </div>


                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ফুটার নোটিশ (এই ডাক্তারের জন্য)</label>
                  <div className="relative">
                    <Megaphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <textarea
                      placeholder="এই ডাক্তারের জন্য ফুটার নোটিশ এখানে লিখুন..."
                      value={docFooterNotice || ''}
                      onChange={(e) => setDocFooterNotice(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">স্ক্রলিং নোটিশ (সুধু এই ডাক্তারের জন্য)</label>
                  <div className="relative">
                    <Megaphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="এই ডাক্তারের জন্য বিশেষ কোনো ঘোষণা থাকলে এখানে লিখুন..."
                      value={docScrollingNotice}
                      onChange={(e) => setDocScrollingNotice(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Scrolling Text Settings */}
                <div className="col-span-1 md:col-span-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MonitorPlay size={18} className="text-blue-600" />
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">স্ক্রলিং টেক্সট সেটিংস</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">স্ক্রলিং সময় (সেকেন্ড)</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Clock size={16} />
                        </div>
                        <input 
                          type="number" 
                          min="1"
                          max="120"
                          value={docFooterScrollDuration}
                          onChange={(e) => setDocFooterScrollDuration(parseInt(e.target.value))}
                          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">থিম</label>
                      <div className="flex p-1 bg-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setDocFooterTheme('light')}
                          className={cn(
                            "flex-1 py-2 rounded-lg font-bold text-xs transition-all",
                            docFooterTheme === 'light'
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocFooterTheme('dark')}
                          className={cn(
                            "flex-1 py-2 rounded-lg font-bold text-xs transition-all",
                            docFooterTheme === 'dark'
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ব্যাকগ্রাউন্ড কালার</label>
                      <div className="flex items-center gap-4 p-2 bg-white border border-slate-200 rounded-xl">
                        <input 
                          type="color" 
                          value={docFooterBgColor}
                          onChange={(e) => setDocFooterBgColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="font-mono font-bold text-slate-500 text-xs uppercase">{docFooterBgColor}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">টেক্সট কালার</label>
                      <div className="flex items-center gap-4 p-2 bg-white border border-slate-200 rounded-xl">
                        <input 
                          type="color" 
                          value={docFooterTextColor}
                          onChange={(e) => setDocFooterTextColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="font-mono font-bold text-slate-500 text-xs uppercase">{docFooterTextColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">প্রসিডিওর সমূহ</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select 
                        id="new-procedure-input"
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !docProcedures.includes(val)) {
                            setDocProcedures(prev => [...prev, val]);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">প্রসিডিওর নির্বাচন করুন</option>
                        {settings?.procedures?.map((proc, idx) => (
                          <option key={`proc-opt-doc-${proc}-${idx}`} value={proc}>{proc}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-procedure-input') as HTMLSelectElement;
                          const val = input.value;
                          if (val && !docProcedures.includes(val)) {
                            setDocProcedures(prev => [...prev, val]);
                            input.value = '';
                          }
                        }}
                        className="px-6 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all"
                      >
                        যোগ করুন
                      </button>
                    </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[80px]">
                      {docProcedures.map((proc, idx) => (
                        <div key={`edit-proc-${proc}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm group">
                          <span className="text-sm font-bold text-slate-700">{proc}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDocProcedures(prev => prev.filter(p => p !== proc));
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {docProcedures.length === 0 && (
                        <p className="text-slate-400 text-xs italic w-full text-center py-4">কোনো প্রোসিডিউর যোগ করা হয়নি</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">কার্যদিবস</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {weekDays.map((day, idx) => (
                      <label key={`edit-day-label-${day}-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${availableDays.includes(day) ? 'bg-blue-100 text-blue-800' : 'bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={availableDays.includes(day)}
                          onChange={() => {
                            setAvailableDays(prev => 
                              prev.includes(day) 
                                ? prev.filter(d => d !== day) 
                                : [...prev, day]
                            );
                          }}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={closeDoctorForm} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                  >
                    {editingDoctorId ? 'পরিবর্তন সংরক্ষণ করুন' : 'ডাক্তার যোগ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* All Activities Modal */}
        
          {showAllActivities && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
              <div
                onClick={() => setShowAllActivities(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <div
                className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-none border-2 border-slate-900 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500 rounded-none text-white shadow-xl">
                      <Clock size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-3xl text-slate-900 uppercase tracking-tight">সকল অ্যাক্টিভিটি লগ</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Activity History</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAllActivities(false)}
                    className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"
                  >
                    <X size={32} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activityLogs.map((log, index) => (
                      <div
                        key={`log-list-${log.id}-${index}`} className="p-6 bg-white rounded-none border border-slate-200 shadow-sm flex flex-col gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-none flex items-center justify-center shadow-sm border border-slate-100",
                            log.type === 'patient' ? "bg-blue-500 text-white" : 
                            log.type === 'doctor' ? "bg-emerald-500 text-white" : 
                            log.type === 'settings' ? "bg-purple-500 text-white" : "bg-slate-500 text-white"
                          )}>
                            {log.type === 'patient' ? <Users size={20} /> : 
                             log.type === 'doctor' ? <Stethoscope size={20} /> : 
                             log.type === 'settings' ? <Settings size={20} /> : <Activity size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 leading-tight line-clamp-1">{log.action}</p>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">{log.userName}</p>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-50">
                          <p className="text-[11px] font-bold text-slate-600 mb-2 line-clamp-2">
                            {log.details}
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('bn-BD') : 'এখনই'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          

        {/* Doctor Profile View */}
        
          {selectedDoctorForProfile && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
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
                      {selectedDoctorForProfile.videoUrl && (
                        <a 
                          href={selectedDoctorForProfile.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all text-[10px] font-black uppercase tracking-widest mt-2"
                        >
                          <Play size={12} />
                          View Video
                        </a>
                      )}
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
                              {allPatients.filter(p => p.doctorId === selectedDoctorForProfile.id).length}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">আজকের রোগী</p>
                            <p className="text-2xl font-black text-emerald-600">
                              {patients.filter(p => p.doctorId === selectedDoctorForProfile.id).length}
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
                        {allPatients
                          .filter(p => p.doctorId === selectedDoctorForProfile.id)
                          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                          .slice(0, 10)
                          .map((p, idx) => (
                            <div
                              key={`hist-${p.id}`} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-all shadow-sm group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  {p.serialNumber}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700 flex items-center gap-1">
                                    {p.name}
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
                        
                        {allPatients.filter(p => p.doctorId === selectedDoctorForProfile.id).length === 0 && (
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
        
      
      <MobileNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setSystemTab={setSystemTab} 
        setUserTab={setUserTab} 
        settings={settings}
        canViewOverview={canViewOverview}
        canViewDashboard={canViewDashboard}
        canViewOpdDashboard={canViewOpdDashboard}
        canViewRegistration={canViewRegistration}
        canViewLive={canViewLive}
        canViewDoctors={canViewDoctors}
        canViewPatients={canViewPatients}
        canManageSettings={canManageSettings}
        canViewProfile={canViewProfile}
        canManageUsers={canManageUsers}
        canManagePatients={canManagePatients}
        userProfile={userProfile}
        isSuperAdmin={isSuperAdmin}
      />

      
        {toast && (
          <div
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-600 text-white shadow-emerald-600/20" :
              toast.type === 'error' ? "bg-red-600 text-white shadow-red-600/20" :
              "bg-slate-800 text-white shadow-slate-800/20"
            )}>
            {toast.type === 'success' && <CheckCircle2 size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            {toast.message}
          </div>
        )}
      

      
        {confirmDialog && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setConfirmDialog(null)}
            />
            <div
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">নিশ্চিত করুন</h3>
                <p className="text-slate-500 font-medium text-sm mb-8">{confirmDialog.message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={() => {
                      confirmDialog.onConfirm();
                      setConfirmDialog(null);
                    }}
                    className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                  >
                    হ্যাঁ, নিশ্চিত
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      

      
        {quickViewDoctor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              <button
                onClick={() => setQuickViewDoctor(null)}
                className="absolute top-6 right-6 p-2 bg-slate-100/50 hover:bg-slate-200/50 backdrop-blur-md rounded-full transition-all z-10"
              >
                <X size={20} className="text-slate-900" />
              </button>

              <div className="relative h-48 shrink-0 overflow-hidden">
                <img 
                  src={quickViewDoctor.photoUrl || `https://picsum.photos/seed/${quickViewDoctor.id}/400/400`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                <div className="absolute bottom-6 left-8 right-8">
                  <h3 className="text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                    {quickViewDoctor.name}
                    <VerificationBadge badge={quickViewDoctor.verifiedBadge} size={20} />
                  </h3>
                  <p className="text-blue-300 font-bold text-sm uppercase tracking-widest mt-1">{quickViewDoctor.department}</p>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ডিগ্রী</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <Stethoscope size={16} />
                      </div>
                      <span className="font-bold text-sm leading-tight">{quickViewDoctor.degree || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">পদবী</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <ShieldCheck size={16} />
                      </div>
                      <span className="font-bold text-sm leading-tight">{quickViewDoctor.designation || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সময়সূচী</p>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm">{quickViewDoctor.schedule || 'সেট নেই'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {quickViewDoctor.availableDays?.join(', ') || 'দিন সেট নেই'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white">
                      <Monitor size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">রুম নম্বর</p>
                      <p className="font-black text-slate-900 text-lg">{quickViewDoctor.roomNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDoctorForProfile(quickViewDoctor);
                      setQuickViewDoctor(null);
                    }}
                    className="px-6 py-3 bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    বিস্তারিত প্রোফাইল
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <IconPickerModal 
          isOpen={iconPicker.isOpen}
          onClose={() => setIconPicker({ isOpen: false, key: null, currentIcon: null })}
          currentIcon={iconPicker.currentIcon || undefined}
          onSelect={(iconName) => {
            if (iconPicker.key) {
              const newIcons = { ...(settings?.mobileNavIcons || {}) };
              (newIcons as any)[iconPicker.key] = iconName;
              setSettings(prev => prev ? { ...prev, mobileNavIcons: newIcons } : null);
            }
            setIconPicker({ isOpen: false, key: null, currentIcon: null });
          }}
        />

        {showScheduleEditModal && editingDoctorForSchedule && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="p-6 md:p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
                <button 
                  onClick={() => setShowScheduleEditModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden">
                    <img src={editingDoctorForSchedule.photoUrl || `https://picsum.photos/seed/${editingDoctorForSchedule.id}/100/100`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">{editingDoctorForSchedule.name}</h2>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{editingDoctorForSchedule.department}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">উপলব্ধ দিনসমূহ</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                      const dayBn = day === 'Saturday' ? 'শনিবার' : day === 'Sunday' ? 'রবিবার' : day === 'Monday' ? 'সোমবার' : day === 'Tuesday' ? 'মঙ্গলবার' : day === 'Wednesday' ? 'বুধবার' : day === 'Thursday' ? 'বৃহস্পতিবার' : 'শুক্রবার';
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (scheduleEditDays.includes(dayBn)) {
                              setScheduleEditDays(prev => prev.filter(d => d !== dayBn));
                            } else {
                              setScheduleEditDays(prev => [...prev, dayBn]);
                            }
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                            scheduleEditDays.includes(dayBn)
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                              : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                          )}
                        >
                          {dayBn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">সময় (যেমন: 10:00 AM - 02:00 PM)</label>
                    <input 
                      type="text"
                      value={scheduleEditTime}
                      onChange={(e) => setScheduleEditTime(e.target.value)}
                      placeholder="সময় লিখুন..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">রুম নম্বর</label>
                    <input 
                      type="text"
                      value={scheduleEditRoom}
                      onChange={(e) => setScheduleEditRoom(e.target.value)}
                      placeholder="রুম নম্বর..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowScheduleEditModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveSchedule}
                    disabled={isSavingSchedule}
                    className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingSchedule ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    সেভ করুন
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showWelcomePopup && settings?.welcomePopup && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-900/20 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20"
            >
              {/* Header Section */}
              <div className="relative h-32 md:h-48 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shrink-0">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150" />
                </div>
                
                {/* Close Button */}
                <button 
                  onClick={() => setShowWelcomePopup(false)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all z-20 backdrop-blur-md shadow-lg"
                >
                  <X size={28} />
                </button>

                <div className="relative z-10 text-center space-y-1 md:space-y-2 px-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-xl rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-2 md:mb-4 border border-white/30 shadow-xl">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">{settings.welcomePopup.title}</h2>
                  <p className="text-blue-100 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-[10px]">Welcome to Sajeda Jabbar Hospital</p>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
                <div className="space-y-3 md:space-y-4 text-center">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 flex flex-wrap items-center justify-center gap-1">
                    স্বাগতম, <span className="text-blue-600 inline-flex items-center gap-1">{userProfile?.name} {userProfile?.role !== 'patient' && <VerificationBadge badge={userProfile?.verifiedBadge} size={14} />}</span>!
                  </h3>
                  <p className="text-sm md:text-base text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
                    {settings.welcomePopup.content}
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {settings.welcomePopup.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 group hover:border-blue-200 hover:bg-white transition-all duration-300">
                      <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg md:rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="font-bold text-slate-700 text-xs md:text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Section */}
                <div className="pt-4 md:pt-6 border-t border-slate-100 space-y-4 md:space-y-6">
                  <button
                    onClick={() => setShowWelcomePopup(false)}
                    className="w-full py-4 md:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    শুরু করা যাক
                  </button>
                  <div className="text-center">
                    <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] italic">
                      {settings.welcomePopup.footerText}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      
    </div>
  );
}


