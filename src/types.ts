export interface UserPermissions {
  // Dashboard & Overview
  canViewOverview: boolean;
  canViewDashboard: boolean;
  canViewOpdDashboard: boolean;
  
  // Registration & Serial
  canViewRegistration: boolean;
  canCreateSerial: boolean;
  canEditSerial: boolean;
  canDeleteSerial: boolean;
  canViewLive: boolean;
  
  // Doctor Management
  canViewDoctors: boolean;
  canManageDoctors: boolean;
  canViewDoctorToday: boolean;
  canViewDoctorSchedule: boolean;
  canManageProcedures: boolean;
  canManageDepartments: boolean;
  canViewPatientReports: boolean;
  
  // Patient Management
  canViewPatients: boolean;
  canManagePatients: boolean;
  
  // User Management
  canViewProfile: boolean;
  canManageUsers: boolean;
  canViewActivityLogs: boolean;
  
  // System Settings
  canManageSettings: boolean;
  canManageHospitalProfile: boolean;
  canManageDisplaySettings: boolean;
  canManagePatientPortal: boolean;
  canManageMobileNav: boolean;
  canManagePushNotifications: boolean;
  canManageWelcomePopup: boolean;
  canManageLoginPage: boolean;
  canManageBackup: boolean;
  canManageAppAppearance: boolean;
  
  // Analytics & Data
  canViewAnalytics: boolean;
  canExportData: boolean;
  canViewSystemStatus: boolean;
  canEditOpdSummary: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  mobile?: string;
  username: string;
  hospitalNumber?: string;
  role: 'super-admin' | 'admin' | 'staff' | 'patient';
  permissions: UserPermissions;
  verifiedBadge?: 'none' | 'blue' | 'black' | 'green' | 'red';
  createdAt: any;
  isActive: boolean;
  emailVerified?: boolean;
  address?: string;
  portalNotice?: string;
  doctorId?: string;
  noticeUpdatedAt?: any;
  updatedAt?: any;
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
  designation: string;
  degree: string;
  schedule: string;
  roomNumber: string;
  photoUrl?: string;
  coverUrl?: string;
  videoUrl?: string;
  availableDays?: string[];
  activeNotice?: string;
  status?: 'active' | 'inactive';
  procedures?: string[];
  scrollingNotice?: string;
  footerNotice?: string;
  footerScrollDuration?: number;
  footerBgColor?: string;
  footerTextColor?: string;
  footerTheme?: 'light' | 'dark';
  verifiedBadge?: 'none' | 'blue' | 'black' | 'green' | 'red';
}

export interface Patient {
  id: string;
  serialNumber: number;
  hospitalNumber?: string;
  name: string;
  age: string;
  patientType: 'new' | 'followup';
  service?: string;
  doctorId: string;
  status: 'waiting' | 'running' | 'next' | 'absent' | 'completed' | 'calling' | 'checked-in';
  createdAt: any;
  date: string; // YYYY-MM-DD
  invoiceNumber?: string;
  verifiedBadge?: 'none' | 'blue' | 'black' | 'green' | 'red';
}

