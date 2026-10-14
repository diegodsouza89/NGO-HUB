import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Pencil,
  X,
} from 'lucide-react';
import { Category } from '../../types';
import { getPublishKey, setPublishKey } from '../../lib/publishContent';
import {
  ACCEPT_ATTR,
  HubResource,
  KIND_LABELS,
  KIND_ORDER,
  KIND_PLURALS,
  MAX_FILE_BYTES,
  ResourceKind,
  deleteResource,
  downloadResource,
  fetchResources,
  fileLabel,
  formatSize,
  isAllowedFile,
  updateResource,
  uploadResource,
} from '../../lib/resources';

/**
 * Admin tab: upload posters and document templates that visitors can download
 * from the public "Posters & Templates" page. Stored in D1 via /api/resources,
 * guarded by the same CONTENT_ADMIN_KEY used for publishing content.
 */

interface ResourceManagerProps {
  categories: Category[];
}

type Filter = 'all' | ResourceKind;

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ categories }) => {
  const [keyInput, setKeyInput] = useState(getPublishKey());
  const [items, setItems] = useState<HubResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isAdminKeyValid, setIsAdminKeyValid] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<ResourceKind>('poster');
  const [categoryId, setCategoryId] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Row actions
  const [busyId, setBusyId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [editing, setEditing] = useState<HubResource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await fetchResources(true);
    setLoading(false);
    if (!result.available) {
      setLoadError(result.error || 'Could not load posters and templates.');
      return;
    }
    setItems(result.items);
    setIsAdminKeyValid(getPublishKey() ? result.admin : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveKey = () => {
    setPublishKey(keyInput.trim());
    load();
  };

  const pickFile = (f: File | null) => {
    setFormError('');
    setNotice('');
    if (!f) return;
    if (!isAllowedFile(f)) {
      setFormError('That file type is not supported. Use PDF, PNG, JPG, WEBP, Word, Excel, PowerPoint, ODT, CSV, TXT or ZIP.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFormError('That file is ' + formatSize(f.size) + '. The limit is 25 MB — try compressing it first.');
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(titleFromFileName(f.name));
    if (/\.(png|jpe?g|webp)$/i.test(f.name)) setKind('poster');
    else if (/polic/i.test(f.name)) setKind('policy');
    else if (/\.(docx?|xlsx?|pptx?|odt|csv|txt)$/i.test(f.name)) setKind('template');
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setPublishNow(true);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setNotice('');
    if (!getPublishKey()) {
      setFormError('Enter and save the admin key above first.');
      return;
    }
    if (!file) {
      setFormError('Choose a file to upload.');
      return;
    }
    if (!title.trim()) {
      setFormError('Give it a title.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const item = await uploadResource(
        { file, title: title.trim(), description: description.trim(), kind, categoryId, published: publishNow },
        setProgress
      );
      setItems((prev) => [item, ...prev]);
      setNotice(
        '“' + item.title + '” uploaded' + (item.published ? ' and is live on the Posters & Policy Templates page.' : ' as a draft.')
      );
      resetForm();
    } catch (err) {
      setFormError((err as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (r: HubResource) => {
    setBusyId(r.id);
    try {
      const updated = await updateResource(r.id, { published: !r.published });
      setItems((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (r: HubResource) => {
    if (confirmDeleteId !== r.id) {
      setConfirmDeleteId(r.id);
      return;
    }
    setBusyId(r.id);
    try {
      await deleteResource(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      setConfirmDeleteId('');
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const handleDownload = async (r: HubResource) => {
    setBusyId(r.id);
    try {
      await downloadResource(r, { asAdmin: true });
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const updated = await updateResource(editing.id, {
        title: editing.title,
        description: editing.description,
        kind: editing.kind,
        categoryId: editing.categoryId || '',
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const catName = (id?: string) => {
    if (!id) return '';
    const c = categories.find((x) => x.id === id);
    return c ? c.names.en : '';
  };

  const shown = filter === 'all' ? items : items.filter((r) => r.kind === filter);
  const hasKey = !!getPublishKey();

  const inputCls =
    'w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Posters &amp; Policy Templates</h2>
          <p className="text-sm text-stone-600 mt-1">
            Upload posters, policies and document templates. Published files appear on the public{' '}
            <span className="font-semibold">Posters &amp; Policy Templates</span> page for anyone to download.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
        >
          <RefreshCcw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} />
          Refresh
        </button>
      </div>

      {/* Admin key */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Admin key</span>
          {hasKey && isAdminKeyValid === true && (
            <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> accepted
            </span>
          )}
          {hasKey && isAdminKeyValid === false && (
            <span className="text-[11px] font-semibold text-rose-700">not accepted by the server</span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="CONTENT_ADMIN_KEY (same key as Publish in Site Settings)"
            autoComplete="off"
            className={inputCls}
          />
          <button
            onClick={saveKey}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer shrink-0"
          >
            Save key
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Upload form */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-stone-900">Upload a new file</h3>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0] || null);
          }}
          className={
            'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ' +
            (dragOver ? 'border-amber-500 bg-amber-50' : 'border-stone-300 hover:border-amber-400 bg-stone-50')
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="text-sm text-stone-800">
              <span className="font-semibold">{file.name}</span>{' '}
              <span className="text-stone-500">({formatSize(file.size)})</span>
              <div className="text-xs text-stone-500 mt-1">Click to choose a different file</div>
            </div>
          ) : (
            <div className="text-sm text-stone-600">
              <span className="font-semibold text-stone-800">Drop a file here</span> or click to browse
              <div className="text-xs text-stone-500 mt-1">
                PDF, PNG, JPG, WEBP, Word, Excel, PowerPoint, ODT, CSV, TXT or ZIP — up to 25 MB
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-semibold text-stone-700 mb-1">Title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-stone-700 mb-1">Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)} className={inputCls}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-semibold text-stone-700 mb-1">Short description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="What it's for and how to use it"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-stone-700 mb-1">Category (optional)</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names.en}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 sm:mt-6 text-sm text-stone-700 cursor-pointer">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            Publish straight away
          </label>
        </div>

        {formError && (
          <div role="alert" className="text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {formError}
          </div>
        )}
        {notice && (
          <div className="text-sm text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            {notice}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={uploading}
            className={
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold ' +
              (uploading ? 'bg-stone-300 text-stone-600 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer')
            }
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? 'Uploading… ' + Math.round(progress * 100) + '%' : 'Upload'}
          </button>
          {uploading && (
            <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: Math.round(progress * 100) + '%' }} />
            </div>
          )}
        </div>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center gap-1 p-3 border-b border-stone-200 overflow-x-auto">
          {(['all', ...KIND_ORDER] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ' +
                (filter === f ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')
              }
            >
              {f === 'all' ? 'All' : KIND_PLURALS[f]} (
              {f === 'all' ? items.length : items.filter((r) => r.kind === f).length})
            </button>
          ))}
        </div>

        {loading && !items.length ? (
          <div className="p-8 text-center text-sm text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
          </div>
        ) : !shown.length ? (
          <div className="p-8 text-center text-sm text-stone-500">Nothing uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {shown.map((r) => (
              <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : r.kind === 'poster' ? (
                    <ImageIcon className="w-6 h-6 text-stone-400" />
                  ) : (
                    <FileText className="w-6 h-6 text-stone-400" />
                  )}
                </div>

                {editing && editing.id === r.id ? (
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      className={inputCls}
                    />
                    <select
                      value={editing.kind}
                      onChange={(e) => setEditing({ ...editing, kind: e.target.value as ResourceKind })}
                      className={inputCls}
                    >
                      {KIND_ORDER.map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      rows={2}
                      className={inputCls + ' sm:col-span-2'}
                    />
                    <select
                      value={editing.categoryId || ''}
                      onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">— No category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.names.en}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={busyId === r.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900 truncate">{r.title}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        {KIND_LABELS[r.kind] || 'Other'}
                      </span>
                      {!r.published && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                          Draft
                        </span>
                      )}
                    </div>
                    {r.description && <p className="text-xs text-stone-600 mt-0.5 line-clamp-2">{r.description}</p>}
                    <p className="text-[11px] text-stone-500 mt-1">
                      {fileLabel(r)} · {formatSize(r.size)} · {r.downloadCount} downloads
                      {catName(r.categoryId) ? ' · ' + catName(r.categoryId) : ''} · added{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {!(editing && editing.id === r.id) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {busyId === r.id && <Loader2 className="w-4 h-4 animate-spin text-stone-400 mr-1" />}
                    <button
                      title="Edit details"
                      onClick={() => setEditing({ ...r })}
                      className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      title={r.published ? 'Unpublish (hide from visitors)' : 'Publish'}
                      onClick={() => togglePublished(r)}
                      disabled={busyId === r.id}
                      className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      {r.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      title="Download"
                      onClick={() => handleDownload(r)}
                      disabled={busyId === r.id}
                      className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === r.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={busyId === r.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                        >
                          Delete for good
                        </button>
                        <button
                          title="Cancel"
                          onClick={() => setConfirmDeleteId('')}
                          className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        title="Delete"
                        onClick={() => handleDelete(r)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
