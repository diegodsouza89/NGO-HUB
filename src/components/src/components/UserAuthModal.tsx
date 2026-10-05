import React, { useState } from 'react';
import { X, Building2, User, Mail, Briefcase, Globe, LogIn, UserPlus } from 'lucide-react';
import { setCurrentUser } from '../lib/storage';
import { registerMember, loginMember } from '../lib/members';
import { User as UserType } from '../types';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [error, setError] = useState<string | null>(null);
  
  // Registration Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [role, setRole] = useState('Program Manager');
  const [sector, setSector] = useState('Education & Rural Development');

  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !organizationName.trim()) {
      setError('Please fill in all required fields (Name, Email, Organization).');
      return;
    }

    setBusy(true);
    const result = await registerMember({ name, email, organizationName, role, sector });
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.error || 'Registration failed.');
      return;
    }
    setCurrentUser(result.data);
    onSuccess(result.data);
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setBusy(true);
    const result = await loginMember(email);
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.error || 'Login failed.');
      return;
    }
    setCurrentUser(result.data);
    onSuccess(result.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-800 to-blue-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-sky-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-6 h-6 text-sky-300" />
            <span className="text-xs uppercase tracking-wider font-semibold text-sky-200">NGO Knowledge Hub</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">NGO Professional Portal</h2>
          <p className="text-sm text-sky-100/90 mt-1">
            Access tool guides, eligibility checklists and setup walkthroughs built for social sector teams.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`flex-1 py-3 px-4 text-sm font-semibold text-center flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'border-sky-600 text-sky-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register NGO
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`flex-1 py-3 px-4 text-sm font-semibold text-center flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'border-sky-600 text-sky-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Member Login
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourngo.org"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  NGO / Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Your organisation name"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Role / Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    >
                      <option value="Executive Director">Executive Director / Founder</option>
                      <option value="Program Manager">Program Manager</option>
                      <option value="Fundraising & CSR">Fundraising & CSR Lead</option>
                      <option value="Compliance Officer">Compliance / Legal Officer</option>
                      <option value="M&E Specialist">M&E Specialist</option>
                      <option value="Field Coordinator">Field Coordinator</option>
                      <option value="Volunteer / Fellow">Volunteer / Fellow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    NGO Focus Sector
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    >
                      <option value="Education & Rural Development">Education & Literacy</option>
                      <option value="Healthcare & WASH">Healthcare & Sanitation</option>
                      <option value="Environment & Climate">Environment & Climate</option>
                      <option value="Women Empowerment & Livelihood">Women & Livelihood</option>
                      <option value="Disaster Relief & General">Disaster Relief & General</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="disabled:opacity-60 w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Complete NGO Registration & Access
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourngo.org"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="disabled:opacity-60 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Knowledge Portal
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
