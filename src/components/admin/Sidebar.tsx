import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { Stethoscope, X, Calendar as CalendarIcon, Monitor, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProfileDropdown } from './AdminModals';
import { SUPER_ADMIN_EMAILS } from '../../constants';

const iconMap: { [key: string]: any } = LucideIcons;

function NavItem({ iconName, label, active, onClick, isSidebarOpen }: { iconName: string, label: string, active: boolean, onClick: () => void, isSidebarOpen: boolean }) {
  const IconComponent = iconMap[iconName] || LucideIcons.Stethoscope;
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center rounded-none transition-all font-black uppercase tracking-widest text-[10px]",
        isSidebarOpen ? "gap-2.5 px-2.5 py-1.5" : "justify-center py-2.5",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      )}
    >
      <div className="shrink-0">
        <IconComponent size={20} />
      </div>
      {isSidebarOpen && label}
    </button>
  );
}

function NavSubItem({ iconName, label, active, onClick, isSidebarOpen }: any) {
  const IconComponent = iconMap[iconName] || LucideIcons.Circle;
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center rounded-none transition-all font-bold uppercase tracking-widest text-[10px]",
        isSidebarOpen ? "gap-2 pl-7 pr-2.5 py-1.5" : "justify-center py-1.5",
        active 
          ? "text-blue-400 bg-blue-900/30 border-l-2 border-blue-500" 
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      <IconComponent size={12} />
      {isSidebarOpen && label}
    </button>
  );
}

