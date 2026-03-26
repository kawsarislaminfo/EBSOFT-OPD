import React, { useState } from 'react';
import { Database, Upload, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DataBackupProps {
  onExport: () => Promise<void>;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
}

export default function DataBackup({ onExport, onImport, isExporting, isImporting }: DataBackupProps) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-white to-slate-50 p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 space-y-6 md:space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 md:p-3 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-600/20">
            <Database className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl md:text-2xl text-slate-900">ডেটা ব্যাকআপ ও রিস্টোর</h3>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">আপনার ডেটা সুরক্ষিত রাখুন</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-8">
          {/* Export */}
          <div className="p-4 md:p-8 bg-white border-2 border-slate-200 rounded-xl md:rounded-[2rem] flex flex-col items-center text-center space-y-3 md:space-y-6 hover:border-indigo-300 transition-all h-full">
            <div className="p-2 md:p-4 bg-indigo-50 rounded-full text-indigo-600">
              <Download className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-[11px] md:text-lg text-slate-900 leading-tight">ডেটা এক্সপোর্ট<br className="md:hidden"/>(Backup)</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1 md:mt-2 leading-tight hidden md:block">আপনার হাসপাতালের সমস্ত ডেটা একটি JSON ফাইলে ডাউনলোড করুন।</p>
            </div>
            <button
              onClick={onExport}
              disabled={isExporting}
              className="w-full py-2.5 md:py-4 bg-indigo-600 text-white rounded-lg md:rounded-2xl font-black text-[10px] md:text-base shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 md:gap-2 mt-auto"
            >
              {isExporting ? <Loader2 className="animate-spin w-3 h-3 md:w-4 md:h-4" /> : <Download className="w-3 h-3 md:w-4 md:h-4" />}
              {isExporting ? 'প্রসেসিং...' : <><span className="hidden md:inline">ব্যাকআপ ডাউনলোড করুন</span><span className="md:hidden">ডাউনলোড</span></>}
            </button>
          </div>

          {/* Import */}
          <div className="p-4 md:p-8 bg-white border-2 border-slate-200 rounded-xl md:rounded-[2rem] flex flex-col items-center text-center space-y-3 md:space-y-6 hover:border-emerald-300 transition-all h-full">
            <div className="p-2 md:p-4 bg-emerald-50 rounded-full text-emerald-600">
              <Upload className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-[11px] md:text-lg text-slate-900 leading-tight">ডেটা ইমপোর্ট<br className="md:hidden"/>(Restore)</h4>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1 md:mt-2 leading-tight hidden md:block">একটি ব্যাকআপ ফাইল থেকে ডেটা রিস্টোর করুন।</p>
            </div>
            <label className="w-full py-2.5 md:py-4 bg-emerald-600 text-white rounded-lg md:rounded-2xl font-black text-[10px] md:text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer mt-auto">
              {isImporting ? <Loader2 className="animate-spin w-3 h-3 md:w-4 md:h-4" /> : <Upload className="w-3 h-3 md:w-4 md:h-4" />}
              {isImporting ? 'প্রসেসিং...' : <><span className="hidden md:inline">ব্যাকআপ ফাইল সিলেক্ট করুন</span><span className="md:hidden">সিলেক্ট ফাইল</span></>}
              <input type="file" className="hidden" accept=".json" onChange={onImport} disabled={isImporting} />
            </label>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
          <AlertCircle className="text-amber-600 shrink-0 w-5 h-5 md:w-6 md:h-6" />
          <div>
            <h5 className="font-black text-xs md:text-sm text-amber-900">সতর্কতা!</h5>
            <p className="text-[10px] md:text-xs text-amber-800 font-medium mt-0.5 md:mt-1 leading-relaxed">ডেটা ইমপোর্ট করার আগে বর্তমান ডেটার একটি ব্যাকআপ রাখা জরুরি। ইমপোর্ট করলে বর্তমান ডেটা ওভাররাইট হতে পারে।</p>
          </div>
        </div>
      </div>
    </div>
  );
}
