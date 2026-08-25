import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldCheck, RefreshCcw, Check, BarChart2, AlertTriangle, Download, UploadCloud } from 'lucide-react';
import { Article, Category, SiteSettings, SUPPORTED_LANGUAGES } from '../../types';
import { buildContentJson, downloadContentJson, summariseContent } from '../../lib/exportContent';
import { saveSettings, resetToDefaults } from '../../lib/storage';
import { canHash, hashPassword, isDefaultPassword } from '../../lib/adminAuth';

interface SettingsManagerProps {
  settings: SiteSettings;
  categories: Category[];
  articles: Article[];
  onSettingsUpdated: (settings: SiteSettings) => void;
  onResetData: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  categories,
  articles,
  onSettingsUpdated,
  onResetData,
}) => {
  const [formData, setFormData] = useState<SiteSettings>({ ...settings, logoUrl: settings.logoUrl || '' });
  const [newPassword, setNewPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'done' | 'blocked'>('idle');
  const [usingDefaultPassword, setUsingDefaultPassword] = useState(false);

  // Warn while the shipped password is still in force. Checked here rather than
  // on the login screen, so the warning is only visible to someone already in.
  useEffect(() => {
    let cancelled = false;
    isDefaultPassword(settings.adminPasswordHash).then((isDefault) => {
      if (!cancelled) setUsingDefaultPassword(isDefault);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.adminPasswordHash]);

  const initialFormData = { ...settings, logoUrl: settings.logoUrl || '' };
  const contentJson = buildContentJson(categories, articles);
  const summary = summariseContent(categories, articles, contentJson);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If a field constraint blocks the form, browsers cancel submit silently.
    // Report it rather than letting Save look broken.
    const form = e.currentTarget as HTMLFormElement;
    if (form && typeof form.checkValidity === 'function' && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = { ...formData };
      const typed = newPassword.trim();
      if (typed) {
        // Store a PBKDF2 hash rather than the password itself. Over plain http
        // WebCrypto is unavailable, so fall back to the old behaviour instead
        // of refusing to save.
        updated.adminPasswordHash = canHash() ? await hashPassword(typed) : typed;
      }

      saveSettings(updated);
      onSettingsUpdated(updated);
      setSavedSuccess(true);
      setNewPassword('');
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
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
              {/*
                These two fields used to be `required` while shipping empty.
                The browser then blocked the form's submit event without any
                visible message, so Save All Settings did nothing at all - a
                password change included. They are genuinely optional, so the
                constraint is gone. type="email" still rejects a malformed
                address when one is actually entered.
              */}
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                placeholder="Optional — shown on the contact form"
                className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Toll-Free Helpline Phone
              </label>
              <input
                type="text"
                value={formData.helplinePhone}
                onChange={(e) => setFormData({ ...formData, helplinePhone: e.target.value })}
                placeholder="Optional"
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
            {usingDefaultPassword && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>
                  This portal is still using the password it shipped with. Anyone who
                  knows it can open <span className="font-mono">/staff</span>. Set a new
                  one below.
                </span>
              </div>
            )}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep existing password..."
              className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Saved as a PBKDF2 hash, not as readable text. Note that /staff is a
              client-side screen — see ADMIN-SECURITY.md for how to make it a real lock.
            </p>
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

      {/* ----------------------------------------------------------------- */}
      {/* Publishing. Everything above is stored in this browser only; the    */}
      {/* file below is what every visitor actually sees.                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 border-b border-stone-100 pb-2 flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          Publish to the live site
        </h3>

        <p className="text-xs text-stone-500 mt-3 leading-relaxed">
          Articles and categories you edit here are saved in <strong>this browser only</strong>.
          Visitors see <code className="bg-stone-100 px-1 py-0.5 rounded">content.json</code> from
          GitHub, and your local copy is replaced whenever that file changes. Download the file
          below and upload it to GitHub to publish your work to everyone.
        </p>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-stone-900">{summary.categories}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">Categories</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-900">{summary.published}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">Published</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-900">{summary.drafts}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">Drafts</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-900">{Math.round(summary.bytes / 1024)} KB</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">File size</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">
              Articles with a translated body
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.coverage.map((c) => {
                const info = SUPPORTED_LANGUAGES.find((l) => l.code === c.code);
                const complete = c.translated === summary.articles && summary.articles > 0;
                return (
                  <span
                    key={c.code}
                    title={(info ? info.name : c.code) + ': ' + c.translated + ' of ' + summary.articles}
                    className={
                      'px-2 py-0.5 rounded-md text-[11px] font-semibold border ' +
                      (complete
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : c.translated === 0
                          ? 'bg-stone-100 border-stone-200 text-stone-400'
                          : 'bg-amber-50 border-amber-200 text-amber-800')
                    }
                  >
                    {info ? info.nativeName : c.code} {c.translated}/{summary.articles}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const saved = downloadContentJson(contentJson);
            setExportState(saved ? 'done' : 'blocked');
            setTimeout(() => setExportState('idle'), 6000);
          }}
          className="mt-4 inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download content.json</span>
        </button>

        {exportState === 'done' && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Saved. Two steps left:
            </div>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>
                Open{' '}
                <a
                  href="https://github.com/diegodsouza89/NGO-HUB/upload/main/src/components/src/data"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  the data folder on GitHub
                </a>
              </li>
              <li>Drag <code className="bg-white px-1 rounded">content.json</code> in and commit. The site rebuilds in 2–3 minutes.</li>
            </ol>
          </div>
        )}

        {exportState === 'blocked' && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-900">
            Your browser blocked the download. Try a normal browser window rather than an
            in-app one, or allow downloads for this site.
          </div>
        )}
      </div>
    </div>
  );
};
