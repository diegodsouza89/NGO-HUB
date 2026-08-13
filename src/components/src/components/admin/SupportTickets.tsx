import React, { useState } from 'react';
import { 
  LifeBuoy, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Clock3, 
  AlertCircle 
} from 'lucide-react';
import { SupportTicket } from '../../types';
import { updateTicketStatus } from '../../lib/storage';

interface SupportTicketsProps {
  tickets: SupportTicket[];
  onTicketsUpdated: (tickets: SupportTicket[]) => void;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({
  tickets,
  onTicketsUpdated,
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const filteredTickets = filter === 'all'
    ? tickets
    : tickets.filter(t => t.status === filter);

  const handleStatusChange = (id: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
    updateTicketStatus(id, newStatus);
    const updated = tickets.map(t => (t.id === id ? { ...t, status: newStatus } : t));
    onTicketsUpdated(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-rose-600" />
            Support Tickets Inbox ({tickets.length})
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Review and respond to inquiries submitted by community members and donors.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-colors ${
                filter === st
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {st === 'all' ? 'All Tickets' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((tkt) => (
            <div
              key={tkt.id}
              className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {tkt.id}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    tkt.status === 'open' ? 'bg-amber-100 text-amber-900' :
                    tkt.status === 'in_progress' ? 'bg-blue-100 text-blue-900' :
                    'bg-emerald-100 text-emerald-900'
                  }`}>
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

                <h3 className="text-base font-bold text-stone-900 font-serif">
                  {tkt.subject}
                </h3>

                <p className="text-stone-700 text-sm leading-relaxed bg-stone-50/80 p-4 rounded-2xl border border-stone-100 font-sans">
                  "{tkt.message}"
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1 font-medium">
                  <span className="flex items-center gap-1 font-semibold text-stone-800">
                    User: {tkt.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <a href={`mailto:${tkt.email}`} className="underline text-emerald-800">{tkt.email}</a>
                  </span>
                  {tkt.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {tkt.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-stone-100 pt-4 md:pt-0 shrink-0 gap-2">
                <span className="text-xs font-semibold text-stone-400">Mark Status:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStatusChange(tkt.id, 'open')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold cursor-pointer ${
                      tkt.status === 'open' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleStatusChange(tkt.id, 'in_progress')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold cursor-pointer ${
                      tkt.status === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange(tkt.id, 'resolved')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold cursor-pointer ${
                      tkt.status === 'resolved' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500 text-sm">
            No support tickets match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
