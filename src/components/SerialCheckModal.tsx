import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, User, Hash, Clock, Activity, ChevronRight, UserX } from 'lucide-react';
import { Patient } from '../types';
import { cn } from '../lib/utils';
import { VerificationBadge } from './admin/AdminComponents';

interface SerialCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

const SerialCheckModal: React.FC<SerialCheckModalProps> = ({ isOpen, onClose, patients }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPatients = searchQuery.trim() === '' 
    ? [] 
    : patients.filter(p => 
        p.serialNumber.toString() === searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'running': 'রানিং',
      'next': 'এরপর',
      'waiting': 'অপেক্ষমান',
      'absent': 'অনুপস্থিত'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'running': 'bg-amber-500',
      'next': 'bg-blue-500',
      'waiting': 'bg-emerald-500',
      'absent': 'bg-orange-500'
    };
    return colors[status] || 'bg-slate-500';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                  <Search size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">সিরিয়াল চেক করুন</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check Patient Status</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 bg-white">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="সিরিয়াল নম্বর বা নাম লিখুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none font-bold text-lg transition-all"
                  autoFocus
                />
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
              <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                আপনার সিরিয়াল নম্বর বা নাম দিয়ে সার্চ করুন
              </p>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4 min-h-[200px]">
              {searchQuery.trim() !== '' && filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={patient.id}
                    className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border-2 border-slate-100 shadow-sm shrink-0">
                      <span className="text-3xl font-black font-mono text-blue-600">{patient.serialNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-slate-900 truncate flex items-center gap-1">
                        {patient.name}
                        <VerificationBadge badge={patient.verifiedBadge} size={16} />
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-widest",
                          getStatusColor(patient.status)
                        )}>
                          {getStatusLabel(patient.status)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {patient.service}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {patient.status === 'running' ? (
                        <Activity className="text-amber-500 animate-pulse" size={24} />
                      ) : patient.status === 'next' ? (
                        <ChevronRight className="text-blue-500" size={24} />
                      ) : (
                        <Clock className="text-slate-300" size={24} />
                      )}
                    </div>
                  </motion.div>
                ))
              ) : searchQuery.trim() !== '' ? (
                <div className="py-12 text-center">
                  <UserX size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold italic">দুঃখিত, কোনো তথ্য পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Search size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-300 font-bold italic">সার্চ রেজাল্ট এখানে দেখাবে</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 text-center border-t">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">Sajeda Jabbar Hospital • Serial Check System</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SerialCheckModal;
