import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification, updateEmail, sendPasswordResetEmail, getAuth, signOut } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { UserProfile, UserPermissions, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  X, 
  Loader2, 
  Mail, 
  Lock, 
  User as UserIcon,
  Activity,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { ListRow, ConfirmDialog, VerificationBadge } from './admin/AdminComponents';
import { cn } from '../lib/utils';

const defaultPermissions: UserPermissions = {
  // Dashboard & Overview
  canViewOverview: true,
  canViewDashboard: true,
  canViewOpdDashboard: true,
  
  // Registration & Serial
  canViewRegistration: true,
  canCreateSerial: true,
  canEditSerial: true,
  canDeleteSerial: false,
  canViewLive: true,
  
  // Doctor Management
  canViewDoctors: true,
  canManageDoctors: false,
  canViewDoctorToday: true,
  canViewDoctorSchedule: true,
  canManageProcedures: false,
  canManageDepartments: false,
  canViewPatientReports: true,
  
  // Patient Management
  canViewPatients: true,
  canManagePatients: false,
  
  // User Management
  canViewProfile: true,
  canManageUsers: false,
  canViewActivityLogs: false,
  
  // System Settings
  canManageSettings: false,
  canManageHospitalProfile: false,
  canManageDisplaySettings: false,
  canManagePatientPortal: false,
  canManageMobileNav: false,
  canManagePushNotifications: false,
  canManageWelcomePopup: false,
  canManageLoginPage: false,
  canManageBackup: false,
  canManageAppAppearance: false,
  
  // Analytics & Data
  canViewAnalytics: false,
  canExportData: false,
  canViewSystemStatus: false,
  canEditOpdSummary: false
};

const superAdminPermissions: UserPermissions = {
  // Dashboard & Overview
  canViewOverview: true,
  canViewDashboard: true,
  canViewOpdDashboard: true,
  
  // Registration & Serial
  canViewRegistration: true,
  canCreateSerial: true,
  canEditSerial: true,
  canDeleteSerial: true,
  canViewLive: true,
  
  // Doctor Management
  canViewDoctors: true,
  canManageDoctors: true,
  canViewDoctorToday: true,
  canViewDoctorSchedule: true,
  canManageProcedures: true,
  canManageDepartments: true,
  canViewPatientReports: true,
  
  // Patient Management
  canViewPatients: true,
  canManagePatients: true,
  
  // User Management
  canViewProfile: true,
  canManageUsers: true,
  canViewActivityLogs: true,
  
  // System Settings
  canManageSettings: true,
  canManageHospitalProfile: true,
  canManageDisplaySettings: true,
  canManagePatientPortal: true,
  canManageMobileNav: true,
  canManagePushNotifications: true,
  canManageWelcomePopup: true,
  canManageLoginPage: true,
  canManageBackup: true,
  canManageAppAppearance: true,
  
  // Analytics & Data
  canViewAnalytics: true,
  canExportData: true,
  canViewSystemStatus: true,
  canEditOpdSummary: true
};

const permMap: Record<string, string> = {
  // Dashboard & Overview
  canViewOverview: 'ওভারভিউ দেখা',
  canViewDashboard: 'ড্যাশবোর্ড দেখা',
  canViewOpdDashboard: 'ওপিডি ড্যাশবোর্ড দেখা',
  
  // Registration & Serial
  canViewRegistration: 'রেজিস্ট্রেশন দেখা',
  canCreateSerial: 'সিরিয়াল তৈরি',
  canEditSerial: 'সিরিয়াল এডিট',
  canDeleteSerial: 'সিরিয়াল ডিলিট',
  canViewLive: 'লাইভ দেখা',
  
  // Doctor Management
  canViewDoctors: 'ডাক্তার দেখা',
  canManageDoctors: 'ডাক্তার ম্যানেজ',
  canViewDoctorToday: 'আজকের ডাক্তার দেখা',
  canViewDoctorSchedule: 'শিডিউল দেখা',
  canManageProcedures: 'প্রসিডিওর ম্যানেজ',
  canManageDepartments: 'ডিপার্টমেন্ট ম্যানেজ',
  canViewPatientReports: 'রোগী রিপোর্ট দেখা',
  
  // Patient Management
  canViewPatients: 'পেশেন্ট দেখা',
  canManagePatients: 'পেশেন্ট ম্যানেজ',
  
  // User Management
  canViewProfile: 'প্রোফাইল দেখা',
  canManageUsers: 'ইউজার ম্যানেজ',
  canViewActivityLogs: 'অ্যাক্টিভিটি লগ দেখা',
  
  // System Settings
  canManageSettings: 'জেনারেল সেটিংস ম্যানেজ',
  canManageHospitalProfile: 'হাসপাতাল প্রোফাইল ম্যানেজ',
  canManageDisplaySettings: 'ডিসপ্লে সেটিংস ম্যানেজ',
  canManagePatientPortal: 'পেশেন্ট পোর্টাল ম্যানেজ',
  canManageMobileNav: 'মোবাইল নেভিগেশন ম্যানেজ',
  canManagePushNotifications: 'পুশ নোটিফিকেশন ম্যানেজ',
  canManageWelcomePopup: 'ওয়েলকাম পপআপ ম্যানেজ',
  canManageLoginPage: 'লগইন পেজ সেটিংস ম্যানেজ',
  canManageBackup: 'ব্যাকআপ ম্যানেজ',
  canManageAppAppearance: 'অ্যাপ অ্যাপিয়ারেন্স ম্যানেজ',
  
  // Analytics & Data
  canViewAnalytics: 'অ্যানালিটিক্স দেখা',
  canExportData: 'ডাটা এক্সপোর্ট',
  canViewSystemStatus: 'সিস্টেম স্ট্যাটাস দেখা',
  canEditOpdSummary: 'ওপিডি সামারি এডিট'
};

const permissionGroups = [
  {
    title: 'ড্যাশবোর্ড ও ওভারভিউ',
    permissions: ['canViewOverview', 'canViewDashboard', 'canViewOpdDashboard']
  },
  {
    title: 'রেজিস্ট্রেশন ও সিরিয়াল',
    permissions: ['canViewRegistration', 'canCreateSerial', 'canEditSerial', 'canDeleteSerial', 'canViewLive']
  },
  {
    title: 'ডাক্তার ম্যানেজমেন্ট',
    permissions: ['canViewDoctors', 'canManageDoctors', 'canViewDoctorToday', 'canViewDoctorSchedule', 'canManageProcedures', 'canManageDepartments', 'canViewPatientReports']
  },
  {
    title: 'পেশেন্ট ম্যানেজমেন্ট',
    permissions: ['canViewPatients', 'canManagePatients']
  },
  {
    title: 'ইউজার ম্যানেজমেন্ট',
    permissions: ['canViewProfile', 'canManageUsers', 'canViewActivityLogs']
  },
  {
    title: 'সিস্টেম সেটিংস',
    permissions: [
      'canManageSettings', 
      'canManageHospitalProfile', 
      'canManageDisplaySettings', 
      'canManagePatientPortal', 
      'canManageMobileNav', 
      'canManagePushNotifications', 
      'canManageWelcomePopup', 
      'canManageLoginPage', 
      'canManageBackup', 
      'canManageAppAppearance'
    ]
  },
  {
    title: 'অ্যানালিটিক্স ও ডাটা',
    permissions: ['canViewAnalytics', 'canExportData', 'canViewSystemStatus', 'canEditOpdSummary']
  }
];

export default function UserManagement({ logActivity, roleFilter, showToast }: { 
  logActivity: (type: ActivityLog['type'], action: string, details: string) => Promise<void>,
  roleFilter?: ('super-admin' | 'admin' | 'staff' | 'patient')[],
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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

  // Form states
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'super-admin' | 'admin' | 'staff' | 'patient'>(roleFilter?.[0] || 'staff');
  const [newVerifiedBadge, setNewVerifiedBadge] = useState<'none' | 'blue' | 'black' | 'green' | 'red'>('none');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Edit states
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'super-admin' | 'admin' | 'staff' | 'patient'>('staff');
  const [editVerifiedBadge, setEditVerifiedBadge] = useState<'none' | 'blue' | 'black' | 'green' | 'red'>('none');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(defaultPermissions);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      
      console.log("Total users in DB:", allUsers.length);
      
      // Filter by role if roleFilter is provided
      if (roleFilter && roleFilter.length > 0) {
        const filtered = allUsers.filter(u => roleFilter.includes(u.role));
        console.log("Filtered users count:", filtered.length);
        allUsers = filtered;
      }
      
      // Manual sorting to handle missing createdAt fields
      allUsers.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0) : 0;
        return dateB - dateA;
      });

      setUsers(allUsers);
      setLoading(false);
      setError('');
    }, (err) => {
      console.error("Error fetching users:", err);
      setError('ইউজার তালিকা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আপনার পারমিশন চেক করুন।');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roleFilter]);

  // Username availability check
  useEffect(() => {
    const cleanUsername = newUsername.toLowerCase().trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      const isTaken = users.some(u => u.username.toLowerCase() === cleanUsername);
      setUsernameStatus(isTaken ? 'taken' : 'available');
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, users]);

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
      message: `আপনি কি নিশ্চিত যে আপনি ${newName} কে নতুন ইউজার হিসেবে যোগ করতে চান?`,
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

          // 2. Create user profile in Firestore
          const userProfile: UserProfile = {
            uid,
            name: newName,
            email: cleanEmail,
            username: cleanUsername,
            role: newRole,
            verifiedBadge: newVerifiedBadge,
            permissions: newRole === 'super-admin' ? superAdminPermissions : (newRole === 'admin' ? {
              // Dashboard & Overview
              canViewOverview: true,
              canViewDashboard: true,
              canViewOpdDashboard: true,
              
              // Registration & Serial
              canViewRegistration: true,
              canCreateSerial: true,
              canEditSerial: true,
              canDeleteSerial: true,
              canViewLive: true,
              
              // Doctor Management
              canViewDoctors: true,
              canManageDoctors: true,
              canViewDoctorToday: true,
              canViewDoctorSchedule: true,
              canManageProcedures: true,
              canManageDepartments: true,
              canViewPatientReports: true,
              
              // Patient Management
              canViewPatients: true,
              canManagePatients: true,
              
              // User Management
              canViewProfile: true,
              canManageUsers: true,
              canViewActivityLogs: true,
              
              // System Settings
              canManageSettings: true,
              canManageHospitalProfile: true,
              canManageDisplaySettings: true,
              canManagePatientPortal: true,
              canManageMobileNav: true,
              canManagePushNotifications: true,
              canManageWelcomePopup: true,
              canManageLoginPage: true,
              canManageBackup: true,
              canManageAppAppearance: true,
              
              // Analytics & Data
              canViewAnalytics: true,
              canExportData: true,
              canViewSystemStatus: true,
              canEditOpdSummary: true
            } : defaultPermissions),
            createdAt: serverTimestamp(),
            isActive: true
          };

          await setDoc(doc(db, 'users', uid), userProfile);
          await logActivity('user', 'নতুন ইউজার তৈরি', `${newName} (${newRole === 'admin' ? 'অ্যাডমিন' : 'স্টাফ'}) অ্যাকাউন্ট তৈরি করা হয়েছে।`);
          
          setShowAddModal(false);
          setNewName('');
          setNewUsername('');
          setNewEmail('');
          setNewPassword('');
          setNewRole('staff');
          setNewVerifiedBadge('none');
        } catch (err: any) {
          console.error(err);
          if (err.code === 'auth/email-already-in-use') {
            setError('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।');
          } else if (err.code === 'auth/operation-not-allowed') {
            setError('ইমেইল/পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করা বন্ধ আছে। দয়া করে Firebase কনসোলে (Authentication > Sign-in method) গিয়ে Email/Password চালু করুন।');
          } else {
            setError('ব্যবহারকারী তৈরি করা সম্ভব হয়নি। ' + (err.code || err.message));
          }
        } finally {
          setIsCreating(false);
        }
      }
    });
  };

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    const user = users.find(u => u.uid === uid);
    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user?.name || 'এই ইউজার'} কে ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            isActive: !currentStatus
          });
          if (user) {
            await logActivity('user', 'ইউজার স্ট্যাটাস পরিবর্তন', `${user.name} এর অ্যাকাউন্ট ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`);
          }
          showToast(`অ্যাকাউন্ট ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`, 'success');
        } catch (err) {
          console.error(err);
          showToast('অবস্থা পরিবর্তন করা সম্ভব হয়নি।', 'error');
        }
      }
    });
  };

  const updatePermissions = async (uid: string, permission: keyof UserPermissions, value: boolean) => {
    const user = users.find(u => u.uid === uid);
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user.name} এর '${permMap[permission] || permission}' পারমিশন ${value ? 'চালু' : 'বন্ধ'} করতে চান?`,
      onConfirm: async () => {
        try {
          const updatedPermissions = { ...user.permissions, [permission]: value };
          await updateDoc(doc(db, 'users', uid), {
            permissions: updatedPermissions
          });
          
          await logActivity('user', 'পারমিশন আপডেট', `${user.name} এর '${permMap[permission] || permission}' পারমিশন ${value ? 'চালু' : 'বন্ধ'} করা হয়েছে।`);
          showToast('পারমিশন সফলভাবে আপডেট করা হয়েছে');
        } catch (err) {
          console.error(err);
          showToast('অনুমতি আপডেট করা সম্ভব হয়নি।');
        }
      }
    });
  };

  const changeRole = async (uid: string, newRole: 'super-admin' | 'admin' | 'staff' | 'patient') => {
    const user = users.find(u => u.uid === uid);
    const rolePermissions: UserPermissions = newRole === 'super-admin' ? superAdminPermissions : (newRole === 'admin' ? {
      // Dashboard & Overview
      canViewOverview: true,
      canViewDashboard: true,
      canViewOpdDashboard: true,
      
      // Registration & Serial
      canViewRegistration: true,
      canCreateSerial: true,
      canEditSerial: true,
      canDeleteSerial: true,
      canViewLive: true,
      
      // Doctor Management
      canViewDoctors: true,
      canManageDoctors: true,
      canViewDoctorToday: true,
      canViewDoctorSchedule: true,
      canManageProcedures: true,
      canManageDepartments: true,
      canViewPatientReports: true,
      
      // Patient Management
      canViewPatients: true,
      canManagePatients: true,
      
      // User Management
      canViewProfile: true,
      canManageUsers: true,
      canViewActivityLogs: true,
      
      // System Settings
      canManageSettings: true,
      canManageHospitalProfile: true,
      canManageDisplaySettings: true,
      canManagePatientPortal: true,
      canManageMobileNav: true,
      canManagePushNotifications: true,
      canManageWelcomePopup: true,
      canManageLoginPage: true,
      canManageBackup: true,
      canManageAppAppearance: true,
      
      // Analytics & Data
      canViewAnalytics: true,
      canExportData: true,
      canViewSystemStatus: true,
      canEditOpdSummary: true
    } : (newRole === 'patient' ? {
      // Dashboard & Overview
      canViewOverview: true,
      canViewDashboard: true,
      canViewOpdDashboard: false,
      
      // Registration & Serial
      canViewRegistration: false,
      canCreateSerial: false,
      canEditSerial: false,
      canDeleteSerial: false,
      canViewLive: false,
      
      // Doctor Management
      canViewDoctors: true,
      canManageDoctors: false,
      canViewDoctorToday: false,
      canViewDoctorSchedule: false,
      canManageProcedures: false,
      canManageDepartments: false,
      canViewPatientReports: false,
      
      // Patient Management
      canViewPatients: false,
      canManagePatients: false,
      
      // User Management
      canViewProfile: true,
      canManageUsers: false,
      canViewActivityLogs: false,
      
      // System Settings
      canManageSettings: false,
      canManageHospitalProfile: false,
      canManageDisplaySettings: false,
      canManagePatientPortal: false,
      canManageMobileNav: false,
      canManagePushNotifications: false,
      canManageWelcomePopup: false,
      canManageLoginPage: false,
      canManageBackup: false,
      canManageAppAppearance: false,
      
      // Analytics & Data
      canViewAnalytics: false,
      canExportData: false,
      canViewSystemStatus: false,
      canEditOpdSummary: false
    } : defaultPermissions));

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user?.name || 'এই ইউজার'} এর রোল পরিবর্তন করে "${newRole}" করতে চান? এর ফলে তাদের পারমিশনগুলোও পরিবর্তিত হবে।`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', uid), {
            role: newRole,
            permissions: rolePermissions
          });
          
          if (editingUser?.uid === uid) {
            setEditRole(newRole);
            setEditPermissions(rolePermissions);
          }

          if (user) {
            const roleName = newRole === 'super-admin' ? 'সুপার অ্যাডমিন' : (newRole === 'admin' ? 'অ্যাডমিন' : (newRole === 'patient' ? 'পেশেন্ট' : 'স্টাফ'));
            await logActivity('user', 'ইউজার রোল পরিবর্তন', `${user.name} এর রোল '${roleName}' এ পরিবর্তন করা হয়েছে।`);
          }
          showToast('রোল সফলভাবে পরিবর্তন করা হয়েছে।');
        } catch (err) {
          console.error(err);
          showToast('রোল পরিবর্তন করা সম্ভব হয়নি।');
        }
      }
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${editingUser.name} এর তথ্য সংশোধন করতে চান?`,
      onConfirm: async () => {
        setIsUpdating(true);
        setError('');

        try {
          const cleanEmail = editEmail.toLowerCase().trim();
          const updates: any = {
            name: editName,
            username: editUsername.toLowerCase().trim(),
            email: cleanEmail,
            role: editRole,
            verifiedBadge: editVerifiedBadge,
            permissions: editPermissions
          };

          await updateDoc(doc(db, 'users', editingUser.uid), updates);
          await logActivity('user', 'ইউজার তথ্য আপডেট', `${editingUser.name} এর তথ্য সংশোধন করা হয়েছে।`);
          
          showToast('ইউজার তথ্য সফলভাবে আপডেট করা হয়েছে।', 'success');
          setShowEditModal(false);
          setEditingUser(null);
        } catch (err: any) {
          console.error(err);
          showToast('তথ্য আপডেট করা সম্ভব হয়নি।', 'error');
          setError('তথ্য আপডেট করা সম্ভব হয়নি।');
        } finally {
          setIsUpdating(false);
        }
      }
    });
  };

  const handleBulkPermissions = async (uid: string, grantAll: boolean, presetPermissions?: UserPermissions) => {
    const user = users.find(u => u.uid === uid);
    if (!user) return;

    const action = presetPermissions ? 'রোল প্রিসেট সেট' : (grantAll ? 'সকল পারমিশন চালু' : 'সকল পারমিশন বন্ধ');

    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user.name} এর ${action} করতে চান?`,
      onConfirm: async () => {
        try {
          const newPermissions: UserPermissions = presetPermissions || {
            canViewOverview: grantAll,
            canViewDashboard: grantAll,
            canViewOpdDashboard: grantAll,
            canViewRegistration: grantAll,
            canCreateSerial: grantAll,
            canEditSerial: grantAll,
            canDeleteSerial: grantAll,
            canViewLive: grantAll,
            canViewDoctors: grantAll,
            canManageDoctors: grantAll,
            canViewPatients: grantAll,
            canManagePatients: grantAll,
            canViewPatientReports: grantAll,
            canViewActivityLogs: grantAll,
            canManageSettings: grantAll,
            canManageUsers: grantAll,
            canViewProfile: grantAll,
            canManageProcedures: grantAll,
            canManageDepartments: grantAll,
            canViewDoctorToday: grantAll,
            canViewDoctorSchedule: grantAll,
            canManageHospitalProfile: grantAll,
            canManageDisplaySettings: grantAll,
            canManagePatientPortal: grantAll,
            canManageMobileNav: grantAll,
            canManageWelcomePopup: grantAll,
            canManageLoginPage: grantAll,
            canViewAnalytics: grantAll,
            canExportData: grantAll,
            canManageBackup: grantAll,
            canManagePushNotifications: grantAll,
            canViewSystemStatus: grantAll,
            canManageAppAppearance: grantAll,
            canEditOpdSummary: grantAll
          };

          await updateDoc(doc(db, 'users', uid), {
            permissions: newPermissions
          });
          
          await logActivity('user', 'পারমিশন আপডেট', `${user.name} এর ${action} করা হয়েছে।`);
          showToast('পারমিশন সফলভাবে আপডেট করা হয়েছে');
        } catch (err) {
          console.error(err);
          showToast('অনুমতি আপডেট করা সম্ভব হয়নি।');
        }
      }
    });
  };

  const deleteUser = async (uid: string) => {
    const user = users.find(u => u.uid === uid);
    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি ${user?.name || 'এই ইউজার'} কে মুছে ফেলতে চান? এটি শুধুমাত্র তার প্রোফাইল মুছে ফেলবে, লগইন অ্যাকাউন্টটি সিস্টেমেই থাকবে।`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid));
          if (user) {
            await logActivity('user', 'ইউজার মুছে ফেলা', `${user.name} এর প্রোফাইল মুছে ফেলা হয়েছে।`);
          }
          showToast('ইউজার প্রোফাইল সফলভাবে মুছে ফেলা হয়েছে।', 'success');
        } catch (err) {
          console.error(err);
          showToast('ইউজার মুছে ফেলা সম্ভব হয়নি।', 'error');
        }
      }
    });
  };

  const handlePasswordReset = async (email: string) => {
    setConfirmDialog({
      isOpen: true,
      message: `আপনি কি নিশ্চিত যে আপনি এই ইউজারের (${email}) জন্য পাসওয়ার্ড রিসেট ইমেইল পাঠাতে চান?`,
      onConfirm: async () => {
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditVerifiedBadge(user.verifiedBadge || 'none');
    setEditPermissions(user.permissions || defaultPermissions);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  const isPatientOnly = roleFilter?.length === 1 && roleFilter[0] === 'patient';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1 md:mb-2 uppercase">
            {isPatientOnly ? 'পেশেন্ট ইউজার ম্যানেজ' : 'স্টাফ ইউজার ম্যানেজ'}
          </h2>
          <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest">
            {isPatientOnly ? 'পেশেন্ট অ্যাকাউন্ট এবং এক্সেস কন্ট্রোল' : 'স্টাফ অ্যাকাউন্ট এবং পারমিশন কন্ট্রোল'}
          </p>
        </div>
        <button
          onClick={() => {
            setNewRole(roleFilter?.[0] || 'staff');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <UserPlus size={16} className="md:w-[18px] md:h-[18px]" />
          নতুন {isPatientOnly ? 'পেশেন্ট' : 'ইউজার'} যোগ করুন
        </button>
      </div>

      <div className="bg-white border-2 border-slate-200 shadow-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-slate-50 border-b-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-900">
          <div>ইউজার</div>
          <div>ইমেইল</div>
          <div>রোল</div>
          <div>স্ট্যাটাস</div>
          <div className="text-right">অ্যাকশন</div>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <ListRow
              key={user.uid}
              onClick={() => setSelectedUserId(user.uid)}
              isSelected={user.uid === selectedUserId}
              className="grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 p-3 md:p-4"
            >
              <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center text-white rounded-full shrink-0",
                    user.role === 'super-admin' ? "bg-red-600" : (user.role === 'admin' ? "bg-slate-900" : (user.role === 'patient' ? "bg-emerald-600" : "bg-blue-600"))
                  )}>
                    <UserIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">
                      {user.name}
                      <VerificationBadge badge={user.verifiedBadge} size={14} />
                    </p>
                    <p className="text-slate-400 font-bold text-[10px] truncate">@{user.username}</p>
                  </div>
                </div>
                
                {/* Mobile Action Buttons */}
                <div className="md:hidden flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(user); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all" title="এডিট">
                    <UserIcon size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleUserStatus(user.uid, user.isActive); }} className={cn("p-1.5 rounded transition-all", user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")} title={user.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}>
                    <ShieldAlert size={14} />
                  </button>
                </div>
              </div>
              
              <div className="text-slate-600 font-bold text-xs truncate md:block hidden">{user.email}</div>
              
              <div className="flex items-center gap-2 md:contents">
                <div className="truncate">
                  <span className={cn(
                    "px-2 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border rounded inline-block max-w-full truncate",
                    user.role === 'super-admin' ? "bg-red-600 text-white border-red-600" :
                    (user.role === 'admin' ? "bg-slate-900 text-white border-slate-900" : 
                    (user.role === 'patient' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"))
                  )}>
                    {user.role === 'super-admin' ? 'সুপার অ্যাডমিন' : (user.role === 'admin' ? 'অ্যাডমিন' : (user.role === 'patient' ? 'পেশেন্ট' : 'স্টাফ'))}
                  </span>
                </div>
                <div className="truncate">
                  <span className={cn(
                    "px-2 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border rounded inline-block max-w-full truncate",
                    user.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                  )}>
                    {user.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>
              </div>
              
              <div className="text-right shrink-0 hidden md:block">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => openEditModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0" title="এডিট">
                    <UserIcon size={16} />
                  </button>
                  <button onClick={() => toggleUserStatus(user.uid, user.isActive)} className={cn("p-2 rounded transition-all shrink-0", user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")} title={user.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}>
                    <ShieldAlert size={16} />
                  </button>
                  {user.role !== 'admin' && (
                    <button 
                      onClick={() => changeRole(user.uid, 'admin')} 
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-all shrink-0" 
                      title="অ্যাডমিন করুন"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteUser(user.uid)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-all shrink-0" title="মুছে ফেলুন">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      </div>

      {/* Edit User Modal */}
      
        {showEditModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div
              className="relative w-full max-w-md bg-white border-2 border-slate-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              
              <div className="flex justify-between items-center p-6 md:p-8 border-b-2 border-slate-100 shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">ইউজার এডিট</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
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
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                      placeholder="পুরো নাম লিখুন"
                      required
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
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/\s/g, ''))}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                      placeholder="যেমন: admin"
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
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                      placeholder="example@mail.com"
                      required
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 italic ml-1">
                    * এটি শুধুমাত্র প্রোফাইল তথ্য। লগইন ইমেইল পরিবর্তন করতে ইউজারকে প্রোফাইল সেটিংস ব্যবহার করতে হবে।
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">রোল (Role)</label>
                  <select 
                    value={editRole}
                    onChange={(e) => changeRole(editingUser?.uid || '', e.target.value as any)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                  >
                    {isSuperAdmin && <option value="super-admin">সুপার অ্যাডমিন</option>}
                    <option value="admin">অ্যাডমিন</option>
                    <option value="staff">স্টাফ</option>
                    <option value="patient">পেশেন্ট</option>
                  </select>
                </div>

                {/* Granular Permissions UI */}
                <div className="space-y-4 border-2 border-slate-100 p-6 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14} className="text-blue-600" />
                      পারমিশন সেটিংস (Permissions)
                    </h4>
                    {editRole !== 'super-admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          const allTrue = Object.values(editPermissions).every(v => v === true);
                          const newPerms = { ...editPermissions };
                          Object.keys(newPerms).forEach(key => {
                            newPerms[key as keyof UserPermissions] = !allTrue;
                          });
                          setEditPermissions(newPerms);
                        }}
                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        {Object.values(editPermissions).every(v => v === true) ? 'সব মুছুন' : 'সব দিন'}
                      </button>
                    )}
                  </div>

                  {editRole === 'super-admin' ? (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-none">
                      <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                        সুপার অ্যাডমিনদের সকল পারমিশন ডিফল্টভাবে থাকে। এটি পরিবর্তন করা সম্ভব নয়।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {permissionGroups.map((group) => (
                        <div key={group.title} className="space-y-3">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                            {group.title}
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.permissions.map((key) => (
                              <label 
                                key={key} 
                                className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                              >
                                <div className="relative flex items-center">
                                  <input 
                                    type="checkbox"
                                    checked={editPermissions[key as keyof UserPermissions]}
                                    onChange={(e) => setEditPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                    className="w-4 h-4 border-2 border-slate-300 rounded-none checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer appearance-none"
                                  />
                                  {editPermissions[key as keyof UserPermissions] && (
                                    <CheckCircle2 size={10} className="absolute left-0.5 top-0.5 text-white pointer-events-none" />
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                  {permMap[key] || key}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ভেরিফাইড ব্যাজ</label>
                  <select 
                    value={editVerifiedBadge}
                    onChange={(e) => setEditVerifiedBadge(e.target.value as 'none' | 'blue' | 'black' | 'green' | 'red')}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
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
                  {isUpdating ? <Loader2 className="animate-spin" size={18} /> : 'আপডেট করুন'}
                </button>
              </form>
            </div>
          </div>
        )}
      

      {/* Add User Modal */}
      
        {showAddModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div
              className="bg-white w-full max-w-md relative z-10 border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,0.1)] flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b-2 border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">নতুন ইউজার</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert size={16} />
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
                      placeholder="ইউজারের নাম"
                      required
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
                      className={cn(
                        "w-full pl-12 pr-12 py-4 bg-slate-50 border-2 rounded-none outline-none font-bold text-slate-700 transition-all",
                        usernameStatus === 'available' ? "border-emerald-500 focus:border-emerald-600" : 
                        usernameStatus === 'taken' ? "border-red-500 focus:border-red-600" : 
                        "border-slate-200 focus:border-blue-600"
                      )}
                      placeholder="যেমন: admin"
                      required
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      {usernameStatus === 'checking' && <Loader2 size={18} className="animate-spin text-slate-400" />}
                      {usernameStatus === 'available' && <CheckCircle2 size={18} className="text-blue-600" />}
                      {usernameStatus === 'taken' && <XCircle size={18} className="text-red-500" />}
                    </div>
                  </div>
                  {usernameStatus === 'available' && <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">ইউজারনেমটি এভেইলেবল আছে</p>}
                  {usernameStatus === 'taken' && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হচ্ছে</p>}
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">রোল</label>
                  <select 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'super-admin' | 'admin' | 'staff' | 'patient')}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-none outline-none font-bold text-slate-700 focus:border-blue-600 transition-colors"
                  >
                    {isSuperAdmin && <option value="super-admin">সুপার অ্যাডমিন (Super Admin)</option>}
                    <option value="staff">স্টাফ (Staff)</option>
                    <option value="admin">অ্যাডমিন (Admin)</option>
                    <option value="patient">পেশেন্ট (Patient)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreating} className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={20} /> : 'ইউজার তৈরি করুন'}
                </button>
              </form>
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