export default function Sidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  settings, 
  canViewDashboard, 
  canCreateSerial, 
  canEditSerial, 
  canManageDoctors, 
  canManageSettings, 
  canManagePatients,
  canViewActivityLogs,
  canManageUsers,
  canViewProfile,
  canViewRegistration,
  canViewDoctorToday,
  canViewDoctorSchedule,
  canManageProcedures,
  canManageDepartments,
  canViewPatientReports,
  canManageHospitalProfile,
  canManageDisplaySettings,
  canManagePatientPortal,
  canManageMobileNav,
  canManagePushNotifications,
  canManageWelcomePopup,
  canManageLoginPage,
  canManageBackup,
  canManageAppAppearance,
  canViewAnalytics,
  canExportData,
  canViewSystemStatus,
  activeTab, 
  systemTab, 
  userTab,
  setActiveTab, 
  setSystemTab, 
  setUserTab, 
  selectedDate, 
  setSelectedDate,
  userProfile,
  signOut
}: any) {
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(activeTab === 'system-settings');
  const [isDoctorsExpanded, setIsDoctorsExpanded] = useState(
    activeTab === 'doctors-list' || 
    activeTab === 'doctors-today' || 
    activeTab === 'doctors-schedule' || 
    activeTab === 'doctors-department' || 
    activeTab === 'doctors-procedure' ||
    activeTab === 'doctors-patient-reports'
  );
  const [isUserExpanded, setIsUserExpanded] = useState(activeTab === 'user-management');

  useEffect(() => {
    if (activeTab === 'system-settings') {
      setIsSettingsExpanded(true);
      setIsDoctorsExpanded(false);
      setIsUserExpanded(false);
    } else if (
      activeTab === 'doctors-list' || 
      activeTab === 'doctors-today' || 
      activeTab === 'doctors-schedule' || 
      activeTab === 'doctors-department' || 
      activeTab === 'doctors-procedure' ||
      activeTab === 'doctors-patient-reports'
    ) {
      setIsDoctorsExpanded(true);
      setIsSettingsExpanded(false);
      setIsUserExpanded(false);
    } else if (activeTab === 'user-management') {
      setIsUserExpanded(true);
      setIsSettingsExpanded(false);
      setIsDoctorsExpanded(false);
    } else {
      setIsSettingsExpanded(false);
      setIsDoctorsExpanded(false);
      setIsUserExpanded(false);
    }
  }, [activeTab]);

  const doctorManagementSubItems = [
    { id: 'doctors-list', label: 'ডাক্তার তালিকা', icon: 'Users', show: canManageDoctors },
    { id: 'doctors-today', label: 'আজকের ডাক্তার', icon: 'Clock', show: canViewDoctorToday },
    { id: 'doctors-schedule', label: 'শিডিউল', icon: 'Calendar', show: canViewDoctorSchedule },
    { id: 'doctors-department', label: 'ডিপার্টমেন্ট', icon: 'Building2', show: canManageDepartments },
    { id: 'doctors-procedure', label: 'প্রসিডিউর', icon: 'Activity', show: canManageProcedures },
    { id: 'doctors-patient-reports', label: 'রোগী রিপোর্ট', icon: 'FileText', show: canViewPatientReports },
  ].filter(item => item.show);

  const systemSettingsSubItems = [
    { id: 'profile', label: 'হাসপাতাল প্রোফাইল', icon: 'Building2', show: canManageHospitalProfile },
    { id: 'display', label: 'ডিসপ্লে সেটিংস', icon: 'Monitor', show: canManageDisplaySettings },
    { id: 'patient-portal', label: 'পেশেন্ট পোর্টাল সেটিংস', icon: 'Users', show: canManagePatientPortal },
    { id: 'mobile-nav', label: 'মোবাইল নেভিগেশন', icon: 'Menu', show: canManageMobileNav },
    { id: 'push-notifications', label: 'পুশ নোটিফিকেশন', icon: 'BellRing', show: canManagePushNotifications },
    { id: 'data-backup', label: 'ডেটা ব্যাকআপ', icon: 'Database', show: canManageBackup },
    { id: 'welcome-popup', label: 'ওয়েলকাম পপআপ', icon: 'Sparkles', show: canManageWelcomePopup },
    { id: 'login-settings', label: 'লগইন পেজ সেটিংস', icon: 'LogIn', show: canManageLoginPage },
    { id: 'opd-summary-settings', label: 'সামারি সেটিংস', icon: 'FileText', show: canManageSettings },
  ].filter(item => item.show);

  const userManagementSubItems = [
    { id: 'my-profile', label: 'আমার প্রোফাইল', icon: 'UserCircle', show: canViewProfile },
    { id: 'staff-users', label: 'স্টাফ ম্যানেজমেন্ট', icon: 'ShieldCheck', show: canManageUsers },
    { id: 'patient-management', label: 'পেশেন্ট ম্যানেজমেন্ট', icon: 'Users', show: canManagePatients },
  ].filter(item => item.show);
  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 bg-slate-900 text-white flex flex-col z-[300] shadow-[0_0_40px_rgba(0,0,0,0.5)] border-r border-slate-800 transition-all duration-300 lg:relative lg:inset-auto",
      isSidebarOpen ? "w-56 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"
    )}>
      <div className={cn("border-b border-slate-800 flex items-center", isSidebarOpen ? "p-5 justify-between" : "p-4 justify-center")}>
        <div className={cn("flex items-center", isSidebarOpen ? "gap-4" : "")}>
          {settings?.hospitalLogo ? (
            <div className="p-1 bg-gradient-to-br from-white to-slate-50 rounded-none shadow-xl border border-slate-100">
              <img src={settings.hospitalLogo} alt="Logo" className="w-10 h-10 rounded-none object-cover" />
            </div>
          ) : (
            <div className="p-3 rounded-none shadow-xl bg-blue-600 border border-blue-500">
              <Stethoscope size={24} className="text-white" />
            </div>
          )}
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-white">
                ড্যাশবোর্ড
              </h1>
            </div>
          )}
        </div>
        {isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1.5 overflow-y-auto custom-scrollbar", isSidebarOpen ? "p-3" : "p-2")}>
        {/* Mobile Date Search */}
        <div className="lg:hidden mb-6 px-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">তারিখ অনুযায়ী সার্চ</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <CalendarIcon size={16} />
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-none pl-10 pr-4 py-3 text-slate-700 font-bold focus:border-blue-500 outline-none shadow-sm transition-all cursor-pointer text-sm"
            />
          </div>
        </div>

        {canViewDashboard && (
          <NavItem 
            iconName={settings?.menuItems?.doctorOverview?.icon || "Stethoscope"} 
            label={settings?.menuItems?.doctorOverview?.label || "ডাক্তার ওভারভিউ"} 
            active={activeTab === 'dashboard-opd-summary'} 
            isSidebarOpen={isSidebarOpen}
            onClick={() => {
              setActiveTab('dashboard-opd-summary');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }} 
          />
        )}

        {canViewDashboard && (
          <NavItem 
            iconName={settings?.menuItems?.dashboard?.icon || "LayoutDashboard"} 
            label={settings?.menuItems?.dashboard?.label || "ওপিডি ড্যাশবোর্ড"} 
            active={activeTab === 'dashboard-overview'} 
            isSidebarOpen={isSidebarOpen}
            onClick={() => {
              setActiveTab('dashboard-overview');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }} 
          />
        )}

        {canViewDashboard && (
          <NavItem 
            iconName="FileText" 
            label="অপিডি সামারি" 
            active={activeTab === 'opd-summary'} 
            isSidebarOpen={isSidebarOpen}
            onClick={() => {
              setActiveTab('opd-summary');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }} 
          />
        )}

        {canViewRegistration && (
          <NavItem 
            iconName={settings?.menuItems?.registration?.icon || "UserPlus"} 
            label={settings?.menuItems?.registration?.label || "রেজিস্ট্রেশন"} 
            active={activeTab === 'registration' || activeTab === 'registration-procedure'} 
            isSidebarOpen={isSidebarOpen}
            onClick={() => {
              setActiveTab('registration');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }} 
          />
        )}
        
        {(canEditSerial || canCreateSerial) && (
          <NavItem 
            iconName={settings?.menuItems?.liveSerial?.icon || "ListOrdered"} 
            label={settings?.menuItems?.liveSerial?.label || "লাইভ সিরিয়াল"} 
            active={activeTab === 'management'} 
            isSidebarOpen={isSidebarOpen}
            onClick={() => {
              setActiveTab('management');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }} 
          />
        )}
        
        {(canManageDoctors || canViewDoctorToday || canViewDoctorSchedule || canManageDepartments || canManageProcedures || canViewPatientReports) && (
          <div className="space-y-1">
            <button 
              onClick={() => {
                const newValue = !isDoctorsExpanded;
                setIsDoctorsExpanded(newValue);
                if (newValue) {
                  setIsSettingsExpanded(false);
                  setActiveTab(doctorManagementSubItems[0]?.id || 'doctors-list');
                }
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-none transition-all font-black uppercase tracking-widest text-[10px]",
                isSidebarOpen ? "px-3 py-2" : "justify-center py-3",
                (activeTab === 'doctors-list' || activeTab === 'doctors-today' || activeTab === 'doctors-schedule' || activeTab === 'doctors-department' || activeTab === 'doctors-procedure' || activeTab === 'doctors-patient-reports')
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className={cn("flex items-center", isSidebarOpen ? "gap-3" : "")}>
                <div className="shrink-0">
                  <LucideIcons.UserCog size={20} />
                </div>
                {isSidebarOpen && (settings?.menuItems?.doctorManagement?.label || "ডাক্তার ম্যানেজমেন্ট")}
              </div>
              {isSidebarOpen && (
                <LucideIcons.ChevronDown 
                  size={14} 
                  className={cn("transition-transform duration-200", isDoctorsExpanded ? "rotate-180" : "")} 
                />
              )}
            </button>
            
            {isDoctorsExpanded && (
              <div className="py-1 space-y-1 bg-slate-950/30">
                {doctorManagementSubItems.map(item => (
                  <NavSubItem 
                    key={item.id}
                    iconName={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    isSidebarOpen={isSidebarOpen}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {(canManageUsers || canManagePatients || canViewProfile) && (
          <div className="space-y-1">
            <button 
              onClick={() => {
                const newValue = !isUserExpanded;
                setIsUserExpanded(newValue);
                if (newValue) {
                  setIsDoctorsExpanded(false);
                  setIsSettingsExpanded(false);
                  setActiveTab('user-management');
                  if (userManagementSubItems.length > 0) {
                    setUserTab(userManagementSubItems[0].id);
                  }
                }
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-none transition-all font-black uppercase tracking-widest text-[10px]",
                isSidebarOpen ? "px-3 py-2" : "justify-center py-3",
                activeTab === 'user-management'
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className={cn("flex items-center", isSidebarOpen ? "gap-3" : "")}>
                <div className="shrink-0">
                  <LucideIcons.UserCircle size={20} />
                </div>
                {isSidebarOpen && (settings?.menuItems?.userManagement?.label || ((canManageUsers || canManagePatients) ? "ইউজার ম্যানেজমেন্ট" : "আমার প্রোফাইল"))}
              </div>
              {isSidebarOpen && (
                <LucideIcons.ChevronDown 
                  size={14} 
                  className={cn("transition-transform duration-200", isUserExpanded ? "rotate-180" : "")} 
                />
              )}
            </button>
            
            {isUserExpanded && (
              <div className="py-1 space-y-1 bg-slate-950/30">
                {userManagementSubItems.map(item => (
                  <NavSubItem 
                    key={item.id}
                    iconName={item.icon}
                    label={item.label}
                    active={activeTab === 'user-management' && userTab === item.id}
                    isSidebarOpen={isSidebarOpen}
                    onClick={() => {
                      setActiveTab('user-management');
                      setUserTab(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {(canManageSettings || canManageHospitalProfile || canManageDisplaySettings || canManagePatientPortal || canManageMobileNav || canManagePushNotifications || canManageBackup || canManageWelcomePopup || canManageLoginPage) && (
          <div className="space-y-1">
            <button 
              onClick={() => {
                const newValue = !isSettingsExpanded;
                setIsSettingsExpanded(newValue);
                if (newValue) {
                  setIsDoctorsExpanded(false);
                  setActiveTab('system-settings');
                  if (!systemTab) setSystemTab(systemSettingsSubItems[0]?.id || 'profile');
                }
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-none transition-all font-black uppercase tracking-widest text-[10px]",
                isSidebarOpen ? "px-3 py-2" : "justify-center py-3",
                activeTab === 'system-settings' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className={cn("flex items-center", isSidebarOpen ? "gap-3" : "")}>
                <div className="shrink-0">
                  <LucideIcons.Settings size={20} />
                </div>
                {isSidebarOpen && (settings?.menuItems?.systemSettings?.label || "সিস্টেম সেটিংস")}
              </div>
              {isSidebarOpen && (
                <LucideIcons.ChevronDown 
                  size={14} 
                  className={cn("transition-transform duration-200", isSettingsExpanded ? "rotate-180" : "")} 
                />
              )}
            </button>
            
            {isSettingsExpanded && (
              <div className="py-1 space-y-1 bg-slate-950/30">
                {systemSettingsSubItems.map(item => (
                  <NavSubItem 
                    key={item.id}
                    iconName={item.icon}
                    label={item.label}
                    active={activeTab === 'system-settings' && systemTab === item.id}
                    isSidebarOpen={isSidebarOpen}
                    onClick={() => {
                      setActiveTab('system-settings');
                      setSystemTab(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {/* Removed Fix Role (Admin) button */}
      </nav>

      <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
        <button 
          onClick={() => window.location.hash = ''}
          className={cn(
            "flex items-center text-blue-400 hover:bg-blue-900/20 rounded-none transition-all text-[11px] font-black uppercase tracking-widest border border-blue-800",
            isSidebarOpen ? "flex-1 justify-center gap-2 px-3 py-2.5" : "w-12 h-12 justify-center p-0 mx-auto"
          )}
        >
          <div className="shrink-0">
            <Monitor size={18} />
          </div>
          {isSidebarOpen && "লাইভ ডিসপ্লে"}
        </button>
      </div>
    </aside>
  );
}
