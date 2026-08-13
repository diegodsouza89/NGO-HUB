import React, { useState } from 'react';
import { 
  Building2, 
  Globe, 
  ShieldCheck, 
  Search, 
  Menu, 
  X,
  ChevronDown,
  User,
  Bookmark,
  LogIn,
  BookOpen
} from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES, SiteSettings, User as UserType } from '../types';

interface NavbarProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onOpenUserAuth: () => void;
  onOpenUserDashboard: () => void;
  currentUser: UserType | null;
  settings: SiteSettings;
  isAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLanguage,
  onLanguageChange,
  onNavigateHome,
  onOpenSearch,
  onOpenUserAuth,
  onOpenUserDashboard,
  currentUser,
  settings,
  isAdmin,
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Helpline & Admin Bar */}
      <div className="bg-sky-900 text-sky-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              Central Non-Profit Knowledge Hub
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={`${settings.siteName} logo`}
                className="h-12 w-auto max-w-[140px] object-contain"
              />
            ) : null}
            <div className="hidden sm:block">
              <div className="font-bold text-slate-900 text-lg leading-tight tracking-tight group-hover:text-sky-700 transition-colors">
                {settings.siteName}
              </div>
              <div className="text-xs font-semibold text-sky-700 tracking-wide">
                NGO Knowledge & Compliance Portal
              </div>
            </div>
          </div>

          {/* Desktop Navigation Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* User Member Portal Account Button */}
            {currentUser ? (
              <button
                onClick={onOpenUserDashboard}
                className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-2xs"
              >
                <Building2 className="w-4 h-4 text-sky-200" />
                <span className="font-semibold">{currentUser.name.split(' ')[0]}</span>
                <span className="bg-sky-800 text-sky-100 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {currentUser.savedResourceIds?.length || 0} Saved
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenUserAuth}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>NGO Member Login</span>
              </button>
            )}

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4 text-emerald-700" />
                <span>{activeLangObj.nativeName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div 
                  className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setIsLangOpen(false)}
                >
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Select Language / भाषा चुनें
                  </div>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-emerald-50 cursor-pointer transition-colors ${
                        currentLanguage === lang.code ? 'bg-emerald-50/80 font-semibold text-emerald-900' : 'text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </span>
                      <span className="text-xs text-slate-400 font-normal">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <span>{activeLangObj.nativeName}</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              onOpenSearch();
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-slate-700 bg-slate-50 rounded-lg text-sm font-medium"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Search Articles & Toolkits</span>
          </button>

          {currentUser ? (
            <button
              onClick={() => {
                onOpenUserDashboard();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-white bg-emerald-800 rounded-lg text-sm font-semibold"
            >
              <User className="w-4 h-4" />
              <span>My NGO Dashboard ({currentUser.name})</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenUserAuth();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-white bg-slate-900 rounded-lg text-sm font-semibold"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>NGO Member Register / Login</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Language
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${
                    currentLanguage === lang.code ? 'bg-emerald-700 text-white font-medium' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
