import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X, ShieldCheck, ChevronRight } from 'lucide-react';
import { VerificationBadge } from './admin/AdminComponents';
import { Doctor } from '../types';
import { cn } from '../lib/utils';

interface DoctorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  activeDoctor: Doctor | null;
  onSelect: (doctor: Doctor) => void;
}

const DoctorSelectionModal: React.FC<DoctorSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  doctors, 
  activeDoctor, 
  onSelect 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-none shadow-2xl max-w-7xl w-full overflow-hidden flex flex-col max-h-[85vh] border-4 border-blue-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-4 border-blue-600 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2 text-white">
                  <Users size={24} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">ডাক্তার নির্বাচন করুন</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all active:scale-90"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50">
              {doctors.map((doc) => (
                <motion.button
                  key={`modal-doc-${doc.id}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelect(doc)}
                  className={cn(
                    "flex flex-col p-5 border-2 transition-all relative group overflow-hidden bg-white rounded-2xl",
                    activeDoctor?.id === doc.id 
                      ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xl" 
                      : "border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <img 
                        src={doc.photoUrl || `https://picsum.photos/seed/${doc.id}/400/400`} 
                        alt={doc.name}
                        loading="lazy"
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
                      />
                      {activeDoctor?.id === doc.id && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-1 rounded-full border-2 border-white">
                          <ShieldCheck size={12} />
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-lg text-slate-900 leading-tight">
                          {doc.name}
                        </h3>
                        <VerificationBadge badge={doc.verifiedBadge} size={14} />
                      </div>
                      <p className="text-blue-600 font-semibold text-xs uppercase tracking-wider">{doc.department}</p>
                    </div>
                  </div>
                  
                  <div className="text-left w-full space-y-3 mb-4 flex-1">
                    <p className="text-slate-500 text-xs font-medium italic line-clamp-2">{doc.degree}</p>
                    
                    <div className="flex flex-wrap gap-2">
                       <div className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
                         রুম: {doc.roomNumber || 'N/A'}
                       </div>
                       <div className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600 truncate max-w-[120px]">
                         {doc.schedule}
                       </div>
                    </div>
                  </div>
                  
                  <div className="w-full pt-4 border-t border-slate-100">
                    <div className={cn(
                      "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2",
                      activeDoctor?.id === doc.id 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white"
                    )}>
                      <span>{activeDoctor?.id === doc.id ? 'নির্বাচিত' : 'নির্বাচন করুন'}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="p-4 bg-blue-600 text-white text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sajeda Jabbar Hospital • Live Sync System</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(DoctorSelectionModal);
