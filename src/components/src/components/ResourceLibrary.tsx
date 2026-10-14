import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  LayoutTemplate,
  AlertCircle,
} from 'lucide-react';
import { Category } from '../types';
import {
  HubResource,
  KIND_LABELS,
  KIND_ORDER,
  KIND_PLURALS,
  ResourceKind,
  downloadResource,
  fetchResources,
  fileLabel,
  formatSize,
} from '../lib/resources';

interface ResourceLibraryProps {
  categories: Category[];
  onBackToHome: () => void;
}

type Filter = 'all' | ResourceKind;

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ categories, onBackToHome }) => {
  const [items, setItems] = useState<HubResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    fetchResources(false).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (!res.available) setError('Posters and templates are not available right now. Please try again later.');
      setItems(res.items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const catName = (id?: string) => (id ? categories.find((c) => c.id === id)?.names.en || '' : '');

  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (r) =>
      (filter === 'all' || r.kind === filter) &&
      (!q || (r.title + ' ' + r.description + ' ' + catName(r.categoryId)).toLowerCase().includes(q))
  );

  const handleDownload = async (r: HubResource) => {
    setRowError((e) => ({ ...e, [r.id]: '' }));
    setDownloading((d) => ({ ...d, [r.id]: 0 }));
    try {
      await downloadResource(r, {
        onProgress: (f) => setDownloading((d) => ({ ...d, [r.id]: f })),
      });
    } catch {
      setRowError((e) => ({ ...e, [r.id]: 'Download failed. Please try again.' }));
    } finally {
      setDownloading((d) => {
        const next = { ...d };
        delete next[r.id];
        return next;
      });
    }
  };

  const tabs: Filter[] = ['all', ...KIND_ORDER];
  const countOf = (f: Filter) => (f === 'all' ? items.length : items.filter((r) => r.kind === f).length);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <button onClick={onBackToHome} className="hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Hub Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-sky-900 font-bold">Posters, SOPs &amp; Policy Templates</span>
      </div>

      <div className="bg-gradient-to-r from-sky-50 via-blue-50/60 to-sky-100/50 border border-sky-200/80 rounded-3xl p-6 sm:p-10 mb-8 shadow-xs">
        <div className="inline-flex items-center gap-1.5 bg-sky-100/90 text-sky-950 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-sky-200">
          <LayoutTemplate className="w-3.5 h-3.5 text-sky-700" />
          <span>Free to download and use</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">Posters, SOPs &amp; Policy Templates</h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
          Ready-made posters, SOPs, policy and document templates for your organisation. Download, adapt and use them in your work.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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
                {f === 'all' ? 'All' : KIND_PLURALS[f]} ({countOf(f)})
              </button>
            ))}
        </div>
        <label className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posters, SOPs & policies"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-sky-600"
          />
        </label>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
          Loading…
        </div>
      ) : error ? (
        <div className="py-12 text-center text-slate-600 text-sm">{error}</div>
      ) : !shown.length ? (
        <div className="py-12 text-center text-slate-600 text-sm">
          {items.length ? 'Nothing matches your search.' : 'Nothing has been added yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((r) => {
            const progress = downloading[r.id];
            const busy = progress !== undefined;
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt={r.title} className="w-full h-full object-contain bg-white" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      {r.kind === 'poster' ? <ImageIcon className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                      <span className="text-xs font-bold tracking-wider">{fileLabel(r)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                      {KIND_LABELS[r.kind]}
                    </span>
                    {catName(r.categoryId) && (
                      <span className="text-[11px] text-slate-500 truncate">{catName(r.categoryId)}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 leading-snug">{r.title}</h3>
                  {r.description && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{r.description}</p>}
                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {fileLabel(r)} · {formatSize(r.size)}
                    </span>
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={busy}
                      className={
                        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ' +
                        (busy ? 'bg-slate-200 text-slate-600 cursor-wait' : 'bg-sky-700 hover:bg-sky-800 text-white cursor-pointer')
                      }
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {busy ? Math.round(progress * 100) + '%' : 'Download'}
                    </button>
                  </div>
                  {rowError[r.id] && (
                    <p className="text-xs text-rose-700 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {rowError[r.id]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
