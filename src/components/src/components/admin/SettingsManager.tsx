import React, { useState } from 'react';
import { Settings, Save, ShieldCheck, RefreshCcw, Check, BarChart2 } from 'lucide-react';
import { SiteSettings } from '../../types';
import { saveSettings, resetToDefaults } from '../../lib/storage';

interface SettingsManagerProps {
  settings: SiteSettings;
  onSettingsUpdated: (settings: SiteSettings) => void;
  onResetData: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onSettingsUpdated,
  onResetData,
}) => {
  const [formData, setFormData] = useState<SiteSettings>({ ...settings, logoUrl: settings.logoUrl || '' });
  const [newPassword, setNewPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const initialFormData = { ...settings, logoUrl: settings.logoUrl || '' };
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) || newPassword.trim().length > 0;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData({ ...formData, logoUrl: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated = { ...formData };
    if (newPassword.trim()) {
      updated.adminPasswordHash = newPassword.trim();
    }

    saveSettings(updated);
    onSettingsUpdated(updated);
    setSavedSuccess(true);
    setNewPassword('');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (confirm('WARNING: This will reset all categories, articles, views, and settings to the initial sample data. Continue?')) {
      resetToDefaults();
      onResetData();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-800" />
          Help Center Settings
        </h1>
        <p className="text-stone-500 text-xs mt-1">
          Configure branding, support helpline numbers, Google Analytics, and admin password.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs p-3 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-2xs">
        {/* Site Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-emerald-900 border-b border-stone-100 pb-2">
            General Site Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Organization / Site Name
            </label>
            <input
              type="text"
              required
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Brand Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium bg-stone-50"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Upload a logo for the public side. Leave empty to hide the logo completely.
            </p>
            {formData.logoUrl ? (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={formData.logoUrl}
                    alt="Brand logo preview"
                    className="h-14 w-auto object-contain"
                  />
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-full">
                    Live preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoUrl: '' })}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-800 underline underline-offset-2 cursor-pointer"
                >
                  Remove Logo
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-500">
                No logo selected yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                required
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Toll-Free Helpline Phone
              </label>
              <input
                type="text"
                required
                value={formData.helplinePhone}
                onChange={(e) => setFormData({ ...formData, helplinePhone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
              />
            </div>
          </div>
        </div>

        {/* Analytics & Security */}
        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-emerald-900 border-b border-stone-100 pb-2">
            Google Analytics & Security
          </h3>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Google Analytics (GA4) Measurement ID (Optional)
            </label>
            <input
              type="text"
              value={formData.ga4Id}
              onChange={(e) => setFormData({ ...formData, ga4Id: e.target.value })}
              placeholder="e.g. G-1234567890"
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-mono"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              If entered, Google Analytics tracks parallel traffic visits across your help center.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Change Admin Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep existing password..."
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-stone-100">
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            disabled={!isDirty}
            className={`flex items-center gap-2 font-medium px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors ${
              isDirty
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
