import React, { useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  RefreshCcw,
  KeyRound,
  Database,
} from 'lucide-react';
import { SupportTicket } from '../../types';
import {
  fetchTickets,
  getAdminKey,
  setAdminKey,
  setTicketStatus,
  TicketCounts,
} from '../../lib/tickets';

/**
 * The support inbox.
 *
 * It used to read the tickets array that App.tsx loaded from localStorage. Since
 * the contact form also wrote to the visitor's own localStorage, this list was
 * always empty for the admin - every request submitted through the site was
 * lost. It now reads the D1 database through /api/tickets.
 *
 * Reads need a key because tickets carry a visitor's name, email and phone
 * number, and /staff cannot protect that on its own. The key is checked against
 * TICKETS_ADMIN_KEY on the server. See D1-SETUP.md.
 */

interface SupportTicketsProps {
  /** Lets the tab bar show a truthful open count once we know it. */
  onOpenCountChange?: (open: number) => void;
}

type Filter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const EMPTY_COUNTS: TicketCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };

export const SupportTickets: React.FC<SupportTicketsProps> = ({ onOpenCountChange }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>(EMPTY_COUNTS);
  const [keyInput, setKeyInput] = useState(getAdminKey());
  const [savedKey, setSavedKey] = useState(getAdminKey());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [needsKey, setNeedsKey] = useState(!getAdminKey());
  const [notConfigured, setNotConfigured] = useState(false);
  const [rowError, setRowError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(
    async (key: string) => {
      if (!key) {
        setNeedsKey(true);
        return;
      }
      setIsLoading(true);
      setLoadError('');
      setNotConfigured(false);
      const result = await fetchTickets(key);
      setIsLoading(false);
      setHasLoaded(true);

      if (!result.ok || !result.data) {
        if (result.detail) console.warn('[NGO Hub] Ticket load failed:', result.detail);
        if (result.status === 401) {
          setNeedsKey(true);
          setLoadError(result.error || 'That admin key is not correct.');
        } else if (result.status === 503) {
          setNotConfigured(true);
          setLoadError(result.error || 'The ticket database is not set up yet.');
        } else {
          setLoadError(result.error || 'Could not load tickets.');
        }
        return;
      }

      setNeedsKey(false);
      setTickets(result.data.tickets);
      setCounts(result.data.counts);
      if (onOpenCountChange) onOpenCountChange(result.data.counts.open);
    },
    [onOpenCountChange]
  );

  useEffect(() => {
    if (savedKey) load(savedKey);
  }, [savedKey, load]);

  const handleStatusChange = async (id: string, status: SupportTicket['status']) => {
    const previous = tickets;
    // Move the button immediately, then put it back if the server disagrees.
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status } : t)));
    setRowError('');
    const result = await setTicketStatus(savedKey, id, status);
    if (!result.ok) {
      setTickets(previous);
      setRowError(result.error || 'Could not update that ticket.');
      return;
    }
    load(savedKey);
  };

  const visible = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  /* ------------------------------------------------------------ key prompt */
  if (needsKey || notConfigured) {
    return (
      <div className="max-w-xl mx-auto bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          {notConfigured ? <Database className="w-5 h-5 text-amber-600" /> : <KeyRound className="w-5 h-5 text-stone-600" />}
          {notConfigured ? 'Ticket database not set up' : 'Enter the ticket admin key'}
        </h1>

        {notConfigured ? (
          <div className="mt-3 space-y-3 text-xs text-stone-600 leading-relaxed">
            <p>{loadError}</p>
            <p>
              Tickets are stored in a Cloudflare D1 database so every admin sees the same list.
              Until it is connected, the contact form tells visitors it could not send their
              request rather than pretending it worked.
            </p>
            <p className="font-semibold text-stone-800">
              Follow <span className="font-mono">D1-SETUP.md</span> in the repository — about five
              minutes in the Cloudflare dashboard.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              Tickets contain visitors' names, email addresses and phone numbers, so reading them
              needs a key checked on the server rather than in this browser. It is the value of{' '}
              <span className="font-mono">TICKETS_ADMIN_KEY</span> in your Cloudflare Pages
              settings. You only have to enter it once per browser.
            </p>

            {loadError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            <form
              className="mt-4 flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = keyInput.trim();
                if (!trimmed) return;
                setAdminKey(trimmed);
                setSavedKey(trimmed);
                // Deliberately not clearing needsKey here. load() clears it
                // only when the server actually accepted the key, so a wrong
                // key or a dropped connection leaves you on this form with the
                // reason, rather than in an empty inbox.
                load(trimmed);
              }}
            >
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="TICKETS_ADMIN_KEY"
                className="flex-1 px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
              />
              <button
                type="submit"
                disabled={!keyInput.trim()}
                className="bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Unlock inbox
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  /* ----------------------------------------------------------------- inbox */
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-rose-600" />
            Support Tickets Inbox ({counts.open + counts.in_progress + counts.resolved + counts.closed})
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Submitted through the contact form and stored in Cloudflare, so this is the same list
            for everyone on your team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load(savedKey)}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>

          <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-colors ${
                  filter === st ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
                {st !== 'all' && counts[st] ? ' (' + counts[st] + ')' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-px shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {rowError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-px shrink-0" />
          <span>{rowError}</span>
        </div>
      )}

      <div className="space-y-4">
        {visible.length > 0 ? (
          visible.map((tkt) => (
            <div
              key={tkt.id}
              className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {tkt.ticketId || tkt.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      tkt.status === 'open'
                        ? 'bg-amber-100 text-amber-900'
                        : tkt.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-900'
                          : tkt.status === 'closed'
                            ? 'bg-stone-200 text-stone-700'
                            : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {tkt.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(tkt.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900 font-serif">{tkt.subject}</h3>

                <p className="text-stone-700 text-sm leading-relaxed bg-stone-50/80 p-4 rounded-2xl border border-stone-100 font-sans whitespace-pre-wrap">
                  {tkt.message}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1 font-medium">
                  <span className="flex items-center gap-1 font-semibold text-stone-800">{tkt.name}</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <a href={`mailto:${tkt.email}`} className="underline text-emerald-800">
                      {tkt.email}
                    </a>
                  </span>
                  {tkt.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <a href={`tel:${tkt.phone}`} className="underline text-emerald-800">
                        {tkt.phone}
                      </a>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-stone-100 pt-4 md:pt-0 shrink-0 gap-2">
                <span className="text-xs font-semibold text-stone-400">Mark Status:</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      // The filter row above has buttons with the same words on
                      // them, so give these an unambiguous accessible name.
                      aria-label={'Mark ' + (tkt.ticketId || tkt.id) + ' as ' + st.replace('_', ' ')}
                      onClick={() => handleStatusChange(tkt.id, st)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold cursor-pointer capitalize ${
                        tkt.status === st
                          ? st === 'open'
                            ? 'bg-amber-600 text-white'
                            : st === 'in_progress'
                              ? 'bg-blue-600 text-white'
                              : st === 'closed'
                                ? 'bg-stone-600 text-white'
                                : 'bg-emerald-700 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500 text-sm">
            {isLoading
              ? 'Loading tickets…'
              : hasLoaded && tickets.length === 0
                ? 'No tickets yet. When someone uses the contact form, their request will appear here.'
                : 'No tickets match the selected filter.'}
          </div>
        )}
      </div>
    </div>
  );
};
