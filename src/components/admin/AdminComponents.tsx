import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const VerificationBadge = ({ badge, size = 12, className }: { badge?: string, size?: number, className?: string }) => {
  if (!badge || badge === 'none') return null;
  
  const badgeColors: Record<string, string> = {
    blue: "text-blue-500 fill-blue-500/20",
    black: "text-slate-900 fill-slate-900/20",
    green: "text-emerald-500 fill-emerald-500/20",
    red: "text-red-500 fill-red-500/20"
  };

  const colorClass = badgeColors[badge] || badgeColors.blue;

  return (
    <CheckCircle2 size={size} className={cn(colorClass, "inline-block ml-1 shrink-0", className)} />
  );
};

interface ListRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  grid?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({ 
  children, 
  onClick, 
  isSelected,
  className,
  grid = true
}) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className={cn(
      grid ? "grid" : "flex",
      "gap-4 p-2.5 items-center transition-all duration-200 border-2 cursor-pointer",
      isSelected ? "bg-blue-50 border-blue-500" : "bg-white border-slate-200 hover:border-blue-500",
      className
    )}
  >
    {children}
  </motion.div>
);

export const StatCard = ({ 
  icon, 
  label, 
  value, 
  trend, 
  color, 
  accentColor, 
  isGradient = true,
  onClick,
  isActive = false
}: { 
  icon: React.ReactNode, 
  label: string, 
  value: number | string, 
  trend: string, 
  color: string, 
  accentColor: string, 
  isGradient?: boolean,
  onClick?: () => void,
  isActive?: boolean
}) => {
  return (
    <div
      onClick={onClick} className={cn(
        "relative overflow-hidden p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl md:rounded-2xl border transition-all cursor-pointer",
        isActive ? "ring-4 ring-blue-500 ring-offset-2" : "",
        isGradient ? color : "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        !isGradient && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-slate-50/50",
        isActive ? "border-blue-500" : "border-slate-200/60"
      )}>
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between mb-1 md:mb-1.5 text-center md:text-left">
        <div className={cn(
          "w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 rounded-md sm:rounded-lg md:rounded-xl flex items-center justify-center shadow-sm border mb-0.5 sm:mb-1 md:mb-0",
          isGradient ? "bg-white/20 border-white/20 text-white" : cn("bg-white border-slate-100", accentColor)
        )}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-2.5 h-2.5 md:w-4 md:h-4" })}
        </div>
        <div className="flex flex-col items-center md:items-end">
          <span className={cn("text-[7px] sm:text-[8px] md:text-[9px] font-bold uppercase tracking-widest mb-0.5 md:mb-0.5", isGradient ? "text-white/70" : "text-slate-400")}>{label}</span>
          <h4 className={cn("text-xs sm:text-sm md:text-base font-black tracking-tight", isGradient ? "text-white" : "text-slate-900")}>{value}</h4>
        </div>
      </div>
      
      <div className={cn("relative z-10 flex items-center justify-between pt-1 sm:pt-1.5 md:pt-1.5 border-t", isGradient ? "border-white/10" : "border-slate-50")}>
        <div className="flex items-center gap-1">
          <div className={cn("w-1 h-1 md:w-1 md:h-1 rounded-full animate-pulse", isGradient ? "bg-white" : accentColor.replace('text-', 'bg-'))} />
          <span className={cn("text-[6px] sm:text-[7px] md:text-[8px] font-bold uppercase tracking-wider", isGradient ? "text-white/60" : "text-slate-500")}>{trend}</span>
        </div>
        <div className={cn("h-0.5 md:h-0.5 w-4 sm:w-6 md:w-10 rounded-full overflow-hidden", isGradient ? "bg-white/10" : "bg-slate-100")}>
          <div className={cn("h-full w-2/3 rounded-full", isGradient ? "bg-white" : accentColor.replace('text-', 'bg-'))} />
        </div>
      </div>
    </div>
  );
};

export const NavItem = ({ icon, label, active, onClick, sub }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, sub?: boolean }) => (
  <button
    onClick={onClick} className={cn(
      "flex items-center gap-5 px-6 py-5 w-full rounded-none transition-all text-[15px] font-black uppercase tracking-widest relative group",
      sub && "py-3 px-8 text-[13px] gap-4",
      active 
        ? "text-blue-600 bg-blue-50 shadow-sm" 
        : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
    )}>
    <span className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>
      {icon}
    </span>
    <span className="tracking-wide">{label}</span>
    {active && (
      <div
        className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
      />
    )}
  </button>
);

export const ConfirmDialog = ({ 
  isOpen, 
  message, 
  onConfirm, 
  onCancel,
  title = "নিশ্চিত করুন",
  confirmText = "হ্যাঁ, নিশ্চিত",
  cancelText = "বাতিল"
}: { 
  isOpen: boolean, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  title?: string,
  confirmText?: string,
  cancelText?: string
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 md:p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 font-medium text-sm mb-8">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
