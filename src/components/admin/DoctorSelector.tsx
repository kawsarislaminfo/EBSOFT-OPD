import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Stethoscope } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Doctor, Patient } from '../../types';

interface DoctorSelectorProps {
  doctors: Doctor[];
  allPatients: Patient[];
  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;
  className?: string;
  showAll?: boolean;
}

export default function DoctorSelector({
  doctors,
  allPatients,
  selectedDoctorId,
  setSelectedDoctorId,
  className,
  showAll = false
}: DoctorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter doctors who have patients in the queue or show all if showAll is true
  const activeDoctors = showAll ? doctors : doctors.filter(d => allPatients.some(p => p.doctorId === d.id));
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const getPatientCount = (doctorId: string) => {
    return allPatients.filter(p => p.doctorId === doctorId).length;
  };

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

  if (activeDoctors.length === 0) {
    return (
      <div className={cn("p-4 bg-slate-50 border-2 border-dashed border-slate-200 text-center rounded-none", className)}>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">বর্তমানে কোনো রোগীর সিরিয়াল নেই</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full max-w-md", className)} ref={dropdownRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 block ml-1">
        ডাক্তার নির্বাচন করুন
      </label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 bg-white border-2 transition-all duration-300 rounded-none",
          isOpen ? "border-blue-600 shadow-xl ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300 shadow-sm"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 flex items-center justify-center transition-all",
            selectedDoctor ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
          )}>
            <Stethoscope size={20} />
          </div>
          <div className="text-left">
            <p className={cn(
              "font-black text-sm md:text-base tracking-tight leading-none mb-1",
              selectedDoctor ? "text-slate-900" : "text-slate-400"
            )}>
              {selectedDoctor?.name || "ডাক্তার নির্বাচন করুন"}
            </p>
            {selectedDoctor && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{selectedDoctor.department}</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getPatientCount(selectedDoctor.id)} জন রোগী</span>
              </div>
            )}
          </div>
        </div>
        <ChevronDown 
          size={20} 
          className={cn(
            "text-slate-400 transition-transform duration-300",
            isOpen && "rotate-180 text-blue-600"
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl z-[100] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar rounded-none"
          >
            {activeDoctors.map((doctor) => {
              const isActive = selectedDoctorId === doctor.id;
              const count = getPatientCount(doctor.id);
              
              return (
                <button
                  key={doctor.id}
                  onClick={() => {
                    setSelectedDoctorId(doctor.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 transition-all text-left border-b border-slate-50 last:border-0",
                    isActive ? "bg-blue-50/50" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={doctor.photoUrl || `https://picsum.photos/seed/${doctor.id}/100/100`} 
                      alt={doctor.name}
                      className={cn(
                        "w-10 h-10 rounded-none object-cover border-2",
                        isActive ? "border-blue-600" : "border-slate-100"
                      )}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className={cn(
                        "font-black text-sm tracking-tight leading-none mb-1",
                        isActive ? "text-blue-600" : "text-slate-900"
                      )}>
                        {doctor.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{doctor.department}</span>
                        <span className="w-1 h-1 bg-slate-100 rounded-full" />
                        <span className="text-[9px] font-bold text-blue-600/60 uppercase tracking-widest">{count} জন রোগী</span>
                      </div>
                    </div>
                  </div>
                  {isActive && <Check size={18} className="text-blue-600" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
