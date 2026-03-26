import React from 'react';
import { Activity, ChevronRight, UserX, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Patient, AppSettings } from '../types';
import { VerificationBadge } from './admin/AdminComponents';

interface PatientCardProps {
  patient: Patient;
  index: number;
  settings: AppSettings;
  showService?: boolean;
}

const PatientCard = React.forwardRef<HTMLDivElement, PatientCardProps>(({ patient, index, settings, showService }, ref) => {
  const isRunning = patient.status === 'running';
  const isNext = patient.status === 'next';
  const isAbsent = patient.status === 'absent';

  const getStatusLabel = () => {
    if (isRunning) return 'রানিং';
    if (isNext) return 'এরপর';
    if (isAbsent) return 'অনুপস্থিত';
    return 'অপেক্ষমান';
  };

  const getStatusIcon = () => {
    if (isRunning) return <Activity className="w-6 h-6" />;
    if (isNext) return <ChevronRight className="w-6 h-6" />;
    if (isAbsent) return <UserX className="w-6 h-6" />;
    return null;
  };

  const bgColor = isRunning 
    ? (settings?.runningPatientBg || '#fbbf24')
    : isNext
    ? (settings?.nextPatientBg || '#3b82f6')
    : isAbsent
    ? (settings?.absentPatientBg || '#f97316')
    : (settings?.waitingPatientBg || '#10b981');

  const textColor = isRunning 
    ? (settings?.runningPatientText || '#0f172a') 
    : isNext
    ? (settings?.nextPatientText || '#ffffff')
    : isAbsent
    ? (settings?.absentPatientText || '#ffffff')
    : (settings?.waitingPatientText || '#ffffff');

  return (
    <div
      ref={ref}
      className={cn(
        "relative group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 will-change-transform transform-gpu",
        isRunning ? "shadow-lg scale-[1.01] z-10" : "shadow-sm"
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: isRunning ? 'white' : 'transparent',
      }}
    >
      {/* Serial Number Block */}
      <div className="flex-shrink-0 w-14 h-14 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
        <span className="text-3xl md:text-5xl font-black font-mono tracking-tighter">{patient.serialNumber}</span>
      </div>

      {/* Patient Info */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-3xl font-black truncate leading-tight flex items-center gap-1">
            {patient.name}
            <VerificationBadge badge={patient.verifiedBadge} size={24} />
          </span>
          {isRunning && (
            <span className="flex h-2 w-2 md:h-3 md:w-3 rounded-full bg-white" />
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
          {showService && (
            <span className="px-1.5 py-0.5 bg-black/10 rounded text-[8px] md:text-[10px] font-black uppercase tracking-widest">
              {patient.service}
            </span>
          )}
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            ID: {patient.id.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex flex-col items-end gap-1">
        <div className={cn(
          "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-black uppercase tracking-widest text-sm md:text-xl bg-white/20 border border-white/30",
          isRunning && "bg-white/40"
        )}>
          <span>{getStatusLabel()}</span>
          {getStatusIcon()}
        </div>
      </div>

      {/* Subtle Shine Effect for Running Patient */}
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-white/10" />
        </div>
      )}
    </div>
  );
});

PatientCard.displayName = 'PatientCard';

export default React.memo(PatientCard);
