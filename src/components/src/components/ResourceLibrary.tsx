import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
  LayoutTemplate,
  AlertCircle,
} from 'lucide-react';
import { Category, Language, SUPPORTED_LANGUAGES } from '../types';
import {
  HubResource,
  KIND_ORDER,
  ResourceKind,
  countDownload,
  downloadResource,
  fetchResources,
  fileLabel,
  formatSize,
  languageName,
  resourceLanguage,
  saveBlob,
} from '../lib/resources';
import { resourceText } from '../lib/resourceText';
import { ResourceViewer } from './ResourceViewer';

interface ResourceLibraryProps {
  categories: Category[];
  currentLanguage: Language;
  onBackToHome: () => void;
}

type Filter = 'all' | ResourceKind;
type LangFilter = 'all' | Language;

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ categories, currentLanguage, onBackToHome }) => {
  const t = resourceText(currentLanguage);
  const [items, setItems] = useState<HubResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [query, setQuery] = useState('');
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<HubResource | null>(null);

  useEffect(() => {
    let alive = true;
    fetchResources(false).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (!res.available) setUnavailable(true);
      setItems(res.items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const catName = (id?: string) => {
    if (!id) return '';
    const c = categories.find((x) => x.id === id);
    return c ? c.names[currentLanguage] || c.names.en || '' : '';
  };

  // Languages that actually have files, in the site picker's order.
  const languagesPresent = useMemo(() => {
    const set = new Set(items.map((r) => resourceLanguage(r)));
    return SUPPORTED_LANGUAGES.filter((l) => set.has(l.code));
  }, [items]);

  const q = query.trim().toLowerCase();
  const shown = items
    .filter(
      (r) =>
        (filter === 'all' || r.kind === filter) &&
        (langFilter === 'all' || resourceLanguage(r) === langFilter) &&
        (!q ||
          (r.title + ' ' + r.description + ' ' + catName(r.categoryId) + ' ' + languageName(resourceLanguage(r)))
            .toLowerCase()
            .includes(q))
    )
    // Files in the visitor's chosen site language come first.
    .sort((a, b) => {
      const pa = resourceLanguage(a) === currentLanguage ? 0 : 1;
      const pb = resourceLanguage(b) === currentLanguage ? 0 : 1;
      return pa - pb;
    });

  const handleDownload = useCallback(async (r: HubResource, blob?: Blob) => {
    setRowError((e) => ({ ...e, [r.id]: '' }));
    if (blob) {
      saveBlob(blob, r.fileName);
      countDownload(r.id);
      return;
    }
    setDownloading((d) => ({ ...d, [r.id]: 0 }));
    try {
      await downloadResource(r, {
        onProgress: (f) => setDownloading((d) => ({ ...d, [r.id]: f })),
      });
    } catch {
      setRowError((e) => ({ ...e, [r.id]: 'error' }));
    } finally {
      setDownloading((d) => {
        const next = { ...d };
        delete next[r.id];
        return next;
      });
    }
  }, []);

  const closeViewer = useCallback(() => setViewing(null), []);

  const tabs: Filter[] = ['all', ...KIND_ORDER];
  const countOf = (f: Filter) => (f === 'all' ? items.length : items.filter((r) => r.kind === f).length);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <button onClick={onBackToHome} className="hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.home}</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-sky-900 font-bold">{t.title}</span>
      </div>

      <div className="bg-gradient-to-r from-sky-50 via-blue-50/60 to-sky-100/50 border border-sky-200/80 rounded-3xl p-6 sm:p-10 mb-8 shadow-xs">
        <div className="inline-flex items-center gap-1.5 bg-sky-100/90 text-sky-950 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-sky-200">
          <LayoutTemplate className="w-3.5 h-3.5 text-sky-700" />
          <span>{t.badge}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">{t.title}</h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">{t.intro}</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs
            .filter((f) => f === 'all' || countOf(f) > 0)
            .map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  'px-3.5 py-1.5 rounded-full text-sm font-semibold cursor-pointer whitespace-nowrap transition-colors ' +
                  (filter === f ? 'bg-sky-800 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')
                }
              >
                {f === 'all' ? t.all : t.kindPlurals[f]} ({countOf(f)})
              </button>
            ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {languagesPresent.length > 1 && (
            <label className="relative sm:w-48">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value as LangFilter)}
                aria-label={t.language}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-sky-600 cursor-pointer appearance-none"
              >
                <option value="all">{t.allLanguages}</option>
                {languagesPresent.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({items.filter((r) => resourceLanguage(r) === l.code).length})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="relative sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-sky-600"
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          {t.loading}
        </div>
      ) : unavailable ? (
        <div className="py-12 text-center text-slate-600 text-sm">{t.unavailable}</div>
      ) : !shown.length ? (
        <div className="py-12 text-center text-slate-600 text-sm">{items.length ? t.noMatch : t.empty}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((r) => {
            const progress = downloading[r.id];
            const busy = progress !== undefined;
            const lang = resourceLanguage(r);
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
                <button
                  type="button"
                  onClick={() => setViewing(r)}
                  aria-label={t.view + ': ' + r.title}
                  className="group relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden cursor-zoom-in"
                >
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt={r.title} className="w-full h-full object-contain bg-white" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      {r.kind === 'poster' ? <ImageIcon className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                      <span className="text-xs font-bold tracking-wider">{fileLabel(r)}</span>
                    </div>
                  )}
                  <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 bg-white text-slate-900 text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                      <Eye className="w-4 h-4" /> {t.view}
                    </span>
                  </span>
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                      {t.kindLabels[r.kind] || t.kindLabels.other}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {languageName(lang)}
                    </span>
                    {catName(r.categoryId) && (
                      <span className="text-[11px] text-slate-500 truncate">{catName(r.categoryId)}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 leading-snug">{r.title}</h3>
                  {r.description && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{r.description}</p>}
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {fileLabel(r)} · {formatSize(r.size)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-sky-200 text-sky-800 bg-white hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {t.view}
                      </button>
                      <button
                        onClick={() => handleDownload(r)}
                        disabled={busy}
                        className={
                          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ' +
                          (busy ? 'bg-slate-200 text-slate-600 cursor-wait' : 'bg-sky-700 hover:bg-sky-800 text-white cursor-pointer')
                        }
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {busy ? Math.round(progress * 100) + '%' : t.download}
                      </button>
                    </div>
                  </div>
                  {rowError[r.id] && (
                    <p className="text-xs text-rose-700 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {t.downloadFailed}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <ResourceViewer
          resource={viewing}
          text={t}
          subtitle={t.kindLabels[viewing.kind] + ' · ' + languageName(resourceLanguage(viewing))}
          onDownload={handleDownload}
          onClose={closeViewer}
        />
      )}
    </div>
  );
};
