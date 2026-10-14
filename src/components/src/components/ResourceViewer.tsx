import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  HubResource,
  fetchResourceBlob,
  fileLabel,
  formatSize,
  previewMode,
} from '../lib/resources';
import { ResourceText } from '../lib/resourceText';

interface ResourceViewerProps {
  resource: HubResource;
  text: ResourceText;
  subtitle?: string;
  /** Called with the already-fetched file so the download needs no second fetch. */
  onDownload: (r: HubResource, blob?: Blob) => void;
  onClose: () => void;
}

/**
 * Full-screen viewer: posters as images (with zoom), PDFs in the browser's
 * own viewer, Word (.docx) templates rendered in the page, and text files as
 * plain text. Anything else shows its thumbnail and a download button.
 */
export const ResourceViewer: React.FC<ResourceViewerProps> = ({ resource: r, text: t, subtitle, onDownload, onClose }) => {
  const mode = previewMode(r);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [plain, setPlain] = useState('');
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const docxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fetch the file once when the viewer opens.
  useEffect(() => {
    if (mode === 'none') return;
    let alive = true;
    let objectUrl = '';
    fetchResourceBlob(r, false, (f) => alive && setProgress(f))
      .then(async (b) => {
        if (!alive) return;
        setBlob(b);
        if (mode === 'image' || mode === 'pdf') {
          objectUrl = URL.createObjectURL(b);
          setUrl(objectUrl);
        } else if (mode === 'text') {
          setPlain((await b.text()).slice(0, 200000));
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [r.id, mode]);

  // Render Word documents once the file has arrived. The library is loaded
  // only when someone actually opens a .docx, so it never slows the page.
  useEffect(() => {
    if (mode !== 'docx' || !blob || !docxRef.current) return;
    let alive = true;
    const host = docxRef.current;
    import('docx-preview')
      .then((lib) =>
        lib.renderAsync(blob, host, undefined, {
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
          breakPages: true,
          experimental: false,
        })
      )
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      host.innerHTML = '';
    };
  }, [mode, blob]);

  // Escape closes; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const loading = mode !== 'none' && !failed && !blob;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={r.title}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-5xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-200">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 truncate">{r.title}</h2>
            <p className="text-xs text-slate-500 truncate">
              {subtitle ? subtitle + ' · ' : ''}
              {fileLabel(r)} · {formatSize(r.size)}
            </p>
          </div>
          {mode === 'image' && url && (
            <button
              onClick={() => setZoomed((z) => !z)}
              title={zoomed ? 'Fit' : 'Zoom'}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer hidden sm:inline-flex"
            >
              {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={() => onDownload(r, blob || undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-sky-700 hover:bg-sky-800 text-white cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.download}</span>
          </button>
          <button
            ref={closeRef}
            onClick={onClose}
            title={t.close}
            aria-label={t.close}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-[60vh] sm:h-[78vh] bg-slate-100 overflow-auto relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
              {r.thumbnail && <img src={r.thumbnail} alt="" className="max-h-48 opacity-40 rounded" />}
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.previewLoading} {progress > 0 && progress < 1 ? Math.round(progress * 100) + '%' : ''}
              </span>
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600 text-sm p-6 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="max-w-sm">{t.previewFailed}</p>
            </div>
          )}

          {mode === 'none' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-600 text-sm p-6 text-center">
              {r.thumbnail ? (
                <img src={r.thumbnail} alt={r.title} className="max-h-72 rounded shadow bg-white" />
              ) : (
                <FileText className="w-14 h-14 text-slate-400" />
              )}
              <p className="max-w-sm">{t.noPreview}</p>
            </div>
          )}

          {mode === 'image' && url && !failed && (
            <div
              className={
                'min-h-full flex justify-center p-3 sm:p-6 ' + (zoomed ? 'items-start' : 'items-center')
              }
            >
              <img
                src={url}
                alt={r.title}
                onClick={() => setZoomed((z) => !z)}
                className={
                  'bg-white shadow-lg ' +
                  (zoomed ? 'max-w-none w-[160%] sm:w-auto cursor-zoom-out' : 'max-w-full max-h-[72vh] object-contain cursor-zoom-in')
                }
              />
            </div>
          )}

          {mode === 'pdf' && url && !failed && (
            <iframe src={url} title={r.title} className="w-full h-full min-h-[60vh] border-0 bg-white" />
          )}

          {mode === 'docx' && !failed && (
            <div ref={docxRef} className="docx-viewer min-h-full [&_.docx-wrapper]:bg-slate-100 [&_.docx-wrapper]:p-3 sm:[&_.docx-wrapper]:p-6 [&_section.docx]:shadow-lg [&_section.docx]:mx-auto" />
          )}

          {mode === 'text' && blob && !failed && (
            <pre className="p-5 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words bg-white min-h-full">{plain}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
