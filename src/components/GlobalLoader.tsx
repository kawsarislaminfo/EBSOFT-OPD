import React from 'react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface GlobalLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  message?: string;
  className?: string;
  useCustomLogo?: boolean;
}

export default function GlobalLoader({ size = 'md', message, className, useCustomLogo = false }: GlobalLoaderProps) {
  const { settings } = useSettings();
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    full: 'w-32 h-32',
  };

  const defaultLogo = "https://storage.googleapis.com/static-assets-aistudio/input_file_0.png";
  const logoUrl = (useCustomLogo && settings?.loaderLogoUrl) ? settings.loaderLogoUrl : (settings?.hospitalLogo || defaultLogo);

  // Modern and stylish medical loader (Stylized Medical Cross + Pulse)
  const MedicalPulse = () => (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-[ping_2s_infinite]" />
      <div className="absolute inset-2 bg-blue-500/20 rounded-full animate-[pulse_1.5s_infinite]" />
      
      {/* The Medical Cross */}
      <div className="relative z-10 text-blue-600 flex items-center justify-center w-full h-full">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]">
          {/* Stylized Cross with a Pulse Line */}
          <path d="M12 2v20M2 12h20" className="opacity-20" />
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" className="animate-[dash_2s_ease-in-out_infinite]" strokeDasharray="60" strokeDashoffset="60" />
        </svg>
      </div>
      
      {/* CSS for the dash animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}} />
    </div>
  );

  if (size === 'full') {
    return (
      <div className={cn("fixed inset-0 bg-white/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center", className)}>
        <div className="relative mb-8">
          {useCustomLogo && settings?.loaderLogoUrl ? (
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
              <img 
                src={logoUrl} 
                alt="Hospital Logo" 
                className="w-32 h-32 relative z-10 animate-pulse object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <MedicalPulse />
          )}
        </div>
        {message && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl font-black text-slate-900 tracking-tight">{message || settings?.hospitalName}</p>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      {useCustomLogo && settings?.loaderLogoUrl ? (
        <img 
          src={logoUrl} 
          alt="Hospital Logo" 
          className={cn("animate-pulse object-contain", sizeClasses[size])}
          referrerPolicy="no-referrer"
        />
      ) : (
        <MedicalPulse />
      )}
      {message && <p className="mt-4 text-sm font-bold text-slate-600 tracking-wide">{message}</p>}
    </div>
  );
}
