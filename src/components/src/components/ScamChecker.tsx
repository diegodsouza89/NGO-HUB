import React, { useRef, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Upload, X, Loader2,
  Link2, Phone, Mail, MessageSquare, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { Language } from '../types';
import { scamLabels, ScamLabels } from '../lib/scamI18n';

interface ScamCheckerProps {
  currentLanguage: Language;
  onBackToHome: () => void;
}

type Verdict = 'scam' | 'suspicious' | 'likely_safe';
interface CheckResult {
  verdict: Verdict;
  score: number;
  summary: string;
  flags: string[];
  advice: string[];
  extractedText?: string;
  links: { url: string; host: string; risky: boolean }[];
  aiUsed: boolean;
}

const EXAMPLES: { label: keyof ScamLabels; icon: React.ReactNode; text: string }[] = [
  {
    label: 'exFee',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    text: 'Dear NGO, Congratulations! Your organisation is selected for CSR grant of Rs 25,00,000 under NITI Aayog scheme. Pay processing fee of Rs 4,999 within 24 hours to release funds. Contact csr.niti.grant@gmail.com',
  },
  {
    label: 'exFcra',
    icon: <Link2 className="w-3.5 h-3.5" />,
    text: 'URGENT: Your FCRA registration will be suspended today due to incomplete KYC. Update immediately at http://fcra-gov-india.online/verify to avoid penalty.',
  },
  {
    label: 'exBoss',
    icon: <Mail className="w-3.5 h-3.5" />,
    text: "Hi, I'm in a meeting and can't talk right now. Need a quick favour - buy 5 Amazon gift cards of Rs 5000 for a donor event. Keep this confidential, I'll reimburse.",
  },
  {
    label: 'exPhone',
    icon: <Phone className="w-3.5 h-3.5" />,
    text: '+92 301 5551234 called saying they are from CBI and our NGO account is under money laundering case',
  },
];

const VERDICT_UI: Record<Verdict, { label: keyof ScamLabels; ring: string; bg: string; text: string; bar: string; Icon: typeof ShieldX }> = {
  scam: { label: 'verdictScam', ring: 'border-red-300', bg: 'bg-red-50', text: 'text-red-800', bar: 'bg-red-500', Icon: ShieldX },
  suspicious: { label: 'verdictSuspicious', ring: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-900', bar: 'bg-amber-500', Icon: ShieldAlert },
  likely_safe: { label: 'verdictSafe', ring: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-900', bar: 'bg-emerald-500', Icon: ShieldCheck },
};

/** Shrink a screenshot to at most 1600px / ~1.5 MB JPEG so it fits the API cap. */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not open that image.'));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process the image.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let q = 0.85;
    let out = canvas.toDataURL('image/jpeg', q);
    while (out.length > 2_000_000 && q > 0.4) { q -= 0.15; out = canvas.toDataURL('image/jpeg', q); }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/cybercrime\.gov\.in\S*|\b1930\b)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\/cybercrime\.gov\.in/.test(p) ? (
          <a key={i} href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline">cybercrime.gov.in</a>
        ) : p === '1930' ? (
          <a key={i} href="tel:1930" className="font-semibold underline">1930</a>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

export const ScamChecker: React.FC<ScamCheckerProps> = ({ currentLanguage, onBackToHome }) => {
  const t = scamLabels(currentLanguage);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string>('');
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setError(t.errFileType); return; }
    if (file.size > 10 * 1024 * 1024) { setError(t.errFileSize); return; }
    setError('');
    try {
      setImage(await compressImage(file));
      setImageName(file.name);
    } catch (e: any) {
      setError(t.errRead);
    }
  };

  const check = async () => {
    if (!text.trim() && !image) { setError(t.errEmpty); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/scam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, image: image || undefined, language: currentLanguage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.errUnavailable);
      setResult(data as CheckResult);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) {
      setError(e?.message || t.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setText(''); setImage(''); setImageName(''); setResult(null); setError(''); };
  const ui = result ? VERDICT_UI[result.verdict] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <button onClick={onBackToHome} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> {t.back}
      </button>

      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" /> {t.badge}
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-2 text-slate-600 max-w-xl mx-auto">
          {t.intro}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 6000))}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files)[0];
            if (f && f.type.startsWith('image/')) { e.preventDefault(); onFile(f); }
          }}
          rows={7}
          placeholder={t.placeholder}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
        />
        <div className="mt-1 text-right text-[11px] text-slate-400">{text.length}/6000</div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
          className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{t.addScreenshot}</div>
            <div className="text-xs text-slate-500">{t.screenshotHint}</div>
            {imageName && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 max-w-full">
                <img src={image} alt="" className="w-8 h-8 object-cover rounded" />
                <span className="truncate">{imageName}</span>
                <button onClick={() => { setImage(''); setImageName(''); }} className="text-slate-500 hover:text-red-600 cursor-pointer" aria-label={t.removeScreenshot}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
            <Upload className="w-4 h-4" /> {t.chooseFile}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={check}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold px-5 py-3 cursor-pointer transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.checking}</> : <><ShieldCheck className="w-4 h-4" /> {t.checkNow}</>}
          </button>
          {(text || image || result) && (
            <button onClick={reset} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">{t.clear}</button>
          )}
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{t.tryExample}</div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} onClick={() => { setText(ex.text); setResult(null); }} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-xs text-slate-700 cursor-pointer">
                {ex.icon} {t[ex.label]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && ui && (
        <div ref={resultRef} className={`mt-6 rounded-2xl border-2 ${ui.ring} ${ui.bg} p-5`}>
          <div className="flex items-start gap-3">
            <ui.Icon className={`w-9 h-9 shrink-0 ${ui.text}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xl font-extrabold ${ui.text}`}>{t[ui.label]}</div>
              <p className="mt-1 text-sm text-slate-700">{result.summary}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>{t.riskScore}</span><span>{result.score}/100</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/80 overflow-hidden border border-slate-200">
              <div className={`h-full ${ui.bar} transition-all`} style={{ width: `${Math.max(4, result.score)}%` }} />
            </div>
          </div>

          {result.flags.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">{t.redFlags}</h3>
              <ul className="space-y-1.5">
                {result.flags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.links?.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">{t.links}</h3>
              <ul className="space-y-1">
                {result.links.map((l) => (
                  <li key={l.url} className="flex items-center gap-2 text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full ${l.risky ? 'bg-red-500' : 'bg-slate-400'}`} />
                    <code className="break-all text-slate-800">{l.host}</code>
                    {l.risky && <span className="text-xs font-semibold text-red-700">{t.riskyLink}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-white/80 border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-2">{t.nextSteps}</h3>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-800">
              {result.advice.map((a, i) => <li key={i}><Linkify text={a} /></li>)}
            </ol>
          </div>

          {result.extractedText && (
            <details className="mt-4 text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold">{t.extracted}</summary>
              <p className="mt-1 whitespace-pre-wrap">{result.extractedText}</p>
            </details>
          )}

          {!result.aiUsed && (
            <p className="mt-3 text-xs text-slate-500">{t.aiUnavailable}</p>
          )}
        </div>
      )}

      <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400">
          <div className="font-bold text-slate-900 flex items-center gap-1">{t.reportTitle} <ExternalLink className="w-3.5 h-3.5" /></div>
          <div className="text-slate-600 text-xs mt-1">{t.reportSub}</div>
        </a>
        <a href="tel:1930" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400">
          <div className="font-bold text-slate-900">{t.callTitle}</div>
          <div className="text-slate-600 text-xs mt-1">{t.callSub}</div>
        </a>
        <a href="https://sancharsaathi.gov.in" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400">
          <div className="font-bold text-slate-900 flex items-center gap-1">Sanchar Saathi <ExternalLink className="w-3.5 h-3.5" /></div>
          <div className="text-slate-600 text-xs mt-1">{t.saathiSub}</div>
        </a>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-500">
        {t.disclaimer}
      </p>
    </div>
  );
};
