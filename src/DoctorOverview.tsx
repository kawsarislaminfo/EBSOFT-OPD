import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Doctor, Patient, AppSettings } from './types';
import { VerificationBadge } from './components/admin/AdminComponents';
import { Activity, Users, UserPlus, TrendingUp, Clock, Eye, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LoadingScreen from './components/LoadingScreen';
import { cn } from './lib/utils';

interface DoctorStats extends Doctor {
    newCount: number;
    followupCount: number;
    totalCount: number;
    opdTotal: number;
    procedureTotal: number;
    onQuickView?: (doctor: Doctor) => void;
}

interface DoctorCardProps extends DoctorStats {
    displayMode: 'opd' | 'procedure';
    patients: Patient[];
}

const DoctorCard: React.FC<DoctorCardProps> = (props) => {
    const { displayMode, patients, ...doctor } = props;
    const isProcedureMode = displayMode === 'procedure';

    // Format name to be uppercase
    const formattedName = doctor.name.toUpperCase();

    // Color mapping based on display mode
    const cardColors = isProcedureMode 
        ? "border-emerald-600 bg-emerald-50" 
        : "border-blue-600 bg-blue-50";
    const headerColors = isProcedureMode 
        ? "bg-emerald-600 text-white" 
        : "bg-blue-600 text-white";
    const statBg = isProcedureMode ? "bg-emerald-100" : "bg-blue-100";
    const totalBg = isProcedureMode ? "bg-emerald-600" : "bg-blue-600";

    // Get procedure counts
    const procedureCounts = React.useMemo(() => {
        if (!doctor.id) return {};
        const docPatients = patients.filter(p => p.doctorId === doctor.id);
        const procPatients = docPatients.filter(p => p.service && p.service !== 'general');
        const counts: Record<string, number> = {};
        procPatients.forEach(p => {
            const procName = p.service || 'Unknown';
            counts[procName] = (counts[procName] || 0) + 1;
        });
        return counts;
    }, [doctor.id, patients]);

    return (
        <div className={cn("flex flex-col w-full border-2 rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group", isProcedureMode ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50")}>
            {/* Doctor Photo */}
            <div className="w-full aspect-[1.2/1] border-b-2 border-black/10 overflow-hidden bg-slate-200 relative">
                <img 
                    src={doctor.photoUrl || `https://picsum.photos/seed/${doctor.id}/600/800`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                    alt={doctor.name}
                />
                {doctor.onQuickView && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            doctor.onQuickView?.(doctor);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-black opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white z-20 shadow-md"
                    >
                        <Eye size={12} />
                    </button>
                )}
            </div>

            {/* Doctor Name / Department */}
            <div className={cn("py-2 px-2 text-center flex items-center justify-center gap-1 min-h-[40px]", isProcedureMode ? "bg-emerald-600 text-white" : "bg-blue-600 text-white")}>
                <h3 className="text-xs font-black uppercase leading-none tracking-tight truncate">
                    {isProcedureMode ? doctor.department.toUpperCase() : formattedName}
                </h3>
            </div>

            {/* Stats / Procedure List */}
            <div className="flex flex-col flex-1">
                {isProcedureMode ? (
                    <div className="p-3 flex-1">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">প্রসিডিওর</span>
                            <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{doctor.procedureTotal}</span>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(procedureCounts).map(([name, count]) => (
                                <div key={name} className="flex justify-between text-xs">
                                    <span className="truncate text-slate-600 pr-2">{name}</span>
                                    <span className="font-bold text-slate-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Row 1: NEW */}
                        <div className="flex border-b border-black/10 h-8">
                            <div className="flex-1 flex items-center px-2 bg-white/50">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">নতুন</span>
                            </div>
                            <div className={cn("w-12 flex items-center justify-center border-l border-black/10 font-bold bg-blue-100")}>
                                <span className="text-base text-slate-900">{doctor.newCount}</span>
                            </div>
                        </div>

                        {/* Row 2: F/UP */}
                        <div className="flex border-b border-black/10 h-8">
                            <div className="flex-1 flex items-center px-2 bg-white/50">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">ফলোআপ</span>
                            </div>
                            <div className={cn("w-12 flex items-center justify-center border-l border-black/10 font-bold bg-blue-100")}>
                                <span className="text-base text-slate-900">{doctor.followupCount}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Total Footer */}
            <div className={cn("py-2.5 text-center text-white font-black text-xl", isProcedureMode ? "bg-emerald-600" : "bg-blue-600")}>
                {isProcedureMode ? doctor.procedureTotal : doctor.opdTotal}
            </div>
        </div>
    );
};

function StatCard({ icon, label, value, trend, color, accentColor, isGradient = true }: { icon: React.ReactNode, label: string, value: number | string, trend: string, color: string, accentColor: string, isGradient?: boolean }) {
    return (
      <motion.div 
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={cn("relative overflow-hidden p-3 md:p-4 border-2 rounded-xl bg-white shadow-sm transition-all min-w-0 md:flex-1", color)}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between mb-2 text-center md:text-left">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center mb-2 md:mb-0 shadow-inner",
            accentColor
          )}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 text-white" })}
          </div>
          <div className="flex flex-col items-center md:items-end overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-500">{label}</span>
            <h4 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">{value}</h4>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-black/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{trend}</span>
          <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full w-2/3 rounded-full", accentColor.replace('bg-', 'bg-opacity-80 bg-'))} />
          </div>
        </div>
      </motion.div>
    );
  }

export default function DoctorOverview({ selectedDate, onQuickView }: { selectedDate?: string, onQuickView?: (doctor: Doctor) => void }) {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('DoctorOverview: Fetching data for date:', selectedDate);
        const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
            const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
            // Treat missing status as 'active'
            const activeDocs = allDocs.filter(d => d.status !== 'inactive');
            console.log('DoctorOverview: Active doctors found:', activeDocs.length);
            setDoctors(activeDocs);
        }, (error) => {
            console.error('DoctorOverview: Error fetching doctors:', error);
        });

        const targetDate = selectedDate || new Date().toISOString().split('T')[0];
        const q = query(collection(db, 'patients'), where('date', '==', targetDate));
        const unsubPatients = onSnapshot(q, (snapshot) => {
            const patientData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
            console.log('DoctorOverview: Patients found for date:', targetDate, patientData.length);
            setPatients(patientData);
            setLoading(false);
        }, (error) => {
            console.error('DoctorOverview: Error fetching patients:', error);
            setLoading(false);
        });

        return () => {
            unsubDoctors();
            unsubPatients();
        };
    }, [selectedDate]);

    const dayMap = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    const targetDay = dayMap[new Date(targetDate).getDay()];

    const doctorStats: DoctorStats[] = React.useMemo(() => {
        const doctorsWithPatients = new Set(patients.map(p => p.doctorId));
        
        return doctors
            .filter(doc => {
                const isScheduled = !doc.availableDays || doc.availableDays.length === 0 || doc.availableDays.includes(targetDay);
                const hasPatients = doctorsWithPatients.has(doc.id);
                return isScheduled || hasPatients;
            })
            .map(doc => {
                const docPatients = patients.filter(p => p.doctorId === doc.id);
                const generalPatients = docPatients.filter(p => p.service === 'general' || !p.service);
                const procedurePatients = docPatients.filter(p => p.service && p.service !== 'general');
                
                const newCount = generalPatients.filter(p => p.patientType === 'new').length;
                const followupCount = generalPatients.filter(p => p.patientType === 'followup').length;
                
                const opdTotal = generalPatients.length;
                const procedureTotal = procedurePatients.length;
                
                return {
                    ...doc,
                    newCount,
                    followupCount,
                    totalCount: opdTotal,
                    opdTotal,
                    procedureTotal
                };
            });
    }, [doctors, patients, targetDay]);

    const opdDoctors = React.useMemo(() => 
        doctorStats
            .filter(doc => {
                const excludedDepts = ["ULTRASONOGRAM", "ULTRA", "ULTRASONOGRAPHY", "SONOGRAPHY", "আল্ট্রাসনোগ্রাম", "আল্ট্রাসোনোগ্রাফি", "আল্ট্রা", "সোনোগ্রাফি", "USG", "EMERGENCY", "ইমার্জেন্সী", "জরুরি বিভাগ", "জরুরি"];
                const deptUpper = doc.department.toUpperCase();
                return !excludedDepts.some(eDept => deptUpper.includes(eDept.toUpperCase()));
            })
            .sort((a, b) => b.opdTotal - a.opdTotal), 
    [doctorStats]);
    
    const procedureDoctors = React.useMemo(() => 
        doctorStats.filter(doc => {
            const procedureDepts = ["ULTRASONOGRAM", "ULTRA", "ULTRASONOGRAPHY", "SONOGRAPHY", "আল্ট্রাসনোগ্রাম", "আল্ট্রাসোনোগ্রাফি", "আল্ট্রা", "সোনোগ্রাফি", "USG", "EMERGENCY", "ইমার্জেন্সী", "জরুরি বিভাগ", "জরুরি"];
            const deptUpper = doc.department.toUpperCase();
            const isProcedureDept = procedureDepts.some(eDept => deptUpper.includes(eDept.toUpperCase()));
            return doc.procedureTotal > 0 || isProcedureDept;
        })
        .sort((a, b) => b.procedureTotal - a.procedureTotal), 
    [doctorStats]);

    const opdPatients = React.useMemo(() => patients.filter(p => p.service === 'general' || !p.service), [patients]);
    const overallNew = React.useMemo(() => opdPatients.filter(p => p.patientType === 'new').length, [opdPatients]);
    const overallFollowup = React.useMemo(() => opdPatients.filter(p => p.patientType === 'followup').length, [opdPatients]);
    const overallTotal = overallNew + overallFollowup;

    const procedurePatients = React.useMemo(() => patients.filter(p => p.service && p.service !== 'general'), [patients]);
    const overallProcedures = procedurePatients.length;

    const ultrasonogramPatients = React.useMemo(() => patients.filter(p => p.service === 'ultrasonogram'), [patients]);
    const overallUltrasonograms = ultrasonogramPatients.length;

    if (loading) {
        return <div className="h-96 flex items-center justify-center"><Activity className="animate-spin text-blue-600" size={48} /></div>;
    }

    return (
        <div className="bg-white pt-2 px-2 md:px-4 pb-8 font-sans min-h-screen relative">
            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-8 relative z-10">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-black mb-0.5 md:mb-1">ডাক্তার ওভারভিউ</h1>
                        <p className="text-[9px] md:text-xs font-black text-slate-500 tracking-widest uppercase">ডাক্তার ভিত্তিক রোগীর বিস্তারিত পরিসংখ্যান ও রিপোর্ট</p>
                    </div>

                    {/* Summary Boxes */}
                    <div className="grid grid-cols-4 md:flex md:flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                        <StatCard 
                            icon={<UserPlus />} 
                            label="নতুন রোগী" 
                            value={overallNew} 
                            trend="আজকের" 
                            color="border-emerald-200" 
                            accentColor="bg-emerald-500" 
                            isGradient={false}
                        />
                        <StatCard 
                            icon={<TrendingUp />} 
                            label="ফলোআপ রোগী" 
                            value={overallFollowup} 
                            trend="আজকের" 
                            color="border-purple-200" 
                            accentColor="bg-purple-500" 
                            isGradient={false}
                        />
                        <StatCard 
                            icon={<Users />} 
                            label="মোট রোগী (OPD)" 
                            value={overallTotal} 
                            trend="আজকের" 
                            color="border-blue-200" 
                            accentColor="bg-blue-500" 
                            isGradient={false}
                        />
                        <StatCard 
                            icon={<Activity />} 
                            label="মোট প্রসিডিওর" 
                            value={overallProcedures} 
                            trend="আজকের" 
                            color="border-orange-200" 
                            accentColor="bg-orange-500" 
                            isGradient={false}
                        />
                    </div>
                </div>

                {/* Regular Doctors Section */}
                {opdDoctors.length > 0 && (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-1 w-12 bg-black"></div>
                            <h2 className="text-xl font-black text-black uppercase tracking-widest">ডাক্তার তালিকা (OPD)</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 md:gap-3 justify-start">
                            <AnimatePresence>
                                {opdDoctors.map(doctor => (
                                    <motion.div
                                        key={`opd-${doctor.id}`}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full"
                                    >
                                        <DoctorCard {...doctor} patients={patients} displayMode="opd" onQuickView={onQuickView} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* Procedure Doctors Section */}
                {procedureDoctors.length > 0 && (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-1 w-12 bg-black"></div>
                            <h2 className="text-xl font-black text-black uppercase tracking-widest">প্রসিডিওর পরিসংখ্যান</h2>
                            <div className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                মোট: {overallProcedures}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 md:gap-3 justify-start">
                            <AnimatePresence>
                                {procedureDoctors.map(doctor => (
                                    <motion.div
                                        key={`proc-${doctor.id}`}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="w-full"
                                    >
                                        <DoctorCard {...doctor} patients={patients} displayMode="procedure" onQuickView={onQuickView} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
