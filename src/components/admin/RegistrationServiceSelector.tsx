import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Settings, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RegistrationServiceSelectorProps {
  services: string[];
  selectedServices: string[];
  setSelectedServices: (services: string[]) => void;
  className?: string;
  required?: boolean;
}

export default function RegistrationServiceSelector({
  services,
  selectedServices,
  setSelectedServices,
  className,
  required = false
}: RegistrationServiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedService = selectedServices[0] || '';

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
      <div className="flex items-center gap-1.5 sm:gap-2 text-orange-700 font-black text-base sm:text-sm uppercase tracking-widest mb-0.5 sm:mb-1 ml-1">
        <Settings size={14} className="sm:w-4 sm:h-4" />
        সার্ভিস নির্বাচন করুন {required && <span className="text-red-500">*</span>}
      </div>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 border-2 transition-all duration-300 rounded-none text-left",
          isOpen ? "border-orange-600 bg-white shadow-xl ring-4 ring-orange-50" : "border-slate-200 hover:border-slate-300 shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all overflow-hidden border-2",
            selectedService ? "bg-orange-600 border-orange-400" : "bg-slate-200 border-slate-300 text-slate-400"
          )}>
            <Activity size={18} className={cn("sm:w-6 sm:h-6", selectedService ? "text-white" : "text-slate-400")} />
          </div>
          <div>
            <p className={cn(
              "font-black text-sm sm:text-base tracking-tight leading-none mb-0.5 sm:mb-1",
              selectedService ? "text-slate-900" : "text-slate-400"
            )}>
              {selectedService || "সার্ভিস নির্বাচন করুন"}
            </p>
            {selectedService && (
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-[0.2em]">
                নির্বাচিত সার্ভিস
              </span>
            )}
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={cn(
            "text-slate-400 transition-transform duration-300 sm:w-5 sm:h-5",
            isOpen && "rotate-180 text-orange-600"
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
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
              {services.length > 0 ? (
                services.map((service, idx) => {
                  const isActive = selectedServices.includes(service);
                  
                  return (
                    <button
                      key={`service-opt-${service}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedServices([service]);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 sm:p-4 transition-all text-left border-b border-slate-50 last:border-0 group",
                        isActive ? "bg-orange-50/50" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <p className={cn(
                          "font-black text-xs sm:text-sm tracking-tight leading-none",
                          isActive ? "text-orange-600" : "text-slate-900"
                        )}>
                          {service}
                        </p>
                      </div>
                      {isActive && (
                        <div className="w-6 h-6 bg-orange-600 text-white flex items-center justify-center rounded-none">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-10 text-center text-slate-400 font-bold italic">
                  কোনো সার্ভিস পাওয়া যায়নি
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
