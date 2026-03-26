import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Menu, 
  HelpCircle, 
  ArrowRight, 
  Users, 
  Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { iconMap } from '../../lib/icons';
import { AppSettings } from '../../types';

interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSystemTab: (tab: string) => void;
  setUserTab: (tab: string) => void;
  settings: AppSettings | null;
  canViewOverview: boolean;
  canViewDashboard: boolean;
  canViewOpdDashboard: boolean;
  canViewRegistration: boolean;
  canViewLive: boolean;
  canViewDoctors: boolean;
  canViewPatients: boolean;
  canManageSettings: boolean;
  canViewProfile: boolean;
  canManageUsers: boolean;
  canManagePatients: boolean;
  userProfile: any;
  isSuperAdmin: boolean;
}

export default function MobileNavigation({ 
  activeTab, 
  setActiveTab, 
  setSystemTab, 
  setUserTab, 
  settings,
  canViewOverview,
  canViewDashboard,
  canViewOpdDashboard,
  canViewRegistration,
  canViewLive,
  canViewDoctors,
  canViewPatients,
  canManageSettings,
  canViewProfile,
  canManageUsers,
  canManagePatients,
  userProfile,
  isSuperAdmin
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (settings?.mobileNavEnabled === false) return null;

  const renderNavIcon = (iconValue: string | undefined, defaultIcon: string, size = 20) => {
    const value = iconValue || defaultIcon;
    if (value.startsWith('http')) {
      return <img src={value} alt="icon" style={{ width: size, height: size }} className="object-contain" referrerPolicy="no-referrer" />;
    }
    const Icon = iconMap[value] || iconMap[defaultIcon] || HelpCircle;
    return <Icon size={size} />;
  };

  const navItems = [
    { id: 'dashboard-opd-summary', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.doctorOverview, 'Activity', size), label: settings?.mobileNavNicknames?.doctorOverview || 'ওভারভিউ', visible: (settings?.mobileNavItems?.doctorOverview !== false) && canViewOverview && (!settings?.hiddenSections?.['dashboard-opd-summary'] || isSuperAdmin) },
    { id: 'opd-summary', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.opdSummary, 'FileText', size), label: settings?.mobileNavNicknames?.opdSummary || 'ওপিডি সামারি', visible: (settings?.mobileNavItems?.opdSummary !== false) && canViewOpdDashboard && (!settings?.hiddenSections?.['opd-summary'] || isSuperAdmin) },
    { id: 'dashboard-overview', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.dashboard, 'LayoutDashboard', size), label: settings?.mobileNavNicknames?.dashboard || 'ড্যাশবোর্ড', visible: (settings?.mobileNavItems?.dashboard !== false) && canViewOpdDashboard && (!settings?.hiddenSections?.['dashboard-overview'] || isSuperAdmin) },
    { id: 'registration', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.registration, 'UserPlus', size), label: settings?.mobileNavNicknames?.registration || 'রেজিস্ট্রেশন', visible: (settings?.mobileNavItems?.registration !== false) && canViewRegistration && (!settings?.hiddenSections?.['registration'] || isSuperAdmin) },
    { id: 'management', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.patient, 'Users', size), label: settings?.mobileNavNicknames?.patient || 'লাইভ', visible: (settings?.mobileNavItems?.patient !== false) && canViewLive && (!settings?.hiddenSections?.['management'] || isSuperAdmin) },
    { id: 'doctors-department', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.doctor, 'Stethoscope', size), label: settings?.mobileNavNicknames?.doctor || 'ডাক্তার', visible: (settings?.mobileNavItems?.doctor !== false) && canViewDoctors && (!settings?.hiddenSections?.['doctors-management'] || isSuperAdmin) },
    { id: 'system-settings', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.settings, 'Settings', size), label: settings?.mobileNavNicknames?.settings || 'সেটিিংস', visible: (settings?.mobileNavItems?.settings !== false) && canManageSettings && (!settings?.hiddenSections?.['system-settings'] || isSuperAdmin) },
    { id: 'user-management', icon: (size?: number) => renderNavIcon(settings?.mobileNavIcons?.account, 'UserIcon', size), label: settings?.mobileNavNicknames?.account || ((canManageUsers || canManagePatients) ? 'ইউজার ম্যানেজমেন্ট' : 'প্রোফাইল'), visible: settings?.mobileNavItems?.account !== false && (canViewProfile || canManageUsers || canManagePatients) && (!settings?.hiddenSections?.['user-management'] || isSuperAdmin) },
  ].filter(item => item.visible);

  const handleNavClick = (id: string) => {
    setIsOpen(false);
    if (id === 'system-settings') {
      setActiveTab('system-settings');
      setSystemTab('profile');
    } else if (id === 'user-management') {
      setActiveTab('user-management');
      setUserTab(canViewProfile || canManageUsers || !canManagePatients ? 'my-profile' : 'patient-management');
    } else {
      setActiveTab(id);
    }
  };

  const navStyle = settings?.mobileNavStyle || 'bottom-bar';
  const isBottomBar = navStyle.startsWith('bottom-bar');
  const isAnimated = settings?.mobileNavAnimation !== false;

  if (isBottomBar) {
    const getBottomBarContainerStyles = () => {
      switch (navStyle) {
        case 'bottom-bar-modern':
          return "bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-100";
        case 'bottom-bar-glass':
          return "bg-white/70 backdrop-blur-xl border-t border-white/50 shadow-[0_-4px_30px_rgba(0,0,0,0.05)]";
        case 'bottom-bar-neon':
          return "bg-slate-900 border-t border-blue-500/30 shadow-[0_-4px_20px_rgba(59,130,246,0.15)]";
        case 'bottom-bar-pill':
          return "bg-white rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 mb-4 mx-4";
        case 'bottom-bar-floating':
          return "bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 mb-4 mx-4";
        case 'bottom-bar-minimal':
          return "bg-white/90 border-t border-slate-200/50 backdrop-blur-sm";
        case 'bottom-bar-curved':
          return "bg-white rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border border-slate-100 mb-2 mx-2";
        case 'bottom-bar-detached':
          return "bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 mb-6 mx-6";
        case 'bottom-bar-gradient':
          return "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 shadow-[0_-10px_40px_rgba(59,130,246,0.2)]";
        case 'bottom-bar-material':
          return "bg-slate-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-slate-200";
        case 'bottom-bar-ios':
          return "bg-white/80 backdrop-blur-2xl border-t border-slate-200/50 shadow-[0_-1px_0_rgba(0,0,0,0.05)]";
        case 'bottom-bar-3d':
          return "bg-slate-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_-4px_20px_rgba(0,0,0,0.1)] border-t border-slate-200";
        case 'bottom-bar':
        default:
          return "bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]";
      }
    };

    const getBottomBarItemStyles = (isActive: boolean) => {
      switch (navStyle) {
        case 'bottom-bar-modern':
          return isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600";
        case 'bottom-bar-glass':
          return isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700";
        case 'bottom-bar-neon':
          return isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-slate-500 hover:text-slate-300";
        case 'bottom-bar-pill':
        case 'bottom-bar-floating':
          return isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600";
        case 'bottom-bar-minimal':
          return isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600";
        case 'bottom-bar-curved':
        case 'bottom-bar-detached':
        case 'bottom-bar-material':
        case 'bottom-bar-ios':
        case 'bottom-bar-3d':
          return isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600";
        case 'bottom-bar-gradient':
          return isActive ? "text-white drop-shadow-md" : "text-white/60 hover:text-white/80";
        case 'bottom-bar':
        default:
          return isActive ? "text-blue-600" : "text-slate-400";
      }
    };

    const renderIndicator = (isActive: boolean) => {
      if (!isActive) return null;
      
      switch (navStyle) {
        case 'bottom-bar-modern':
          return <motion.div layoutId="bottom-indicator" className="absolute -bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />;
        case 'bottom-bar-glass':
          return <motion.div layoutId="bottom-indicator" className="absolute inset-0 bg-blue-500/10 rounded-xl -z-10" />;
        case 'bottom-bar-neon':
          return <motion.div layoutId="bottom-indicator" className="absolute top-0 w-1/2 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] rounded-b-full" />;
        case 'bottom-bar-pill':
        case 'bottom-bar-floating':
          return <motion.div layoutId="bottom-indicator" className="absolute inset-0 bg-blue-50 rounded-xl -z-10" />;
        case 'bottom-bar-minimal':
          return <motion.div layoutId="bottom-indicator" className="absolute top-0 w-full h-0.5 bg-slate-900" />;
        case 'bottom-bar-curved':
          return <motion.div layoutId="bottom-indicator" className="absolute -top-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />;
        case 'bottom-bar-detached':
          return <motion.div layoutId="bottom-indicator" className="absolute inset-0 bg-blue-50 rounded-2xl -z-10" />;
        case 'bottom-bar-gradient':
          return <motion.div layoutId="bottom-indicator" className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full" />;
        case 'bottom-bar-material':
          return <motion.div layoutId="bottom-indicator" className="absolute top-0 w-12 h-8 bg-blue-100 rounded-full -z-10 mt-1" />;
        case 'bottom-bar-ios':
          return <motion.div layoutId="bottom-indicator" className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full" />;
        case 'bottom-bar-3d':
          return <motion.div layoutId="bottom-indicator" className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl -z-10 m-1" />;
        case 'bottom-bar':
        default:
          return <motion.div layoutId="bottom-indicator" className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full" />;
      }
    };

    return (
      <motion.div 
        initial={isAnimated ? { y: 100 } : false}
        animate={{ y: 0 }}
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-[100]",
          getBottomBarContainerStyles()
        )}
      >
        <div className={cn(
          "flex items-center justify-around",
          navStyle === 'bottom-bar-pill' || navStyle === 'bottom-bar-floating' || navStyle === 'bottom-bar-curved' || navStyle === 'bottom-bar-detached' || navStyle === 'bottom-bar-3d' ? "p-1" : "p-2"
        )}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id || 
              (item.id === 'registration' && activeTab === 'registration-procedure') || 
              (item.id === 'doctors-department' && (activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports'));
            
            return (
              <button
                key={`bottom-${item.id}`} onClick={() => handleNavClick(item.id)}
                className="flex flex-col items-center gap-1 p-2 transition-all active:scale-95 flex-1 relative"
              >
                <motion.div 
                  animate={isAnimated ? { scale: isActive ? 1.1 : 1, y: isActive ? -2 : 0 } : false}
                  className={cn(
                    "transition-colors duration-300",
                    getBottomBarItemStyles(isActive)
                  )}
                >
                  {item.icon()}
                </motion.div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tighter transition-colors duration-300",
                  getBottomBarItemStyles(isActive)
                )}>
                  {item.label}
                </span>
                {renderIndicator(isActive)}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const getContainerStyles = () => {
    switch (navStyle) {
      case 'glass':
        return "bg-white/40 backdrop-blur-md border border-white/40 rounded-3xl shadow-xl";
      case 'neon':
        return "bg-slate-900 border border-blue-500/30 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)]";
      case 'pill':
        return "bg-white rounded-full shadow-lg border border-slate-100 p-1";
      case 'minimal':
        return "bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-white/20";
      case 'classic':
        return "bg-slate-900 rounded-2xl shadow-2xl";
      case 'floating':
        return "bg-transparent gap-2";
      default:
        return "bg-blue-600 rounded-3xl shadow-2xl";
    }
  };

  const getItemStyles = (isActive: boolean) => {
    switch (navStyle) {
      case 'glass':
        return isActive ? "bg-white/50 text-blue-600 shadow-sm" : "text-slate-600 hover:bg-white/20";
      case 'neon':
        return isActive ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "text-slate-400 hover:text-blue-400";
      case 'pill':
        return isActive ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50";
      case 'minimal':
        return isActive ? "text-blue-600 scale-125" : "text-slate-400";
      case 'classic':
        return isActive ? "text-white scale-125" : "text-white/40";
      case 'floating':
        return isActive ? "bg-blue-600 text-white shadow-lg scale-110" : "bg-white text-slate-500 shadow-md hover:bg-slate-50";
      default:
        return isActive ? "scale-125 text-white" : "scale-100 text-white/50";
    }
  };

  return (
    <div className="lg:hidden relative w-full shrink-0 z-[100] flex justify-center pb-2 px-4 pointer-events-none">
      <motion.div
        initial={isAnimated ? { y: 100, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "flex items-center justify-around p-2 pointer-events-auto w-full max-w-md",
          getContainerStyles()
        )}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id || 
            (item.id === 'registration' && activeTab === 'registration-procedure') || 
            (item.id === 'doctors-department' && (activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports'));
          
          return (
            <button
              key={`floating-${item.id}`} 
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "relative p-3 transition-all active:scale-90 flex items-center justify-center rounded-2xl",
                getItemStyles(isActive)
              )}
            >
              <motion.div
                animate={isAnimated ? { 
                  scale: isActive ? 1.1 : 1,
                  rotate: isActive ? [0, -10, 10, 0] : 0
                } : false}
                transition={{ duration: 0.3 }}
              >
                {item.icon()}
              </motion.div>
              
              {isActive && isAnimated && navStyle !== 'minimal' && navStyle !== 'classic' && navStyle !== 'modern' && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-current opacity-10 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {isActive && (navStyle === 'modern' || navStyle === 'classic') && (
                <div className="absolute inset-0 bg-white/20 rounded-2xl -z-10" />
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
