import { getPublishKey } from './publishContent';

/**
 * Posters and document templates, stored in D1 through /api/resources.
 *
 * Files travel in ~512 KB base64 pieces: D1 rows are capped at 2 MB and the
 * Cloudflare middleware caps POST bodies, so the browser splits a file on the
 * way up and joins it back together on the way down.
 */

const ENDPOINT = '/api/resources';
const PIECE_BYTES = 512 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type ResourceKind = 'poster' | 'sop' | 'policy' | 'template' | 'other';

export const KIND_LABELS: Record<ResourceKind, string> = {
  poster: 'Poster',
  sop: 'SOP template',
  policy: 'Policy template',
  template: 'Document template',
  other: 'Other',
};

/** Filter-tab label for a kind. */
export const KIND_PLURALS: Record<ResourceKind, string> = {
  poster: 'Posters',
  sop: 'SOP templates',
  policy: 'Policy templates',
  template: 'Document templates',
  other: 'Other',
};

export const KIND_ORDER: ResourceKind[] = ['poster', 'sop', 'policy', 'template', 'other'];

export interface HubResource {
  id: string;
  title: string;
  description: string;
  kind: ResourceKind;
  categoryId?: string;
  fileName: string;
  mime: string;
  size: number;
  chunkCount: number;
  thumbnail?: string;
  published: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Extension → MIME, for files the browser reports with an empty type. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  zip: 'application/zip',
  txt: 'text/plain',
  csv: 'text/csv',
};

export const ACCEPT_ATTR = Object.keys(MIME_BY_EXT).map((e) => '.' + e).join(',');

export function mimeFor(file: File): string {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const fromExt = MIME_BY_EXT[ext];
  if (fromExt) return fromExt;
  return file.type || '';
}

export function isAllowedFile(file: File): boolean {
  return Object.values(MIME_BY_EXT).includes(mimeFor(file));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Short label like "PDF" or "DOCX" from the file name. */
export function fileLabel(r: { fileName: string }): string {
  return ((r.fileName.split('.').pop() || 'file').toUpperCase()).slice(0, 5);
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && body.error) return String(body.error);
  } catch {
    /* fall through */
  }
  return 'Request failed (' + res.status + ').';
}

export interface ResourceList {
  available: boolean;
  admin: boolean;
  items: HubResource[];
  error?: string;
}

export async function fetchResources(asAdmin = false): Promise<ResourceList> {
  try {
    const headers: Record<string, string> = {};
    const key = asAdmin ? getPublishKey() : '';
    if (key) headers['x-admin-key'] = key;
    const res = await fetch(ENDPOINT, { headers, cache: 'no-store' });
    if (!res.ok) return { available: false, admin: false, items: [], error: await readError(res) };
    const body = await res.json();
    return {
      available: true,
      admin: !!body.admin,
      items: Array.isArray(body.items) ? body.items : [],
    };
  } catch {
    return { available: false, admin: false, items: [], error: 'Could not reach the server.' };
  }
}

/* ------------------------------------------------------------- uploading */

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'res-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** A small JPEG preview for image files, so the public grid loads quickly. */
export async function makeThumbnail(file: File): Promise<string | undefined> {
  if (!/^image\/(png|jpeg|webp)$/.test(mimeFor(file))) return undefined;
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      const maxSide = 480;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const q of [0.75, 0.6, 0.45]) {
        const data = canvas.toDataURL('image/jpeg', q);
        if (data.length < 110 * 1024) return data;
      }
      return undefined;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return undefined;
  }
}

export interface UploadInput {
  file: File;
  title: string;
  description: string;
  kind: ResourceKind;
  categoryId?: string;
  published: boolean;
}

export async function uploadResource(
  input: UploadInput,
  onProgress?: (fraction: number) => void
): Promise<HubResource> {
  const key = getPublishKey();
  if (!key) throw new Error('Enter the admin key first.');
  const { file } = input;
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be 25 MB or smaller.');
  if (!isAllowedFile(file)) throw new Error('That file type is not allowed.');

  const uploadId = randomId();
  const total = Math.max(1, Math.ceil(file.size / PIECE_BYTES));
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': key };

  for (let i = 0; i < total; i++) {
    const slice = file.slice(i * PIECE_BYTES, (i + 1) * PIECE_BYTES);
    const data = bytesToBase64(new Uint8Array(await slice.arrayBuffer()));
    let attempt = 0;
    // A flaky mobile connection should not cost the whole upload.
    for (;;) {
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action: 'chunk', uploadId, index: i, data }),
      });
      if (res.ok) break;
      if (++attempt >= 3 || res.status < 500) throw new Error(await readError(res));
    }
    onProgress?.((i + 1) / (total + 1));
  }

  const thumbnail = await makeThumbnail(file);
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      action: 'finalize',
      uploadId,
      title: input.title,
      description: input.description,
      kind: input.kind,
      categoryId: input.categoryId || '',
      fileName: file.name,
      mime: mimeFor(file),
      size: file.size,
      chunkCount: total,
      thumbnail,
      published: input.published,
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  onProgress?.(1);
  const body = await res.json();
  return body.item as HubResource;
}

export async function updateResource(
  id: string,
  changes: Partial<Pick<HubResource, 'title' | 'description' | 'kind' | 'categoryId' | 'published'>>
): Promise<HubResource> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getPublishKey() },
    body: JSON.stringify({ action: 'update', id, ...changes }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()).item as HubResource;
}

export async function deleteResource(id: string): Promise<void> {
  const res = await fetch(ENDPOINT + '?id=' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { 'x-admin-key': getPublishKey() },
  });
  if (!res.ok) throw new Error(await readError(res));
}

/* ----------------------------------------------------------- downloading */

/** Fetches every piece, joins them into one file. */
export async function fetchResourceBlob(
  r: HubResource,
  asAdmin = false,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (asAdmin && getPublishKey()) headers['x-admin-key'] = getPublishKey();
  const parts: Uint8Array[] = [];
  for (let i = 0; i < r.chunkCount; i++) {
    const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(r.id)}&chunk=${i}`, { headers });
    if (!res.ok) throw new Error(await readError(res));
    const body = await res.json();
    parts.push(base64ToBytes(String(body.data || '')));
    onProgress?.((i + 1) / r.chunkCount);
  }
  return new Blob(parts as BlobPart[], { type: r.mime });
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function downloadResource(
  r: HubResource,
  opts: { asAdmin?: boolean; onProgress?: (f: number) => void } = {}
): Promise<void> {
  const blob = await fetchResourceBlob(r, !!opts.asAdmin, opts.onProgress);
  saveBlob(blob, r.fileName);
  if (!opts.asAdmin) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download', id: r.id }),
    }).catch(() => {
      /* a missed count is not worth bothering the visitor about */
    });
  }
}
