import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Search, CheckCircle2, ChevronDown, User as UserIcon, ShieldCheck, Users, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { iconMap, iconNames } from '../../lib/icons';
import { VerificationBadge } from './AdminComponents';

export const IconPickerModal = ({ isOpen, onClose, onSelect, currentIcon }: { isOpen: boolean, onClose: () => void, onSelect: (iconName: string) => void, currentIcon?: string }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredIcons = useMemo(() => {
    return iconNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200"
      >
        <div className="p-4 border-bottom border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">আইকন নির্বাচন করুন</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">মেনুর জন্য একটি আইকন বেছে নিন</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 transition-all text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-bottom border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="আইকন খুঁজুন (যেমন: Home, User, Settings...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredIcons.map((name) => {
            const Icon = iconMap[name];
            return (
              <button
                key={name}
                onClick={() => {
                  onSelect(name);
                  onClose();
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 gap-2 border transition-all group",
                  currentIcon === name 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : "bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                )}
                title={name}
              >
                <Icon size={20} className={cn("transition-transform group-hover:scale-110", currentIcon === name ? "text-white" : "text-slate-500 group-hover:text-blue-600")} />
                <span className="text-[8px] font-bold truncate w-full text-center uppercase tracking-tighter">{name}</span>
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Search size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">কোন আইকন পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const ProfileDropdown = ({ userProfile, canManageUsers, canManagePatients, canViewProfile, signOut, setActiveTab, setSystemTab, setUserTab, dropup = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 md:px-3 py-1 bg-slate-100 border border-slate-200 rounded-none hover:bg-slate-200 transition-all w-full"
      >
        <div className="w-7 h-7 bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
          {userProfile?.name?.charAt(0) || 'U'}
        </div>
        <div className="text-left flex-1">
          <p className="text-[10px] font-black text-slate-900 leading-none flex items-center gap-1">
            {userProfile?.name}
            <VerificationBadge badge={userProfile?.verifiedBadge} size={12} />
          </p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
            @{userProfile?.username || userProfile?.email?.split('@')[0]} • {userProfile?.role === 'admin' ? 'অ্যাডমিন' : 'স্টাফ'}
          </p>
        </div>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", isOpen && (dropup ? "-rotate-180" : "rotate-180"))} />
      </button>

      
        {isOpen && (
            <div
              className={cn("absolute right-0 w-48 bg-white border border-slate-200 shadow-xl z-[100] py-2", dropup ? "bottom-full mb-2" : "mt-2")}
            >
              {canViewProfile !== false && (
                <motion.button
                  onClick={() => {
                    setActiveTab('user-management');
                    setUserTab('my-profile');
                    setIsOpen(false);
                  }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all uppercase tracking-widest"
                >
                  <motion.div whileHover={{ rotate: 10 }}>
                    <UserIcon size={14} />
                  </motion.div>
                  আমার প্রোফাইল
                </motion.button>
              )}
              {canManageUsers && (
                <>
                  <motion.button
                    onClick={() => {
                      setActiveTab('user-management');
                      setUserTab('staff-users');
                      setIsOpen(false);
                    }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all uppercase tracking-widest"
                  >
                    <motion.div whileHover={{ rotate: 10 }}>
                      <ShieldCheck size={14} />
                    </motion.div>
                    স্টাফ ম্যানেজমেন্ট
                  </motion.button>
                </>
              )}
              {canManagePatients && (
                <motion.button
                  onClick={() => {
                    setActiveTab('user-management');
                    setUserTab('patient-management');
                    setIsOpen(false);
                  }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all uppercase tracking-widest"
                >
                  <motion.div whileHover={{ rotate: 10 }}>
                    <Users size={14} />
                  </motion.div>
                  পেশেন্ট ম্যানেজমেন্ট
                </motion.button>
              )}
              <div className="h-px bg-slate-100 my-1 mx-2" />
              
              {/* Advanced Settings Submenu */}
              <div className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                এডভ্যান্স সেটিংস
              </div>
              <motion.button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-black text-red-600 hover:bg-red-50 transition-all uppercase tracking-widest"
              >
                <motion.div whileHover={{ rotate: 10 }}>
                  <LogOut size={14} />
                </motion.div>
                লগ আউট
              </motion.button>
            </div>
        )}
    </div>
  );
};
