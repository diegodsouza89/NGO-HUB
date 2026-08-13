import React from 'react';
import { Building2, PhoneCall, Mail, ShieldCheck, Heart, Globe } from 'lucide-react';
import { SiteSettings, Language, SUPPORTED_LANGUAGES } from '../types';

interface FooterProps {
  settings: SiteSettings;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenContact: () => void;
  onNavigateHome: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  currentLanguage,
  onLanguageChange,
  onOpenContact,
  onNavigateHome,
}) => {
  return (
    <footer className="bg-slate-100 text-slate-700 pt-12 pb-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                <Building2 className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg block leading-tight">
                  {settings.siteName}
                </span>
              </div>
            </div>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md">
              {settings.tagline}
            </p>
          </div>

          {/* Quick Support Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Community Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={onOpenContact} className="hover:text-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Submit Support Ticket</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Languages & Staff Access */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Language & Portal
            </h4>
            <div className="flex flex-wrap gap-1">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                    currentLanguage === lang.code ? 'bg-emerald-800 text-white font-bold border-emerald-800' : 'bg-white text-slate-700 hover:bg-emerald-50 border-slate-200'
                  }`}
                >
                  {lang.flag} {lang.nativeName}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {settings.siteName}. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <span>Empowering non-profits and social impact organizations</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
