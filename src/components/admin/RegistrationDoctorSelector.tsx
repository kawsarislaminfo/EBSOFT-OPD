import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Stethoscope, Search, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Doctor } from '../../types';

interface RegistrationDoctorSelectorProps {
  doctors: Doctor[];
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  className?: string;
  required?: boolean;
}

export default function RegistrationDoctorSelector({
  doctors,
  selectedDoctorId,
  setSelectedDoctorId,
  className,
  required = false
}: RegistrationDoctorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const today = dayMap[new Date().getDay()];

  const activeDoctors = doctors.filter(d => d.status !== 'inactive');
  const scheduledDoctors = activeDoctors.filter(d => d.availableDays?.includes(today));
  const selectedDoctor = activeDoctors.find(d => d.id === selectedDoctorId);

  const filteredDoctors = scheduledDoctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.degree.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-700 font-black text-base sm:text-sm uppercase tracking-widest mb-0.5 sm:mb-1 ml-1">
        <Stethoscope size={14} className="sm:w-4 sm:h-4" />
        ডাক্তার নির্বাচন করুন {required && <span className="text-red-500">*</span>}
      </div>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 border-2 transition-all duration-300 rounded-none text-left",
          isOpen ? "border-indigo-600 bg-white shadow-xl ring-4 ring-indigo-50" : "border-slate-200 hover:border-slate-300 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all overflow-hidden border-2",
            selectedDoctor ? "bg-indigo-600 border-indigo-400" : "bg-slate-200 border-slate-300 text-slate-400"
          )}>
            {selectedDoctor?.photoUrl ? (
              <img 
                src={selectedDoctor.photoUrl} 
                alt={selectedDoctor.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={18} className={cn("sm:w-6 sm:h-6", selectedDoctor ? "text-white" : "text-slate-400")} />
            )}
          </div>
          <div>
            <p className={cn(
              "font-black text-sm sm:text-base tracking-tight leading-none mb-0.5 sm:mb-1",
              selectedDoctor ? "text-slate-900" : "text-slate-400"
            )}>
              {selectedDoctor?.name || "ডাক্তার নির্বাচন করুন"}
            </p>
            {selectedDoctor && (
              <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-[0.2em]">
                {selectedDoctor.department}
              </span>
            )}
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={cn(
            "text-slate-400 transition-transform duration-300 sm:w-5 sm:h-5",
            isOpen && "rotate-180 text-indigo-600"
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl z-[100] overflow-hidden rounded-none"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="ডাক্তার খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor) => {
                  const isActive = selectedDoctorId === doctor.id;
                  
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(doctor.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-1.5 sm:p-2 transition-all text-left border-b border-slate-50 last:border-0 group",
                        isActive ? "bg-indigo-50/50" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 overflow-hidden border-2 transition-all",
                          isActive ? "border-indigo-600" : "border-slate-100 group-hover:border-indigo-200"
                        )}>
                          <img 
                            src={doctor.photoUrl || `https://picsum.photos/seed/${doctor.id}/100/100`} 
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className={cn(
                            "font-black text-xs sm:text-sm tracking-tight leading-none mb-1",
                            isActive ? "text-indigo-600" : "text-slate-900"
                          )}>
                            {doctor.name}
                          </p>
                          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                            {doctor.department}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-6 h-6 bg-indigo-600 text-white flex items-center justify-center rounded-none">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-10 text-center text-slate-400 font-bold italic">
                  কোনো ডাক্তার পাওয়া যায়নি
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
