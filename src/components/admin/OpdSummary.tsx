import React, { useMemo, useState, useEffect } from 'react';
import { Doctor, Patient, AppSettings, DailyOpdStats, UserProfile } from '../../types';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { Save, Printer, Loader2, Download, FileText, FileSpreadsheet, File, MessageCircle, MessageSquare, Edit, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun } from 'docx';

interface OpdSummaryProps {
  doctors: Doctor[];
  patients: Patient[];
  settings: AppSettings | null;
  selectedDate: string;
  userProfile: UserProfile | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function OpdSummary({ doctors, patients, settings, selectedDate, userProfile, showToast }: OpdSummaryProps) {
  const today = selectedDate; 
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-GB'); 
  const [dailyStats, setDailyStats] = useState<DailyOpdStats | null>(null);
  const [localStats, setLocalStats] = useState<DailyOpdStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const statsRef = doc(db, 'dailyOpdStats', today);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        const data = statsSnap.data() as DailyOpdStats;
        setDailyStats(data);
        setLocalStats(data);
      } else {
        const defaultStats: DailyOpdStats = {
          id: today,
          date: today,
          patientSummary: {},
          ultrasonogram: {},
          gynecology: {},
          radiology: {},
          emergency: {},
          dentalSurgery: {},
          cardiology: {},
          gastroenterology: {},
          customStats: {}
        };
        setDailyStats(defaultStats);
        setLocalStats(defaultStats);
      }
    };
    fetchStats();
  }, [today]);

  const [isSaving, setIsSaving] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const isAdmin = userProfile?.role === 'super-admin' || userProfile?.role === 'admin';
  const canEdit = isAdmin || userProfile?.permissions?.canEditOpdSummary;
  const [isEditMode, setIsEditMode] = useState(false);

  const getSummaryDataForExport = () => {
    const data = [];
    const enabledDepartments = settings?.opdSummaryDepartments?.filter(d => d.enabled) || [];
    
    enabledDepartments.forEach(dept => {
      const fields = settings?.opdSummarySectionFields?.[dept.id] || [];
      fields.forEach(field => {
        data.push({
          Department: dept.name,
          Field: field.label,
          Value: localStats?.[dept.id as keyof DailyOpdStats]?.[field.id] || 0
        });
      });
    });
    return data;
  };

  const sharePDF = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;
    
    const originalOverflow = element.style.overflowX;
    element.style.overflowX = 'visible';
    
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    
    element.style.overflowX = originalOverflow;
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `OPD_Summary_${today}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'OPD Summary',
            text: `OPD Summary for ${formattedDate}`
          });
        } catch (error) {
          console.error('Error sharing:', error);
          showToast('শেয়ার করতে সমস্যা হয়েছে।', 'error');
        }
      } else {
        showToast('আপনার ব্রাউজার সরাসরি ফাইল শেয়ারিং সাপোর্ট করে না।', 'info');
        downloadPDF(); // Fallback to download
      }
    }, 'image/png');
    
    setShowDownloadMenu(false);
  };

  const downloadPDF = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;
    
    const originalOverflow = element.style.overflowX;
    element.style.overflowX = 'visible';
    
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    
    element.style.overflowX = originalOverflow;
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`OPD_Summary_${today}.pdf`);
    setShowDownloadMenu(false);
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(getSummaryDataForExport());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
    XLSX.writeFile(workbook, `OPD_Summary_${today}.xlsx`);
    setShowDownloadMenu(false);
  };

  const downloadWord = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;
    
    const originalOverflow = element.style.overflowX;
    element.style.overflowX = 'visible';
    
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    
    element.style.overflowX = originalOverflow;
    
    const imgData = canvas.toDataURL('image/png');
    
    // Convert base64 to Uint8Array for docx
    const byteString = atob(imgData.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: Buffer.from(ia),
                transformation: {
                  width: 600,
                  height: (canvas.height * 600) / canvas.width,
                },
                type: 'png',
              }),
            ],
          }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OPD_Summary_${today}.docx`;
    link.click();
    setShowDownloadMenu(false);
  };

  const saveStats = async () => {
    if (!localStats) return;
    setIsSaving(true);
    try {
      const statsRef = doc(db, 'dailyOpdStats', today);
      
      // Ensure we are only saving valid fields
      const dataToSave = {
        ...localStats,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.name || 'Admin'
      };
      
      await setDoc(statsRef, dataToSave, { merge: true });
      setDailyStats(localStats);
      showToast('পরিসংখ্যান সফলভাবে সংরক্ষিত হয়েছে।', 'success');
    } catch (error) {
      console.error('Error saving stats:', error);
      // More detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`সংরক্ষণ করতে সমস্যা হয়েছে: ${errorMessage}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCustomStat = (sectionId: string, fieldId: string, value: string) => {
    if (!localStats) return;
    const numValue = parseInt(value) || 0;
    setLocalStats({
      ...localStats,
      customStats: {
        ...(localStats.customStats || {}),
        [sectionId]: {
          ...(localStats.customStats?.[sectionId] || {}),
          [fieldId]: numValue
        }
      }
    });
  };

  const updateSectionText = (sectionId: keyof DailyOpdStats, fieldId: string, value: string) => {
    if (!localStats) return;
    setLocalStats({
      ...localStats,
      [sectionId]: {
        ...(localStats[sectionId] as any || {}),
        [fieldId]: value
      }
    });
  };

  const updateSectionStat = (sectionId: keyof DailyOpdStats, fieldId: string, value: string) => {
    if (!localStats) return;
    const numValue = parseInt(value) || 0;
    setLocalStats({
      ...localStats,
      [sectionId]: {
        ...(localStats[sectionId] as any || {}),
        [fieldId]: numValue
      }
    });
  };
  const summaryData = useMemo(() => {
    const todayPatients = patients.filter(p => p.date === today);
    
    // Filter departments based on settings
    const enabledDepartments = settings?.opdSummaryDepartments?.filter(d => d.enabled) || [];
    
    const dayNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const selectedDayName = dayNames[new Date(today).getDay()];

    const summary = doctors.filter(doctor => {
        return !doctor.availableDays || doctor.availableDays.length === 0 || doctor.availableDays.includes(selectedDayName);
    }).map((doctor, index) => {
      const doctorPatients = todayPatients.filter(p => {
        if (p.doctorId !== doctor.id) return false;
        // If service is 'general' or empty, it always goes to the doctor's summary
        if (p.service === 'general' || !p.service) return true;
        
        // If service is mapped to the doctor's department, count it here
        const procDept = settings?.procedureDepartmentMap?.[p.service];
        return procDept === doctor.department;
      });
      return {
        sl: index + 1, // Starting from 1
        name: doctor.name,
        department: doctor.department,
        new: doctorPatients.filter(p => p.patientType === 'new').length,
        followup: doctorPatients.filter(p => p.patientType === 'followup').length,
      };
    }).filter(s => {
      const excludedDepts = ["ULTRASONOGRAM", "ULTRA", "ULTRASONOGRAPHY", "SONOGRAPHY", "আল্ট্রাসনোগ্রাম", "আল্ট্রাসোনোগ্রাফি", "আল্ট্রা", "সোনোগ্রাফি", "USG", "EMERGENCY", "ইমার্জেন্সী", "জরুরি বিভাগ", "জরুরি"];
      const deptUpper = s.department.toUpperCase();
      return !excludedDepts.some(eDept => deptUpper.includes(eDept.toUpperCase()));
    });

    // Filter summary based on enabled departments
    const filteredSummary = (enabledDepartments.length > 0 
      ? summary.filter(s => enabledDepartments.some(d => d.name === s.department))
      : summary
    ).map((s, index) => ({ ...s, sl: index + 1 }));

    // Ultrasonogram Doctors Logic
    const usgDepts = ["ULTRASONOGRAM", "ULTRA", "ULTRASONOGRAPHY", "SONOGRAPHY", "আল্ট্রাসনোগ্রাম", "আল্ট্রাসোনোগ্রাফি", "আল্ট্রা", "সোনোগ্রাফি", "USG"];

    const ultrasonogramPatients = todayPatients.filter(p => {
      if (!p.service || p.service === 'general') return false;
      
      const upperService = p.service.toUpperCase();
      if (upperService === 'ULTRASONOGRAM' || p.service === 'ultrasonogram') return true;

      // Check if the service is mapped to an ultrasonogram department
      const mappedDept = settings?.procedureDepartmentMap?.[p.service];
      if (mappedDept) {
        const upperMappedDept = mappedDept.toUpperCase();
        return usgDepts.some(uDept => 
          upperMappedDept.includes(uDept.toUpperCase()) || mappedDept.includes(uDept)
        );
      }
      return false;
    });
    
    const scheduledUsgDoctors = doctors.filter(doctor => {
      const dept = doctor.department.toUpperCase();
      const isUsgDept = usgDepts.some(uDept => 
        dept.includes(uDept.toUpperCase()) || doctor.department.includes(uDept)
      );
      const isAvailable = doctor.availableDays?.includes(selectedDayName);
      return isUsgDept && isAvailable;
    });

    const usgDoctorMap = new Map<string, { id: string, name: string, department: string, total: number }>();

    // Add scheduled doctors first
    scheduledUsgDoctors.forEach(d => {
      usgDoctorMap.set(d.id, { id: d.id, name: d.name, department: d.department, total: 0 });
    });

    // Add totals from actual patients
    ultrasonogramPatients.forEach(p => {
      const doctor = doctors.find(d => d.id === p.doctorId);
      const doctorId = doctor?.id || 'unknown';
      const doctorName = doctor?.name || 'Unknown';
      const doctorDept = doctor?.department || 'ULTRASONOGRAM';

      if (!usgDoctorMap.has(doctorId)) {
        usgDoctorMap.set(doctorId, { id: doctorId, name: doctorName, department: doctorDept, total: 0 });
      }
      usgDoctorMap.get(doctorId)!.total += 1;
    });

    const usgDoctorsList = Array.from(usgDoctorMap.values());

    const radiologyPatients = todayPatients.filter(p => p.service === 'radiology'); // Assuming this service name
    const emergencyPatients = todayPatients.filter(p => p.service === 'emergency');

    const emergencyDoctor = doctors.find(d => d.department.toUpperCase().includes('EMERGENCY') || d.department.includes('জরুরী'))?.name || 'SUJAN CHANDRA DAS';
    
    // Gynecology Doctors Logic
    const gynecologyDepts = ["GYNAE", "GYNAECOLOGY", "GYNECOLOGY", "স্ত্রী ও প্রসূতি রোগ বিশেষজ্ঞ", "গাইনী", "গাইনি"];
    
    const gynecologyDoctors = doctors.filter(doctor => {
      const dept = doctor.department.toUpperCase();
      const isGynaeDept = gynecologyDepts.some(gDept => 
        dept.includes(gDept.toUpperCase()) || doctor.department.includes(gDept)
      );
      const isAvailable = doctor.availableDays?.includes(selectedDayName);
      return isGynaeDept && isAvailable;
    });

    // Dental Surgery Doctors Logic
    const dentalDepts = ["DENTAL", "DENTISTRY", "DENTAL SURGERY", "ডেন্টাল", "দন্ত", "দাঁত"];
    
    // Find all doctors who belong to Dental department
    const dentalDoctors = doctors.filter(doctor => {
      const dept = doctor.department.toUpperCase();
      return dentalDepts.some(dDept => 
        dept.includes(dDept.toUpperCase()) || doctor.department.includes(dDept)
      );
    });

    // Find all patients under these doctors who have procedures
    // OR patients whose service is mapped to a dental department
    const dentalProcedures = todayPatients.filter(p => {
      if (!p.service || p.service === 'general') return false;
      
      const doctor = dentalDoctors.find(d => d.id === p.doctorId);
      if (doctor) return true;

      // Check if the service is mapped to a dental department
      const mappedDept = settings?.procedureDepartmentMap?.[p.service];
      if (mappedDept) {
        const upperMappedDept = mappedDept.toUpperCase();
        return dentalDepts.some(dDept => 
          upperMappedDept.includes(dDept.toUpperCase()) || mappedDept.includes(dDept)
        );
      }
      return false;
    });

    // Map of doctorId -> { fieldId -> count }
    const autoDentalStats: Record<string, Record<string, number>> = {};
    
    dentalProcedures.forEach(p => {
      if (!autoDentalStats[p.doctorId]) autoDentalStats[p.doctorId] = {};
      
      // Normalize service name to match field IDs
      let fieldId = p.service.toLowerCase().replace(/\s+/g, '_');
      
      // Handle common mappings
      if (fieldId.includes('root_canal')) fieldId = 'root_canal';
      if (fieldId.includes('filling')) fieldId = 'filling';
      if (fieldId.includes('extraction')) fieldId = 'extraction';
      if (fieldId.includes('pulpectomy')) fieldId = 'pulpectomy';
      if (fieldId.includes('scalling') || fieldId.includes('scaling')) fieldId = 'dental_scalling';
      
      autoDentalStats[p.doctorId][fieldId] = (autoDentalStats[p.doctorId][fieldId] || 0) + 1;
    });

    // Also include doctors who are scheduled but might not have patients yet
    const scheduledDentalDoctors = dentalDoctors.filter(doctor => 
      doctor.availableDays?.includes(selectedDayName)
    );

    // Merge doctors: those with procedures today + those scheduled today
    const allDentalDoctorIds = new Set([
      ...dentalProcedures.map(p => p.doctorId),
      ...scheduledDentalDoctors.map(d => d.id)
    ]);

    const finalDentalDoctors = Array.from(allDentalDoctorIds)
      .map(id => doctors.find(d => d.id === id))
      .filter((d): d is Doctor => !!d);

    // Cardiology Doctors Logic
    const cardiologyDepts = ["CARDIOLOGY", "HEART", "কার্ডিওলজি", "হৃদরোগ"];
    
    // Find all doctors who belong to Cardiology department
    const cardiologyDoctors = doctors.filter(doctor => {
      const dept = doctor.department.toUpperCase();
      return cardiologyDepts.some(cDept => 
        dept.includes(cDept.toUpperCase()) || doctor.department.includes(cDept)
      );
    });

    // Find all patients under these doctors who have procedures
    // OR patients whose service is mapped to a cardiology department
    const cardiologyProcedures = todayPatients.filter(p => {
      if (!p.service || p.service === 'general') return false;
      
      const doctor = cardiologyDoctors.find(d => d.id === p.doctorId);
      if (doctor) return true;

      // Check if the service is mapped to a cardiology department
      const mappedDept = settings?.procedureDepartmentMap?.[p.service];
      if (mappedDept) {
        const upperMappedDept = mappedDept.toUpperCase();
        return cardiologyDepts.some(cDept => 
          upperMappedDept.includes(cDept.toUpperCase()) || mappedDept.includes(cDept)
        );
      }
      return false;
    });

    // Map of doctorId -> { fieldId -> count }
    const autoCardiologyStats: Record<string, Record<string, number>> = {};
    
    cardiologyProcedures.forEach(p => {
      if (!autoCardiologyStats[p.doctorId]) autoCardiologyStats[p.doctorId] = {};
      
      // Normalize service name to match field IDs
      let fieldId = p.service.toLowerCase().replace(/\s+/g, '_');
      
      // Handle common mappings for Cardiology
      if (fieldId.includes('echo') || fieldId.includes('echocardiogram')) fieldId = 'echocardiogram';
      if (fieldId.includes('ecg')) fieldId = 'ecg';
      if (fieldId.includes('ett')) fieldId = 'ett';
      
      autoCardiologyStats[p.doctorId][fieldId] = (autoCardiologyStats[p.doctorId][fieldId] || 0) + 1;
    });

    // Also include doctors who are scheduled but might not have patients yet
    const scheduledCardiologyDoctors = cardiologyDoctors.filter(doctor => 
      doctor.availableDays?.includes(selectedDayName)
    );

    // Merge doctors: those with procedures today + those scheduled today
    const allCardiologyDoctorIds = new Set([
      ...cardiologyProcedures.map(p => p.doctorId),
      ...scheduledCardiologyDoctors.map(d => d.id)
    ]);

    const finalCardiologyDoctors = Array.from(allCardiologyDoctorIds)
      .map(id => doctors.find(d => d.id === id))
      .filter((d): d is Doctor => !!d);

    // Gastroenterology Doctors Logic
    const gastroDepts = ["GASTROENTEROLOGY", "GASTRO", "গ্যাস্ট্রোএন্টারোলজি", "গ্যাস্ট্রো"];
    
    // Find all doctors who belong to Gastroenterology department
    const gastroDoctors = doctors.filter(doctor => {
      const dept = doctor.department.toUpperCase();
      return gastroDepts.some(gDept => 
        dept.includes(gDept.toUpperCase()) || doctor.department.includes(gDept)
      );
    });

    // Find all patients under these doctors who have procedures
    const gastroProcedures = todayPatients.filter(p => {
      if (!p.service || p.service === 'general') return false;
      
      const doctor = gastroDoctors.find(d => d.id === p.doctorId);
      if (doctor) return true;

      // Check if the service is mapped to a gastro department
      const mappedDept = settings?.procedureDepartmentMap?.[p.service];
      if (mappedDept) {
        const upperMappedDept = mappedDept.toUpperCase();
        return gastroDepts.some(gDept => 
          upperMappedDept.includes(gDept.toUpperCase()) || mappedDept.includes(gDept)
        );
      }
      return false;
    });

    // Map of doctorId -> { fieldId -> count }
    const autoGastroStats: Record<string, Record<string, number>> = {};
    
    gastroProcedures.forEach(p => {
      if (!autoGastroStats[p.doctorId]) autoGastroStats[p.doctorId] = {};
      
      // Normalize service name to match field IDs
      let fieldId = p.service.toLowerCase().replace(/\s+/g, '_');
      
      // Handle common mappings for Gastroenterology
      if (fieldId.includes('endoscopy')) fieldId = 'endoscopy';
      if (fieldId.includes('colonoscopy')) fieldId = 'colonoscopy';
      if (fieldId.includes('fibroscan')) fieldId = 'fibroscan';
      if (fieldId.includes('ercp')) fieldId = 'ercp';
      
      autoGastroStats[p.doctorId][fieldId] = (autoGastroStats[p.doctorId][fieldId] || 0) + 1;
    });

    // Also include doctors who are scheduled but might not have patients yet
    const scheduledGastroDoctors = gastroDoctors.filter(doctor => 
      doctor.availableDays?.includes(selectedDayName)
    );

    // Merge doctors: those with procedures today + those scheduled today
    const allGastroDoctorIds = new Set([
      ...gastroProcedures.map(p => p.doctorId),
      ...scheduledGastroDoctors.map(d => d.id)
    ]);

    const finalGastroDoctors = Array.from(allGastroDoctorIds)
      .map(id => doctors.find(d => d.id === id))
      .filter((d): d is Doctor => !!d);

    return {
      summary: filteredSummary,
      totalNew: filteredSummary.reduce((acc, curr) => acc + curr.new, 0),
      totalFollowup: filteredSummary.reduce((acc, curr) => acc + curr.followup, 0),
      ultrasonogram: {
        dept: 'ULTRASONOGRAM',
        doctors: usgDoctorsList,
        total: ultrasonogramPatients.length
      },
      gynecology: {
        doctors: gynecologyDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
        stats: localStats?.gynecology || {}
      },
      radiology: localStats?.radiology || { ct: 0, xray: 0 },
      emergency: {
        doctor: emergencyDoctor,
        dept: 'EMERGENCY',
        total: localStats?.emergency.total || 0
      },
      dentalSurgery: {
        doctors: finalDentalDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
        autoStats: autoDentalStats,
        stats: localStats?.dentalSurgery || {}
      },
      cardiology: {
        doctors: finalCardiologyDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
        autoStats: autoCardiologyStats,
        stats: localStats?.cardiology || {}
      },
      gastroenterology: {
        doctors: finalGastroDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
        autoStats: autoGastroStats,
        stats: localStats?.gastroenterology || {}
      }
    };
  }, [doctors, patients, today, settings, localStats]);

  const [localWidth, setLocalWidth] = useState<number>(settings?.opdSummaryWidth || 100);

  useEffect(() => {
    if (settings?.opdSummaryWidth) {
      setLocalWidth(settings.opdSummaryWidth);
    }
  }, [settings?.opdSummaryWidth]);

  const fontSize = settings?.opdSummaryFontSize || 14;
  const fontFamily = settings?.opdSummaryFontFamily || 'sans-serif';
  const style = { fontSize: `${fontSize}px`, fontFamily: fontFamily };

  return (
    <div className="w-full flex flex-col items-center" style={style}>
      <div className="flex justify-between items-center mb-4 print:hidden print-hidden gap-2 w-full bg-white p-3 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <label className="hidden md:block text-xs font-bold text-slate-600 uppercase whitespace-nowrap">প্রস্থ (Width):</label>
          <input 
            type="range" 
            min="50" 
            max="100" 
            value={localWidth}
            onChange={(e) => setLocalWidth(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="hidden md:block text-xs font-bold text-slate-700 w-8">{localWidth}%</span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 text-sm"
            >
              <Download size={16} /> <span className="hidden sm:inline">ডাউনলোড</span>
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl z-50">
                <button onClick={downloadPDF} className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-sm"><FileText size={16} /> PDF</button>
              </div>
            )}
          </div>
          <button
            onClick={sharePDF}
            className="bg-emerald-600 text-white px-4 py-2 rounded-none font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <MessageSquare size={16} /> <span className="hidden sm:inline">WhatsApp</span>
          </button>
          {canEdit && (
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-none font-bold transition-all shadow-sm flex items-center gap-2 text-sm ${isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
            >
              {isEditMode ? <Eye size={16} /> : <Edit size={16} />}
              <span className="hidden sm:inline">{isEditMode ? 'ভিউ মোড' : 'এডিট মোড'}</span>
            </button>
          )}
          <button 
            onClick={saveStats}
            disabled={isSaving || !canEdit}
            className="bg-emerald-600 text-white px-4 py-2 rounded-none font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            <span className="hidden sm:inline">সেভ করুন</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">প্রিন্ট করুন</span>
          </button>
        </div>
      </div>

      <div id="print-area" className="bg-white p-[0.1in] shadow-sm border border-slate-200 rounded-none overflow-x-auto" style={{ width: `${localWidth}%` }}>
        {/* Header Section */}
        <div className={`flex mb-1 ${settings?.headerAlignment === 'center' ? 'flex-col items-center text-center' : settings?.headerAlignment === 'right' ? 'flex-row-reverse text-right' : 'flex-row items-center'}`}>
          {/* Logo */}
          <div className={`${settings?.headerAlignment === 'center' ? 'mb-2' : 'mr-4'} flex-shrink-0`}>
            {settings?.hospitalLogo ? (
              <img src={settings.hospitalLogo} alt="Logo" className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 relative flex items-center justify-center">
                {/* Replicating a circular logo with green ribbon and red cross */}
                <div className="absolute inset-0 border-2 border-slate-200 rounded-full"></div>
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute w-full h-1.5 bg-red-600 rounded-sm"></div>
                  <div className="absolute h-full w-1.5 bg-red-600 rounded-sm"></div>
                </div>
                <div className="absolute bottom-0 w-full h-3 bg-emerald-500 opacity-50 rounded-full blur-sm"></div>
              </div>
            )}
          </div>
          
          <div className={`flex flex-col ${settings?.headerAlignment === 'center' ? 'items-center' : settings?.headerAlignment === 'right' ? 'items-end' : 'items-start'}`}>
            <h1 className="text-lg font-bold text-black leading-tight tracking-tight uppercase">
              {settings?.hospitalName || 'SAJEDA JABBER HOSPITAL LTD'}
            </h1>
            <p className="text-[10px] text-black font-medium uppercase tracking-wide">
              {settings?.slogan || 'SAKHIPUR BAZAR, SAKHIPUR, SHARIATPUR'}
            </p>
            <div className="mt-1 inline-block border border-slate-300 px-1.5 py-0.5">
              <p className="text-[10px] font-bold text-black uppercase">
                OUTDOOR PATIENT DEPARTMENT (OPD)
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Sections based on Order */}
        {(() => {
          let order = settings?.opdSummarySectionOrder || ['patientSummary', 'ultrasonogram', 'gynecology', 'radiology', 'emergency', 'dentalSurgery', 'cardiology', 'gastroenterology', ...(settings?.opdSummaryCustomSections?.map(s => s.id) || [])];
          if (settings?.opdSummarySectionOrder && !order.includes('dentalSurgery')) {
            order = [...order, 'dentalSurgery'];
          }
          if (settings?.opdSummarySectionOrder && !order.includes('cardiology')) {
            order = [...order, 'cardiology'];
          }
          if (settings?.opdSummarySectionOrder && !order.includes('gastroenterology')) {
            order = [...order, 'gastroenterology'];
          }
          return order.map((sectionId) => {
          // Patient Summary
          if (sectionId === 'patientSummary' && settings?.opdSummarySections?.patientSummary !== false) {
            const fields = settings?.opdSummarySectionFields?.patientSummary || [
              { id: 'new', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.new || 'TOTAL NEW PATIENT', source: 'auto', key: 'new' },
              { id: 'followup', label: settings?.opdSummarySectionFieldLabels?.patientSummary?.followup || 'TOTAL FOLLOW UP', source: 'auto', key: 'followup' }
            ];
            return (
              <div key="patientSummary" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.patientSummary || 'PATIENT SUMMARY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0">DEPARTMENT</th>
                      {fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.summary.map((row, index) => (
                      <tr key={index}>
                        {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={summaryData.summary.length}>{formattedDate}</td>}
                        <td className="border border-dotted border-black px-1 py-0 text-center w-16">{row.sl}</td>
                        <td className="border border-dotted border-black px-1 py-0">{row.name}</td>
                        <td className="border border-dotted border-black px-1 py-0 text-center">{row.department}</td>
                        {fields.map(field => {
                          const value = field.source === 'auto' ? (row as any)[field.key || ''] : (localStats?.patientSummary?.[field.id] || 0);
                          return (
                            <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center">
                              {field.source === 'auto' ? value : (
                                <>
                                  {isEditMode ? (
                                    <input 
                                      type="number" 
                                      value={localStats?.patientSummary?.[field.id] || 0} 
                                      onChange={(e) => updateSectionStat('patientSummary', field.id, e.target.value)} 
                                      className="w-10 text-center border rounded text-[10px]" 
                                    />
                                  ) : (
                                    <span className="font-bold">{localStats?.patientSummary?.[field.id] || 0}</span>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="border border-dotted border-black px-1 py-0 text-right font-bold" colSpan={4}>GRAND TOTAL</td>
                      {fields.map(field => {
                        const total = field.source === 'auto' ? (field.key === 'new' ? summaryData.totalNew : summaryData.totalFollowup) : (localStats?.patientSummary?.[field.id] || 0);
                        return (
                          <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">{total}</td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }

          // Ultrasonogram
          if (sectionId === 'ultrasonogram' && settings?.opdSummarySections?.ultrasonogram !== false) {
            const fields = settings?.opdSummarySectionFields?.ultrasonogram || [
              { id: 'total', label: settings?.opdSummarySectionFieldLabels?.ultrasonogram?.total || 'TOTAL USG', source: 'auto', key: 'total' }
            ];
            return (
              <div key="ultrasonogram" className="mb-1">
                <div className="flex justify-between items-end mb-0.5">
                  <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block uppercase">
                    {settings?.opdSummarySectionTitles?.ultrasonogram || 'ULTRASONOGRAM'}
                  </div>
                  <div className="text-[9px] font-bold text-black uppercase tracking-wider">Daily Procedure Report</div>
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0">DEPARTMENT</th>
                      {fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const manualRows = settings?.opdSummarySectionRows?.ultrasonogram || [];
                      const allRows = [...summaryData.ultrasonogram.doctors, ...manualRows.map(r => ({ id: r.id, name: r.name, department: settings?.opdSummarySectionDepts?.ultrasonogram || summaryData.ultrasonogram.dept, total: 0 }))];
                      return allRows.length > 0 ? (
                        allRows.map((doc, index) => (
                          <tr key={doc.id || index}>
                            {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle" rowSpan={allRows.length}>{formattedDate}</td>}
                            <td className="border border-dotted border-black px-1 py-0 text-center">{index + 1}</td>
                            <td className="border border-dotted border-black px-1 py-0">{doc.name}</td>
                            <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{doc.department}</td>
                            {fields.map(field => {
                              const statKey = doc.id ? `${doc.id}_${field.id}` : field.id;
                              const value = field.source === 'auto' ? (doc as any)[field.key || ''] : (localStats?.ultrasonogram?.[statKey] || 0);
                              return (
                                <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                                  {field.source === 'auto' ? value : (
                                    <>
                                    {isEditMode ? (
                                      <input 
                                        type="number" 
                                        value={localStats?.ultrasonogram?.[statKey] || 0} 
                                        onChange={(e) => updateSectionStat('ultrasonogram', statKey, e.target.value)} 
                                        className="w-10 text-center border rounded text-[10px]" 
                                      />
                                    ) : (
                                      <span className="font-bold">{localStats?.ultrasonogram?.[statKey] || 0}</span>
                                    )}
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-dotted border-black px-1 py-0 text-center">{formattedDate}</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center">1</td>
                          <td className="border border-dotted border-black px-1 py-0 text-slate-400 italic">কোনো ডাক্তার পাওয়া যায়নি</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{settings?.opdSummarySectionDepts?.ultrasonogram || summaryData.ultrasonogram.dept}</td>
                          {fields.map(field => (
                            <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                              {field.source === 'auto' ? 0 : (
                                <>
                                {isEditMode ? (
                                  <input 
                                    type="number" 
                                    value={localStats?.ultrasonogram?.[field.id] || 0} 
                                    onChange={(e) => updateSectionStat('ultrasonogram', field.id, e.target.value)} 
                                    className="w-10 text-center border rounded text-[10px]" 
                                  />
                                ) : (
                                  <span className="font-bold">{localStats?.ultrasonogram?.[field.id] || 0}</span>
                                )}
                                </>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Gynecology
          if (sectionId === 'gynecology' && settings?.opdSummarySections?.gynecology !== false) {
            const fields = settings?.opdSummarySectionFields?.gynecology || [
              { id: 'cesarean', label: settings?.opdSummarySectionFieldLabels?.gynecology?.cesarean || 'CESAREAN OPERATION', source: 'auto', key: 'cesarean' },
              { id: 'normal', label: settings?.opdSummarySectionFieldLabels?.gynecology?.normal || 'NORMAL DELIVERY', source: 'auto', key: 'normal' },
              { id: 'dc', label: settings?.opdSummarySectionFieldLabels?.gynecology?.dc || 'D & C', source: 'auto', key: 'dc' }
            ];
            return (
              <div key="gynecology" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.gynecology || 'GYNECOLOGY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0">DEPARTMENT</th>
                      {fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const manualRows = settings?.opdSummarySectionRows?.gynecology || [];
                      const allRows = [...summaryData.gynecology.doctors, ...manualRows.map(r => ({ id: r.id, name: r.name, department: settings?.opdSummarySectionDepts?.gynecology || 'GYNAE & OBS' }))];
                      return allRows.length > 0 ? (
                        allRows.map((doc, index) => (
                          <tr key={doc.id || index}>
                            {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle" rowSpan={allRows.length}>{formattedDate}</td>}
                            <td className="border border-dotted border-black px-1 py-0 text-center">{index + 1}</td>
                            <td className="border border-dotted border-black px-1 py-0">{doc.name}</td>
                            <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{doc.department}</td>
                            {fields.map(field => {
                              const statKey = doc.id ? `${doc.id}_${field.id}` : field.id;
                              return (
                                <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                                  {isEditMode ? (
                                    <input 
                                      type="number" 
                                      value={localStats?.gynecology?.[statKey] || 0} 
                                      onChange={(e) => updateSectionStat('gynecology', statKey, e.target.value)} 
                                      className="w-10 text-center border rounded text-[10px]" 
                                    />
                                  ) : (
                                    <span className="font-bold">{localStats?.gynecology?.[statKey] || 0}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-dotted border-black px-1 py-0 text-center">{formattedDate}</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center">1</td>
                          <td className="border border-dotted border-black px-1 py-0 text-slate-400 italic">কোনো ডাক্তার পাওয়া যায়নি</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{settings?.opdSummarySectionDepts?.gynecology || 'GYNAE & OBS'}</td>
                          {fields.map(field => (
                            <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                              <input 
                                type="number" 
                                value={localStats?.gynecology?.[field.id] || 0} 
                                onChange={(e) => updateSectionStat('gynecology', field.id, e.target.value)} 
                                disabled={!isEditMode}
                                className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                              />
                              <span className="hidden print:inline">{localStats?.gynecology?.[field.id] || 0}</span>
                            </td>
                          ))}
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Radiology
          if (sectionId === 'radiology' && settings?.opdSummarySections?.radiology !== false) {
            const fields = settings?.opdSummarySectionFields?.radiology || [
              { id: 'ct', label: settings?.opdSummarySectionFieldLabels?.radiology?.ct || 'TOTAL CT-SCAN', source: 'auto', key: 'ct' },
              { id: 'xray', label: settings?.opdSummarySectionFieldLabels?.radiology?.xray || 'TOTAL X-RAY', source: 'auto', key: 'xray' }
            ];
            return (
              <div key="radiology" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.radiology || 'RADIOLOGY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">DEPARTMENT</th>
                      {fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const manualRows = settings?.opdSummarySectionRows?.radiology || [];
                      const rowsToRender = manualRows.length > 0 ? manualRows : [{ id: 'default', name: '' }];
                      return rowsToRender.map((row, index) => (
                        <tr key={row.id}>
                          {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle" rowSpan={rowsToRender.length}>{formattedDate}</td>}
                          <td className="border border-dotted border-black px-1 py-0 text-center">{index + 1}</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{settings?.opdSummarySectionDepts?.radiology || 'RADIOLOGY & IMAGING'}</td>
                          {fields.map(field => {
                            const statKey = manualRows.length > 0 ? `${row.id}_${field.id}` : field.id;
                            return (
                              <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                                {isEditMode ? (
                                  <input 
                                    type="number" 
                                    value={localStats?.radiology?.[statKey] || 0} 
                                    onChange={(e) => updateSectionStat('radiology', statKey, e.target.value)} 
                                    className="w-10 text-center border rounded text-[10px]" 
                                  />
                                ) : (
                                  <span className="font-bold">{localStats?.radiology?.[statKey] || 0}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Emergency
          if (sectionId === 'emergency' && settings?.opdSummarySections?.emergency !== false) {
            const fields = settings?.opdSummarySectionFields?.emergency || [
              { id: 'total', label: settings?.opdSummarySectionFieldLabels?.emergency?.total || 'TOTAL PATIENT', source: 'auto', key: 'total' }
            ];
            return (
              <div key="emergency" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.emergency || 'EMERGENCY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0">DEPARTMENT</th>
                      {fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const manualRows = settings?.opdSummarySectionRows?.emergency || [];
                      const rowsToRender = manualRows.length > 0 ? manualRows : [{ id: 'default', name: summaryData.emergency.doctor }];
                      return rowsToRender.map((row, index) => (
                        <tr key={row.id}>
                          {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle" rowSpan={rowsToRender.length}>{formattedDate}</td>}
                          <td className="border border-dotted border-black px-1 py-0 text-center">{index + 1}</td>
                          <td className="border border-dotted border-black px-1 py-0">{row.name}</td>
                          <td className="border border-dotted border-black px-1 py-0 text-center uppercase">{settings?.opdSummarySectionDepts?.emergency || 'EMERGENCY'}</td>
                          {fields.map(field => {
                            const statKey = manualRows.length > 0 ? `${row.id}_${field.id}` : field.id;
                            return (
                              <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                                {isEditMode ? (
                                  <input 
                                    type="number" 
                                    value={localStats?.emergency?.[statKey] || 0} 
                                    onChange={(e) => updateSectionStat('emergency', statKey, e.target.value)} 
                                    className="w-10 text-center border rounded text-[10px]" 
                                  />
                                ) : (
                                  <span className="font-bold">{localStats?.emergency?.[statKey] || 0}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Dental Surgery
          if (sectionId === 'dentalSurgery' && settings?.opdSummarySections?.dentalSurgery !== false) {
            const fields = settings?.opdSummarySectionFields?.dentalSurgery || [
              { id: 'root_canal', label: 'ROOT CANAL', source: 'auto' },
              { id: 'filling', label: 'FILLING', source: 'auto' },
              { id: 'extraction', label: 'EXTRACTION', source: 'auto' },
              { id: 'pulpectomy', label: 'PULPECTOMY', source: 'auto' },
              { id: 'dental_scalling', label: 'DENTAL SCALING', source: 'auto' }
            ];
            
            const scheduledDoctors = summaryData.dentalSurgery?.doctors || [];
            const manualRows = settings?.opdSummarySectionRows?.dentalSurgery || [];
            
            const allDoctors = [
              ...scheduledDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
              ...manualRows.map(r => ({ id: r.id, name: r.name, department: settings?.opdSummarySectionDepts?.dentalSurgery || 'DENTAL SURGERY' }))
            ];

            if (allDoctors.length === 0) {
              allDoctors.push({ id: 'default', name: 'কোনো ডাক্তার পাওয়া যায়নি', department: settings?.opdSummarySectionDepts?.dentalSurgery || 'DENTAL SURGERY' });
            }

            // Filter out fields that have 0 in both auto and manual stats
            const rowsToRender: any[] = [];
            allDoctors.forEach(doc => {
              fields.forEach(field => {
                const statKey = `${doc.id}_${field.id}`;
                const autoValue = summaryData.dentalSurgery?.autoStats?.[doc.id]?.[field.id] || 0;
                const manualValue = localStats?.dentalSurgery?.[statKey] || 0;
                const displayValue = field.source === 'auto' ? (manualValue || autoValue) : manualValue;
                
                if (displayValue > 0 || isEditMode) {
                  rowsToRender.push({ doc, field, statKey, displayValue });
                }
              });
            });

            if (rowsToRender.length === 0) return null;

            const totalRows = rowsToRender.length;
            let currentSl = 1;

            return (
              <div key="dentalSurgery" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.dentalSurgery || 'DENTAL SURGERY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">DEPARTMENT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF PROCEDURE</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastDocId = '';
                      return rowsToRender.map((row, index) => {
                        const isFirstRowOfDoc = row.doc.id !== lastDocId;
                        if (isFirstRowOfDoc) lastDocId = row.doc.id;
                        
                        // Calculate rowSpan for doctor info
                        const docRows = rowsToRender.filter(r => r.doc.id === row.doc.id).length;

                        return (
                          <tr key={`${row.statKey}_${index}`}>
                            {index === 0 && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={totalRows}>
                                {formattedDate}
                              </td>
                            )}
                            {isFirstRowOfDoc && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={docRows}>
                                {currentSl++}
                              </td>
                            )}
                            
                            {isFirstRowOfDoc && (
                              <>
                                <td className="border border-dotted border-black px-1 py-0 align-middle" rowSpan={docRows}>
                                  {row.doc.id === 'default' ? (
                                    <span className="text-slate-400 italic">{row.doc.name}</span>
                                  ) : (
                                    row.doc.name
                                  )}
                                </td>
                                <td className="border border-dotted border-black px-1 py-0 text-center uppercase align-middle" rowSpan={docRows}>
                                  {row.doc.department}
                                </td>
                              </>
                            )}
                            
                            <td className="border border-dotted border-black px-1 py-0">{row.field.label}</td>
                            <td className="border border-dotted border-black px-1 py-0 text-center font-bold">
                              {row.field.source === 'auto' ? (
                                <>
                                  <input 
                                    type="number" 
                                    value={row.displayValue} 
                                    onChange={(e) => updateSectionStat('dentalSurgery', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{row.displayValue}</span>
                                </>
                              ) : (
                                <>
                                  <input 
                                    type="number" 
                                    value={localStats?.dentalSurgery?.[row.statKey] || 0} 
                                    onChange={(e) => updateSectionStat('dentalSurgery', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{localStats?.dentalSurgery?.[row.statKey] || 0}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Cardiology
          if (sectionId === 'cardiology' && settings?.opdSummarySections?.cardiology !== false) {
            const fields = settings?.opdSummarySectionFields?.cardiology || [
              { id: 'echocardiogram', label: 'ECHOCARDIOGRAM', source: 'auto' },
              { id: 'ecg', label: 'ECG', source: 'auto' },
              { id: 'ett', label: 'ETT', source: 'auto' }
            ];
            
            const scheduledDoctors = summaryData.cardiology?.doctors || [];
            const manualRows = settings?.opdSummarySectionRows?.cardiology || [];
            
            const allDoctors = [
              ...scheduledDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
              ...manualRows.map(r => ({ id: r.id, name: r.name, department: settings?.opdSummarySectionDepts?.cardiology || 'CARDIOLOGY' }))
            ];

            if (allDoctors.length === 0) {
              allDoctors.push({ id: 'default', name: 'কোনো ডাক্তার পাওয়া যায়নি', department: settings?.opdSummarySectionDepts?.cardiology || 'CARDIOLOGY' });
            }

            // Filter out fields that have 0 in both auto and manual stats
            const rowsToRender: any[] = [];
            allDoctors.forEach(doc => {
              fields.forEach(field => {
                const statKey = `${doc.id}_${field.id}`;
                const autoValue = summaryData.cardiology?.autoStats?.[doc.id]?.[field.id] || 0;
                const manualValue = localStats?.cardiology?.[statKey] || 0;
                const displayValue = field.source === 'auto' ? (manualValue || autoValue) : manualValue;
                
                if (displayValue > 0 || isEditMode) {
                  rowsToRender.push({ doc, field, statKey, displayValue });
                }
              });
            });

            if (rowsToRender.length === 0) return null;

            const totalRows = rowsToRender.length;
            let currentSl = 1;

            return (
              <div key="cardiology" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.cardiology || 'CARDIOLOGY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">DEPARTMENT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF PROCEDURE</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastDocId = '';
                      return rowsToRender.map((row, index) => {
                        const isFirstRowOfDoc = row.doc.id !== lastDocId;
                        if (isFirstRowOfDoc) lastDocId = row.doc.id;
                        
                        // Calculate rowSpan for doctor info
                        const docRows = rowsToRender.filter(r => r.doc.id === row.doc.id).length;

                        return (
                          <tr key={`${row.statKey}_${index}`}>
                            {index === 0 && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={totalRows}>
                                {formattedDate}
                              </td>
                            )}
                            {isFirstRowOfDoc && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={docRows}>
                                {currentSl++}
                              </td>
                            )}
                            
                            {isFirstRowOfDoc && (
                              <>
                                <td className="border border-dotted border-black px-1 py-0 align-middle" rowSpan={docRows}>
                                  {row.doc.id === 'default' ? (
                                    <span className="text-slate-400 italic">{row.doc.name}</span>
                                  ) : (
                                    row.doc.name
                                  )}
                                </td>
                                <td className="border border-dotted border-black px-1 py-0 text-center uppercase align-middle" rowSpan={docRows}>
                                  {row.doc.department}
                                </td>
                              </>
                            )}
                            
                            <td className="border border-dotted border-black px-1 py-0">{row.field.label}</td>
                            <td className="border border-dotted border-black px-1 py-0 text-center font-bold">
                              {row.field.source === 'auto' ? (
                                <>
                                  <input 
                                    type="number" 
                                    value={row.displayValue} 
                                    onChange={(e) => updateSectionStat('cardiology', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{row.displayValue}</span>
                                </>
                              ) : (
                                <>
                                  <input 
                                    type="number" 
                                    value={localStats?.cardiology?.[row.statKey] || 0} 
                                    onChange={(e) => updateSectionStat('cardiology', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{localStats?.cardiology?.[row.statKey] || 0}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Gastroenterology
          if (sectionId === 'gastroenterology' && settings?.opdSummarySections?.gastroenterology !== false) {
            const fields = settings?.opdSummarySectionFields?.gastroenterology || [
              { id: 'endoscopy', label: 'ENDOSCOPY', source: 'auto' },
              { id: 'colonoscopy', label: 'COLONOSCOPY', source: 'auto' },
              { id: 'fibroscan', label: 'FIBROSCAN', source: 'auto' },
              { id: 'ercp', label: 'ERCP', source: 'auto' }
            ];
            
            const scheduledDoctors = summaryData.gastroenterology?.doctors || [];
            const manualRows = settings?.opdSummarySectionRows?.gastroenterology || [];
            
            const allDoctors = [
              ...scheduledDoctors.map(d => ({ id: d.id, name: d.name, department: d.department })),
              ...manualRows.map(r => ({ id: r.id, name: r.name, department: settings?.opdSummarySectionDepts?.gastroenterology || 'GASTROENTEROLOGY' }))
            ];

            if (allDoctors.length === 0) {
              allDoctors.push({ id: 'default', name: 'কোনো ডাক্তার পাওয়া যায়নি', department: settings?.opdSummarySectionDepts?.gastroenterology || 'GASTROENTEROLOGY' });
            }

            // Filter out fields that have 0 in both auto and manual stats
            const rowsToRender: any[] = [];
            allDoctors.forEach(doc => {
              fields.forEach(field => {
                const statKey = `${doc.id}_${field.id}`;
                const autoValue = summaryData.gastroenterology?.autoStats?.[doc.id]?.[field.id] || 0;
                const manualValue = localStats?.gastroenterology?.[statKey] || 0;
                const displayValue = field.source === 'auto' ? (manualValue || autoValue) : manualValue;
                
                if (displayValue > 0 || isEditMode) {
                  rowsToRender.push({ doc, field, statKey, displayValue });
                }
              });
            });

            if (rowsToRender.length === 0) return null;

            const totalRows = rowsToRender.length;
            let currentSl = 1;

            return (
              <div key="gastroenterology" className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">
                  {settings?.opdSummarySectionTitles?.gastroenterology || 'GASTROENTEROLOGY'}
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0 w-16">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0 w-16">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">DEPARTMENT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF PROCEDURE</th>
                      <th className="border border-dotted border-black px-1 py-0 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastDocId = '';
                      return rowsToRender.map((row, index) => {
                        const isFirstRowOfDoc = row.doc.id !== lastDocId;
                        if (isFirstRowOfDoc) lastDocId = row.doc.id;
                        
                        // Calculate rowSpan for doctor info
                        const docRows = rowsToRender.filter(r => r.doc.id === row.doc.id).length;

                        return (
                          <tr key={`${row.statKey}_${index}`}>
                            {index === 0 && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={totalRows}>
                                {formattedDate}
                              </td>
                            )}
                            {isFirstRowOfDoc && (
                              <td className="border border-dotted border-black px-1 py-0 text-center align-middle w-16" rowSpan={docRows}>
                                {currentSl++}
                              </td>
                            )}
                            
                            {isFirstRowOfDoc && (
                              <>
                                <td className="border border-dotted border-black px-1 py-0 align-middle" rowSpan={docRows}>
                                  {row.doc.id === 'default' ? (
                                    <span className="text-slate-400 italic">{row.doc.name}</span>
                                  ) : (
                                    row.doc.name
                                  )}
                                </td>
                                <td className="border border-dotted border-black px-1 py-0 text-center uppercase align-middle" rowSpan={docRows}>
                                  {row.doc.department}
                                </td>
                              </>
                            )}
                            
                            <td className="border border-dotted border-black px-1 py-0">{row.field.label}</td>
                            <td className="border border-dotted border-black px-1 py-0 text-center font-bold">
                              {row.field.source === 'auto' ? (
                                <>
                                  <input 
                                    type="number" 
                                    value={row.displayValue} 
                                    onChange={(e) => updateSectionStat('gastroenterology', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{row.displayValue}</span>
                                </>
                              ) : (
                                <>
                                  <input 
                                    type="number" 
                                    value={localStats?.gastroenterology?.[row.statKey] || 0} 
                                    onChange={(e) => updateSectionStat('gastroenterology', row.statKey, e.target.value)} 
                                    disabled={!isEditMode}
                                    className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                  />
                                  <span className="hidden print:inline">{localStats?.gastroenterology?.[row.statKey] || 0}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          // Custom Sections
          const customSection = settings?.opdSummaryCustomSections?.find(s => s.id === sectionId);
          if (customSection && customSection.enabled) {
            return (
              <div key={customSection.id} className="mb-1">
                <div className="border border-black px-1.5 py-0.5 font-bold text-[10px] inline-block mb-0.5 uppercase">{customSection.title}</div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-dotted border-black px-1 py-0">DATE</th>
                      <th className="border border-dotted border-black px-1 py-0">SL</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">NAME OF CONSULTANT</th>
                      <th className="border border-dotted border-black px-1 py-0 text-left">DEPARTMENT</th>
                      {customSection.fields.map(field => (
                        <th key={field.id} className="border border-dotted border-black px-1 py-0 uppercase">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const manualRows = settings?.opdSummarySectionRows?.[customSection.id] || [];
                      const rowsToRender = manualRows.length > 0 ? manualRows : [{ id: 'default', name: '' }];
                      return rowsToRender.map((row, index) => (
                        <tr key={row.id}>
                          {index === 0 && <td className="border border-dotted border-black px-1 py-0 text-center align-middle" rowSpan={rowsToRender.length}>{formattedDate}</td>}
                          <td className="border border-dotted border-black px-1 py-0 text-center">{index + 1}</td>
                          <td className="border border-dotted border-black px-1 py-0">{row.name}</td>
                          <td className="border border-dotted border-black px-1 py-0 text-left uppercase">{customSection.dept || customSection.title}</td>
                          {customSection.fields.map(field => {
                            const statKey = manualRows.length > 0 ? `${row.id}_${field.id}` : field.id;
                            return (
                              <td key={field.id} className="border border-dotted border-black px-1 py-0 text-center font-bold">
                                <input 
                                  type="number" 
                                  value={localStats?.customStats?.[customSection.id]?.[statKey] || 0} 
                                  onChange={(e) => updateCustomStat(customSection.id, statKey, e.target.value)} 
                                  disabled={!isEditMode}
                                  className="w-10 text-center border rounded print:hidden text-[10px] disabled:bg-slate-50 disabled:text-slate-500" 
                                />
                                <span className="hidden print:inline">{localStats?.customStats?.[customSection.id]?.[statKey] || 0}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          return null;
          });
        })()}

        {/* Signature Section */}
        <div className="mt-12 grid grid-cols-3 gap-4 px-4">
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold uppercase mb-4 h-4">{userProfile?.name || '\u00A0'}</p>
            <div className="w-full border-t border-black mb-2"></div>
            <p className="text-[10px] font-bold">PREPARED BY</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold uppercase mb-4 h-4">{'\u00A0'}</p>
            <div className="w-full border-t border-black mb-2"></div>
            <p className="text-[10px] font-bold">HR ADMIN</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold uppercase mb-4 h-4">{'\u00A0'}</p>
            <div className="w-full border-t border-black mb-2"></div>
            <p className="text-[10px] font-bold">APPROVED BY</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[8px] text-slate-400">Printed on: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>
    </div>
  );
}
