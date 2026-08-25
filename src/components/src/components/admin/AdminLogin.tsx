import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { setAdminAuthenticated } from '../../lib/storage';
import {
  canHash,
  clearFailures,
  describeWait,
  hashPassword,
  isHashed,
  lockedForMs,
  recordFailure,
  verifyPassword,
} from '../../lib/adminAuth';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToSite: () => void;
  savedPasswordHash: string;
  /**
   * Called once when an old plain-text password is verified, so the caller can
   * replace it with a hash. Optional: without it login still works, the stored
   * value simply stays in its old form.
   */
  onPasswordUpgraded?: (hashed: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onSuccess,
  onBackToSite,
  savedPasswordHash,
  onPasswordUpgraded,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockedForMs());
  const timer = useRef<number | null>(null);

  // Keep the countdown honest while the form is locked.
  useEffect(() => {
    if (lockMs <= 0) return;
    timer.current = window.setInterval(() => {
      const left = lockedForMs();
      setLockMs(left);
      if (left <= 0 && timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 1000);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [lockMs > 0]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking) return;

    const waiting = lockedForMs();
    if (waiting > 0) {
      setLockMs(waiting);
      setError('Too many attempts. Try again in ' + describeWait(waiting) + '.');
      return;
    }

    setIsChecking(true);
    setError('');
    try {
      const ok = await verifyPassword(password, savedPasswordHash);
      if (!ok) {
        const lockedFor = recordFailure();
        setLockMs(lockedFor);
        setError(
          lockedFor > 0
            ? 'Too many attempts. Try again in ' + describeWait(lockedFor) + '.'
            : 'Incorrect password.'
        );
        return;
      }

      clearFailures();

      // Upgrade a stored plain-text password to a hash on the way through, so
      // this only has to happen once and nobody has to re-enter anything.
      if (!isHashed(savedPasswordHash) && canHash() && onPasswordUpgraded) {
        try {
          onPasswordUpgraded(await hashPassword(password));
        } catch (upgradeError) {
          /* not fatal - the login itself already succeeded */
        }
      }

      setAdminAuthenticated(true);
      onSuccess();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-8 sm:p-10 w-full max-w-md relative overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500"></div>

        <button
          onClick={onBackToSite}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge Portal</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Staff Only
          </div>
          <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/30 text-sky-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Staff Access Portal
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Restricted to authorized NGO staff and administrators.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter admin password..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-hidden focus:border-amber-500 font-medium"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Ask your Knowledge Hub administrator if you do not have the password.
            </p>
          </div>

          <button
            type="submit"
            disabled={isChecking || lockMs > 0}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer shadow-md"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking…</span>
              </>
            ) : lockMs > 0 ? (
              <span>Locked — try again in {describeWait(lockMs)}</span>
            ) : (
              <>
                <span>Log In to Admin Panel</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
