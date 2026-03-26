import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, firebaseConfig } from '../lib/firebase';
import { UserProfile, ActivityLog, Doctor, UserPermissions, Patient } from '../types';
import { 
  Users, 
  Search, 
  Edit, 
  Save, 
  X, 
  Bell,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Trash2,
  Shield,
  ShieldAlert,
  User as UserIcon,
  XCircle,
  UserPlus,
  Loader2,
  Lock,
  Plus
} from 'lucide-react';
import GlobalLoader from './GlobalLoader';
import { cn } from '../lib/utils';
import { ListRow, ConfirmDialog, VerificationBadge } from './admin/AdminComponents';

import DoctorSelector from './admin/DoctorSelector';

export default function PatientManagement({ logActivity, showToast }: { 
  logActivity: (type: ActivityLog['type'], action: string, details: string) => Promise<void>,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [noticeText, setNoticeText] = useState('');
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'accounts' | 'history'>('profiles');
  const [allRegistrations, setAllRegistrations] = useState<Patient[]>([]);
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState<UserProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    title?: string;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Add form states
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newHospitalNumber, setNewHospitalNumber] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editHospitalNumber, setEditHospitalNumber] = useState('');
  const [editVerifiedBadge, setEditVerifiedBadge] = useState<'none' | 'blue' | 'black' | 'green' | 'red'>('none');

  useEffect(() => {
    // Fetch doctors
    const unsubDoctors = onSnapshot(
      query(collection(db, 'doctors'), where('status', '==', 'active')), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
        setDoctors(docs);
      }, 
      (error) => handleFirestoreError(error, OperationType.LIST, 'doctors')
    );

    // Fetch recent registrations for history (limit to 100 for performance)
    const unsubRegs = onSnapshot(
      query(collection(db, 'patients'), orderBy('createdAt', 'desc'), limit(100)), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
        setAllRegistrations(docs);
      }, 
      (error) => handleFirestoreError(error, OperationType.LIST, 'patients')
    );

    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'patient'),
      limit(200)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      // Sort in memory to avoid index requirement
      docs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setPatients(docs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    
    return () => unsubscribe();
  }, []);

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${editingPatient.name} এর তথ্য সংশোধন করতে চান?`,
      onConfirm: async () => {
        setIsUpdating(true);

        try {
          await updateDoc(doc(db, 'users', editingPatient.uid), {
            name: editName,
            mobile: editMobile,
            address: editAddress,
            doctorId: editDoctorId || null,
            hospitalNumber: editHospitalNumber,
            verifiedBadge: editVerifiedBadge,
            updatedAt: serverTimestamp()
          });

          await logActivity('user', 'পেশেন্ট তথ্য আপডেট', `${editingPatient.name} এর তথ্য সংশোধন করা হয়েছে।`);
          showToast('পেশেন্ট তথ্য সফলভাবে আপডেট করা হয়েছে।', 'success');
          setEditingPatient(null);
        } catch (err) {
          console.error(err);
          showToast('তথ্য আপডেট করা সম্ভব হয়নি।', 'error');
        } finally {
          setIsUpdating(false);
        }
      }
    });
  };

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    const user = patients.find(u => u.uid === uid);
    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user?.name || 'এই পেশেন্ট'} কে ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            isActive: !currentStatus
          });
          if (user) {
            await logActivity('user', 'ইউজার স্ট্যাটাস পরিবর্তন', `${user.name} এর অ্যাকাউন্ট ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`);
          }
          showToast(`পেশেন্ট অ্যাকাউন্ট ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`, 'success');
        } catch (err) {
          console.error(err);
          showToast('অবস্থা পরিবর্তন করা সম্ভব হয়নি।', 'error');
        }
      }
    });
  };

  const deleteUser = async (uid: string) => {
    const user = patients.find(u => u.uid === uid);
    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user?.name || 'এই পেশেন্ট'} কে মুছে ফেলতে চান? এটি শুধুমাত্র তার প্রোফাইল মুছে ফেলবে, লগইন অ্যাকাউন্টটি সিস্টেমেই থাকবে।`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid));
          if (user) {
            await logActivity('user', 'পেশেন্ট মুছে ফেলা', `${user.name} এর প্রোফাইল মুছে ফেলা হয়েছে।`);
          }
          showToast('পেশেন্ট প্রোফাইল সফলভাবে মুছে ফেলা হয়েছে।', 'success');
        } catch (err) {
          console.error(err);
          showToast('পেশেন্ট মুছে ফেলা সম্ভব হয়নি।', 'error');
        }
      }
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.toLowerCase().trim();
    const cleanEmail = newEmail.toLowerCase().trim();
    
    if (!cleanUsername) {
      setError('ইউজারনেম প্রদান করা আবশ্যক।');
      return;
    }

    if (cleanUsername.includes(' ')) {
      setError('ইউজারনেমে কোনো স্পেস (Space) থাকা যাবে না।');
      return;
    }

    // Basic validation for username
    const usernameRegex = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
    if (!usernameRegex.test(cleanUsername)) {
      setError('ইউজারনেমে শুধুমাত্র অক্ষর, সংখ্যা, ডট (.), আন্ডারস্কোর (_) এবং হাইফেন (-) ব্যবহার করা যাবে।');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${newName} কে নতুন পেশেন্ট হিসেবে যোগ করতে চান?`,
      onConfirm: async () => {
        setIsCreating(true);
        setError('');

        try {
          // Use a secondary Firebase app instance to create the user without signing out the current admin
          const secondaryApp = (getApps().find(a => a.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp'));
          const secondaryAuth = getAuth(secondaryApp);

          const res = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, newPassword);
          const uid = res.user.uid;
          await sendEmailVerification(res.user);
          
          // Sign out from the secondary app instance immediately
          await signOut(secondaryAuth);

          const defaultPermissions: UserPermissions = {
            canViewOverview: true,
            canViewDashboard: true,
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
          };

          // 2. Create user profile in Firestore
          const userProfile: UserProfile = {
            uid,
            name: newName,
            email: cleanEmail,
            username: cleanUsername,
            hospitalNumber: newHospitalNumber,
            doctorId: newDoctorId || null,
            role: 'patient',
            permissions: {
              ...defaultPermissions,
              canCreateSerial: false, // Patients can't create serials for others by default
            },
            createdAt: serverTimestamp(),
            isActive: true
          };

          await setDoc(doc(db, 'users', uid), userProfile);
          await logActivity('user', 'নতুন পেশেন্ট তৈরি', `${newName} পেশেন্ট অ্যাকাউন্ট তৈরি করা হয়েছে।`);
          
          setShowAddModal(false);
          setNewName('');
          setNewUsername('');
          setNewEmail('');
          setNewPassword('');
          setNewDoctorId('');
          showToast('পেশেন্ট অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে। অনুগ্রহ করে তাদের ইমেইল ইনবক্স চেক করতে বলুন।');
        } catch (err: any) {
          console.error(err);
          if (err.code === 'auth/email-already-in-use') {
            setError('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।');
          } else if (err.code === 'auth/operation-not-allowed') {
            setError('ইমেইল/পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করা বন্ধ আছে। দয়া করে Firebase কনসোলে (Authentication > Sign-in method) গিয়ে Email/Password চালু করুন।');
          } else {
            setError('পেশেন্ট তৈরি করা সম্ভব হয়নি। ' + (err.code || err.message));
          }
        } finally {
          setIsCreating(false);
        }
      }
    });
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${selectedPatient.name} কে এই নোটিশটি পাঠাতে চান?`,
      onConfirm: async () => {
        setIsSendingNotice(true);

        try {
          await updateDoc(doc(db, 'users', selectedPatient.uid), {
            portalNotice: noticeText,
            noticeUpdatedAt: serverTimestamp()
          });

          await logActivity('user', 'পেশেন্ট নোটিশ প্রদান', `${selectedPatient.name} কে একটি ব্যক্তিগত নোটিশ পাঠানো হয়েছে।`);
          setShowNoticeModal(false);
          setNoticeText('');
          showToast('নোটিশ সফলভাবে পাঠানো হয়েছে।');
        } catch (err) {
          console.error(err);
          showToast('নোটিশ পাঠানো সম্ভব হয়নি।');
        } finally {
          setIsSendingNotice(false);
        }
      }
    });
  };

  const filteredPatients = React.useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile?.includes(searchTerm) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const filteredRegistrations = React.useMemo(() => {
    return allRegistrations.filter(reg => 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.hospitalNumber?.includes(searchTerm)
    );
  }, [allRegistrations, searchTerm]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <GlobalLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">পেশেন্ট ম্যানেজমেন্ট</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">লগইনকৃত পেশেন্টদের তথ্য, অ্যাকাউন্ট এবং নোটিশ কন্ট্রোল</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95"
          >
            <UserPlus size={18} />
            নতুন পেশেন্ট যোগ করুন
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex p-1 bg-slate-100 rounded-none w-full md:w-fit gap-1 border border-slate-200 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('profiles')}
          className={cn(
            "px-8 py-3 rounded-none font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'profiles' 
              ? "bg-white text-blue-600 shadow-md" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={16} />
          পেশেন্ট প্রোফাইল
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={cn(
            "px-8 py-3 rounded-none font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'accounts' 
              ? "bg-white text-blue-600 shadow-md" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Shield size={16} />
          অ্যাকাউন্ট ম্যানেজ
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={cn(
            "px-8 py-3 rounded-none font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
            activeSubTab === 'history' 
              ? "bg-white text-blue-600 shadow-md" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Calendar size={16} />
          রেজিস্ট্রেশন হিস্ট্রি
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSubTab === 'history' ? (
          <div className="space-y-6">
            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-none border border-blue-100">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase">রেজিস্ট্রেশন হিস্ট্রি</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">পেশেন্টদের প্রতিদিনের সিরিয়াল ও রেজিস্ট্রেশন রেকর্ড</p>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 shadow-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-6 gap-4 p-4 bg-slate-50 border-b-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-900">
                  <div>তারিখ</div>
                  <div>সিরিয়াল</div>
                  <div>পেশেন্ট</div>
                  <div>ডাক্তার</div>
                  <div>সার্ভিস</div>
                  <div>অবস্থা</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredRegistrations.map((reg) => (
                    <ListRow
                      key={reg.id}
                      className="grid-cols-1 md:grid-cols-6 gap-3 md:gap-4 p-3 md:p-4"
                    >
                      <div className="flex justify-between items-center md:contents">
                        <div className="text-xs font-bold text-slate-600 truncate">{reg.date}</div>
                        <div className="text-xs font-black text-slate-900 truncate">#{reg.serialNumber}</div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1 truncate">
                          {reg.name}
                          <VerificationBadge badge={reg.verifiedBadge} size={12} />
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate block">{reg.hospitalNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center md:contents">
                        <div className="text-xs font-bold text-slate-600 truncate flex items-center gap-1">
                          {doctors.find(d => d.id === reg.doctorId)?.name || 'অজানা'}
                          {doctors.find(d => d.id === reg.doctorId) && (
                            <VerificationBadge badge={doctors.find(d => d.id === reg.doctorId)?.verifiedBadge} size={10} />
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-widest truncate md:block hidden">
                          {reg.service || 'General'}
                        </div>
                      </div>
                      <div className="flex justify-between items-center md:contents">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-widest truncate md:hidden">
                          {reg.service || 'General'}
                        </div>
                        <div className="truncate">
                          <span className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase tracking-widest border rounded inline-block max-w-full truncate",
                            reg.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            reg.status === 'running' ? "bg-blue-50 text-blue-600 border-blue-100 animate-pulse" :
                            reg.status === 'absent' ? "bg-red-50 text-red-600 border-red-100" :
                            "bg-slate-50 text-slate-400 border-slate-200"
                          )}>
                            {reg.status}
                          </span>
                        </div>
                      </div>
                    </ListRow>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center">
            <Users className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-6">কোনো পেশেন্ট পাওয়া যায়নি</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              <UserPlus size={18} />
              নতুন পেশেন্ট যোগ করুন
            </button>
          </div>
        ) : activeSubTab === 'profiles' ? (
          <div className="bg-white border-2 border-slate-200 shadow-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-slate-50 border-b-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-900">
              <div>পেশেন্ট</div>
              <div>কন্টাক্ট</div>
              <div>ডাক্তার</div>
              <div>জয়েনিং</div>
              <div className="text-right">অ্যাকশন</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <ListRow
                  key={patient.uid}
                  onClick={() => setSelectedPatient(patient)}
                  isSelected={selectedPatient?.uid === patient.uid}
                  className="grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 p-3 md:p-4"
                >
                  <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center text-white rounded-full shrink-0 bg-emerald-600">
                        <Users size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate flex items-center gap-1">
                          {patient.name}
                          <VerificationBadge badge={patient.verifiedBadge} size={12} />
                        </p>
                        <p className="text-slate-400 font-bold text-[10px] truncate">@{patient.username}</p>
                      </div>
                    </div>
                    
                    {/* Mobile Action Buttons */}
                    <div className="md:hidden flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPatient(patient);
                          setEditName(patient.name);
                          setEditMobile(patient.mobile || '');
                          setEditAddress(patient.address || '');
                          setEditDoctorId(patient.doctorId || '');
                          setEditVerifiedBadge(patient.verifiedBadge || 'none');
                        }} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all" 
                        title="এডিট"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedPatient(patient);
                          setNoticeText(patient.portalNotice || '');
                          setShowNoticeModal(true);
                        }} 
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all" 
                        title="নোটিশ পাঠান"
                      >
                        <Bell size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 md:contents">
                    <div className="truncate">
                      <p className="text-slate-600 font-bold text-xs truncate">{patient.mobile || 'N/A'}</p>
                      <p className="text-slate-400 font-bold text-[10px] truncate md:block hidden">{patient.email}</p>
                    </div>
                    <div className="truncate">
                      <span className="px-2 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border rounded inline-flex items-center gap-1 max-w-full truncate bg-blue-50 text-blue-600 border-blue-100">
                        {patient.doctorId ? (doctors.find(d => d.id === patient.doctorId)?.name || 'অজানা') : 'অ্যাসাইন করা হয়নি'}
                        {patient.doctorId && doctors.find(d => d.id === patient.doctorId) && (
                          <VerificationBadge badge={doctors.find(d => d.id === patient.doctorId)?.verifiedBadge} size={10} />
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="truncate text-slate-600 font-bold text-xs hidden md:block">
                    {patient.createdAt?.toDate ? patient.createdAt.toDate().toLocaleDateString('bn-BD') : 'অজানা'}
                  </div>
                  
                  <div className="text-right shrink-0 hidden md:block">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPatient(patient);
                          setEditName(patient.name);
                          setEditMobile(patient.mobile || '');
                          setEditAddress(patient.address || '');
                          setEditDoctorId(patient.doctorId || '');
                          setEditVerifiedBadge(patient.verifiedBadge || 'none');
                        }} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0" 
                        title="এডিট"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedPatient(patient);
                          setNoticeText(patient.portalNotice || '');
                          setShowNoticeModal(true);
                        }} 
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-all shrink-0" 
                        title="নোটিশ পাঠান"
                      >
                        <Bell size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSearchTerm(patient.hospitalNumber || patient.name);
                          setActiveSubTab('history');
                        }} 
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-all shrink-0" 
                        title="হিস্ট্রি দেখুন"
                      >
                        <Calendar size={16} />
                      </button>
                    </div>
                  </div>
                </ListRow>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-slate-200 shadow-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-slate-50 border-b-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-900">
              <div>পেশেন্ট</div>
              <div>ইমেইল</div>
              <div>H</div>
              <div>স্ট্যাটাস</div>
              <div className="text-right">অ্যাকশন</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredPatients.map((user) => (
                <ListRow
                  key={user.uid}
                  onClick={() => setSelectedPatient(user)}
                  isSelected={selectedPatient?.uid === user.uid}
                  className="grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 p-3 md:p-4"
                >
                  <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center text-white rounded-full shrink-0 bg-emerald-600">
                        <UserIcon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate flex items-center gap-1">
                          {user.name}
                          <VerificationBadge badge={user.verifiedBadge} size={12} />
                        </p>
                        <p className="text-slate-400 font-bold text-[10px] truncate">@{user.username}</p>
                      </div>
                    </div>
                    
                    {/* Mobile Action Buttons */}
                    <div className="md:hidden flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPatient(user);
                          setEditName(user.name);
                          setEditMobile(user.mobile || '');
                          setEditAddress(user.address || '');
                          setEditDoctorId(user.doctorId || '');
                          setEditHospitalNumber(user.hospitalNumber || '');
                          setEditVerifiedBadge(user.verifiedBadge || 'none');
                        }} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all" 
                        title="এডিট"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleUserStatus(user.uid, user.isActive); 
                        }} 
                        className={cn("p-1.5 rounded transition-all", user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")} 
                        title={user.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      >
                        <ShieldAlert size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 md:contents">
                    <div className="truncate">
                      <p className="text-slate-600 font-bold text-xs truncate">{user.email}</p>
                    </div>
                    
                    <div className="truncate text-slate-600 font-bold text-xs">
                      {user.hospitalNumber || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="truncate hidden md:block">
                    <span className={cn(
                      "px-2 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border rounded inline-block max-w-full truncate",
                      user.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>
                  
                  <div className="text-right shrink-0 hidden md:block">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingPatient(user);
                          setEditName(user.name);
                          setEditMobile(user.mobile || '');
                          setEditAddress(user.address || '');
                          setEditDoctorId(user.doctorId || '');
                          setEditVerifiedBadge(user.verifiedBadge || 'none');
                        }} 
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0" 
                        title="এডিট"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleUserStatus(user.uid, user.isActive || false); 
                        }} 
                        className={cn("p-2 rounded transition-all shrink-0", user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")} 
                        title={user.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      >
                        <ShieldAlert size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          deleteUser(user.uid); 
                        }} 
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-all shrink-0" 
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </ListRow>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Patient Modal/Inline Form */}
      {showAddModal && (
        <div className={cn(
          "z-[1000] p-6",
          "fixed inset-0 flex items-center justify-center md:static md:inset-auto md:p-0 md:bg-transparent md:backdrop-blur-none",
          "bg-slate-900/60 backdrop-blur-sm"
        )}>
          <div
            onClick={() => setShowAddModal(false)}
            className={cn("absolute inset-0 md:hidden", "bg-slate-900/60 backdrop-blur-sm")}
          />
          <div
            className={cn(
              "bg-white w-full max-w-md relative z-10 border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,0.1)] flex flex-col max-h-[90vh]",
              "md:border-2 md:shadow-none md:max-h-none"
            )}
          >
            <div className="p-6 md:p-8 border-b-2 border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">নতুন পেশেন্ট অ্যাকাউন্ট</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 md:hidden">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">নাম</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="পেশেন্টের নাম"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">হসপিটাল নম্বর (ঐচ্ছিক)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Shield size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={newHospitalNumber}
                    onChange={(e) => setNewHospitalNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="H123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইউজারনেম (Username)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.replace(/\s/g, ''))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="যেমন: patient01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ইমেইল (Email)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="example@mail.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অ্যাসোসিয়েটেড ডাক্তার (ঐচ্ছিক)</label>
                <DoctorSelector 
                  doctors={doctors}
                  allPatients={allRegistrations}
                  selectedDoctorId={newDoctorId}
                  setSelectedDoctorId={setNewDoctorId}
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      
        {editingPatient && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div
              onClick={() => setEditingPatient(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div
              className="relative w-full max-w-md bg-white border-4 border-slate-900 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 md:p-8 border-b-2 border-slate-100 shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">পেশেন্ট তথ্য এডিট</h3>
                <button onClick={() => setEditingPatient(null)} className="text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdatePatient} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">নাম</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">হসপিটাল নম্বর</label>
                  <input 
                    type="text" 
                    value={editHospitalNumber}
                    onChange={(e) => setEditHospitalNumber(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                    placeholder="H123456"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মোবাইল নম্বর</label>
                  <input 
                    type="tel" 
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ঠিকানা</label>
                  <textarea 
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">অ্যাসোসিয়েটেড ডাক্তার</label>
                  <DoctorSelector 
                    doctors={doctors}
                    allPatients={allRegistrations}
                    selectedDoctorId={editDoctorId}
                    setSelectedDoctorId={setEditDoctorId}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ভেরিফাইড ব্যাজ</label>
                  <select 
                    value={editVerifiedBadge}
                    onChange={(e) => setEditVerifiedBadge(e.target.value as 'none' | 'blue' | 'black' | 'green' | 'red')}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors appearance-none"
                  >
                    <option value="none">কোনো ব্যাজ নেই</option>
                    <option value="blue">ব্লু ব্যাজ (Blue)</option>
                    <option value="black">ব্ল্যাক ব্যাজ (Black)</option>
                    <option value="green">গ্রিন ব্যাজ (Green)</option>
                    <option value="red">রেড ব্যাজ (Red)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating} className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? <GlobalLoader size="sm" /> : <><Save size={18} /> তথ্য সেভ করুন</>}
                </button>
              </form>
            </div>
          </div>
        )}
      

      {/* Notice Modal */}
      
        {showNoticeModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div
              onClick={() => setShowNoticeModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div
              className="relative w-full max-w-md bg-white border-4 border-slate-900 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 md:p-8 border-b-2 border-slate-100 shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">ব্যক্তিগত নোটিশ</h3>
                <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500">
                <p className="text-xs font-bold text-blue-700">
                  আপনি <span className="underline">{selectedPatient?.name}</span> কে একটি ব্যক্তিগত নোটিশ পাঠাচ্ছেন যা শুধুমাত্র তার পোর্টাল ড্যাশবোর্ডে প্রদর্শিত হবে।
                </p>
              </div>

              <form onSubmit={handleSendNotice} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">নোটিশ টেক্সট</label>
                  <textarea 
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors min-h-[150px]"
                    placeholder="এখানে নোটিশটি লিখুন..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingNotice} className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSendingNotice ? <GlobalLoader size="sm" /> : <><Bell size={18} /> নোটিশ পাঠান</>}
                </button>
              </form>
              </div>
            </div>
          </div>
        )}
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        title={confirmDialog.title}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