export interface AppSettings {
  hospitalName: string;
  slogan: string;
  scrollSpeed?: 'slow' | 'normal' | 'fast';
  activeNotice?: string;
  hospitalLogo?: string;
  primaryColor?: string;
  fontColor?: string;
  runningPatientBg?: string;
  runningPatientText?: string;
  waitingPatientBg?: string;
  waitingPatientText?: string;
  nextPatientBg?: string;
  nextPatientText?: string;
  absentPatientBg?: string;
  absentPatientText?: string;
  procedureColor?: string;
  displayBgColor?: string;
  displayCardBgColor?: string;
  displayHeaderBgColor?: string;
  displayDoctorMode?: 'manual' | 'auto-rotate' | 'all';
  displaySelectedDoctorId?: string;
  displayRotationInterval?: number; // in seconds
  displayTransitionEffect?: 'fade' | 'slide' | 'zoom' | 'none';
  displayShowPhoto?: boolean;
  displayShowSpecialty?: boolean;
  displayShowRoom?: boolean;
  displayCustomMessage?: string;
  displayTheme?: 'modern' | 'classic' | 'dark' | 'glass';
  displayShowNextDoctor?: boolean;
  displaySwitchOnCall?: boolean;
  displayShowHistory?: boolean;
  displayClockTheme?: 'digital' | 'analog' | 'minimal';
  displayCustomBgUrl?: string;
  displayTickerSpeed?: 'slow' | 'normal' | 'fast';
  displayShowClock?: boolean;
  displayShowDate?: boolean;
  displayEnableLogic?: boolean;
  displayAutoSwitchOnEmpty?: boolean;
  displayShowOnlyActiveDoctors?: boolean;
  baseFontSize?: number;
  headerAlignment?: 'left' | 'center' | 'right';
  websiteTitle?: string;
  loaderIcon?: string;
  favicon?: string;
  loadingText?: string;
  departments?: string[];
  procedures?: string[];
  patientPortalNotice?: string;
  patientPortalWelcomeMessage?: string;
  enablePatientPortal?: boolean;
  portalContactNumber?: string;
  portalAddress?: string;
  portalEmergencyNotice?: string;
  portalShowDoctorSchedule?: boolean;
  portalEnableOnlineRegistration?: boolean;
  portalThemeColor?: string;
  portalLogoUrl?: string;
  portalHealthTips?: string[];
  portalEmergencyContacts?: { name: string; number: string }[];
  mobileNavEnabled?: boolean;
  mobileNavItems?: {
    doctorOverview?: boolean;
    opdSummary?: boolean;
    dashboard: boolean;
    registration: boolean;
    doctor: boolean;
    patient: boolean;
    settings: boolean;
    account: boolean;
  };
  mobileNavIcons?: {
    doctorOverview?: string;
    opdSummary?: string;
    dashboard?: string;
    registration?: string;
    doctor?: string;
    patient?: string;
    settings?: string;
    account?: string;
  };
  mobileNavNicknames?: {
    doctorOverview?: string;
    opdSummary?: string;
    dashboard?: string;
    registration?: string;
    doctor?: string;
    patient?: string;
    settings?: string;
    account?: string;
  };
  mobileNavAnimation?: boolean;
  mobileNavStyle?: 'modern' | 'classic' | 'minimal' | 'bottom-bar' | 'bottom-bar-modern' | 'bottom-bar-glass' | 'bottom-bar-neon' | 'bottom-bar-pill' | 'bottom-bar-floating' | 'bottom-bar-minimal' | 'bottom-bar-curved' | 'bottom-bar-detached' | 'bottom-bar-gradient' | 'bottom-bar-material' | 'bottom-bar-ios' | 'bottom-bar-3d' | 'glass' | 'neon' | 'pill' | 'floating';
  hiddenSections?: { [key: string]: boolean };
  welcomePopup?: {
    enabled: boolean;
    title: string;
    content: string;
    features: string[];
    footerText: string;
    showEveryTime?: boolean;
  };
  loginSettings?: {
    title?: string;
    subtitle?: string;
    description?: string;
    features?: { label: string; icon: string }[];
    bgColor?: string;
    accentColor?: string;
    showBranding?: boolean;
    versionText?: string;
  };
  patientWelcomePopup?: {
    enabled: boolean;
    title: string;
    content: string;
    features: string[];
    footerText: string;
    showEveryTime?: boolean;
  };
  opdSummaryDepartments?: {
    id: string;
    name: string;
    enabled: boolean;
  }[];
  opdSummaryFontSize?: number;
  opdSummaryFontFamily?: string;
  opdSummaryWidth?: number;
  opdSummarySections?: {
    patientSummary: boolean;
    ultrasonogram: boolean;
    gynecology: boolean;
    radiology: boolean;
    emergency: boolean;
    dentalSurgery: boolean;
    cardiology: boolean;
    gastroenterology: boolean;
    entSurgery?: boolean;
    orthopedicSurgery?: boolean;
    generalSurgery?: boolean;
    signature?: boolean;
  };
  opdSummarySectionTitles?: {
    patientSummary?: string;
    ultrasonogram?: string;
    gynecology?: string;
    radiology?: string;
    emergency?: string;
    dentalSurgery?: string;
    cardiology?: string;
    gastroenterology?: string;
    entSurgery?: string;
    orthopedicSurgery?: string;
    generalSurgery?: string;
  };
  opdSummarySectionFieldLabels?: {
    patientSummary?: { new?: string; followup?: string };
    ultrasonogram?: { total?: string };
    gynecology?: { cesarean?: string; normal?: string; dc?: string };
    radiology?: { ct?: string; xray?: string };
    emergency?: { total?: string };
    entSurgery?: { total?: string };
    orthopedicSurgery?: { total?: string };
    generalSurgery?: { total?: string };
  };
  opdSummarySectionDepts?: {
    ultrasonogram?: string;
    gynecology?: string;
    radiology?: string;
    emergency?: string;
    dentalSurgery?: string;
    cardiology?: string;
    gastroenterology?: string;
    entSurgery?: string;
    orthopedicSurgery?: string;
    generalSurgery?: string;
  };
  opdSummarySectionFields?: {
    [sectionId: string]: { id: string; label: string; source: 'auto' | 'manual'; key?: string }[];
  };
  opdSummarySectionRows?: {
    [sectionId: string]: { id: string; name: string }[];
  };
  opdSummarySectionOrder?: string[];
  opdSummarySectionWidths?: { [sectionId: string]: number };
  opdSummaryCustomSections?: {
    id: string;
    title: string;
    dept?: string;
    enabled: boolean;
    fields: { id: string; label: string }[];
  }[];
  contactPhone?: string;
  contactEmail?: string;
  procedureDoctorMap?: { [procedureName: string]: string }; // procedureName -> doctorId
  procedureDepartmentMap?: { [procedureName: string]: string }; // procedureName -> departmentName
  procedureImageMap?: { [procedureName: string]: string }; // procedureName -> imageUrl
  pushNotificationSettings?: {
    enabled: boolean;
    subjects: {
      newRegistration: boolean;
      doctorCall: boolean;
      statusChange: boolean;
      systemAlert: boolean;
    };
    departments: string[];
    procedures?: string[];
    menus: {
      dashboard: boolean;
      registration: boolean;
      doctor: boolean;
      settings: boolean;
    };
  };
  emailTemplates?: {
    newRegistration: {
      subject: string;
      body: string;
    };
    passwordReset: {
      subject: string;
      body: string;
    };
    appointmentConfirmation: {
      subject: string;
      body: string;
    };
  };
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: any;
  type: 'patient' | 'doctor' | 'settings' | 'user' | 'auth' | 'system';
}

export interface DailyOpdStats {
  id: string; // date string YYYY-MM-DD
  date: string;
  patientSummary?: { [fieldId: string]: number };
  ultrasonogram?: { [fieldId: string]: number };
  gynecology: { [fieldId: string]: number };
  radiology: { [fieldId: string]: number };
  emergency: { [fieldId: string]: number };
  dentalSurgery?: { [fieldId: string]: number };
  cardiology?: { [fieldId: string]: number };
  gastroenterology?: { [fieldId: string]: number };
  entSurgery?: { [fieldId: string]: number };
  orthopedicSurgery?: { [fieldId: string]: number };
  generalSurgery?: { [fieldId: string]: number };
  customStats?: {
    [sectionId: string]: {
      [fieldId: string]: number;
    }
  };
  updatedAt?: any;
  updatedBy?: string;
}
