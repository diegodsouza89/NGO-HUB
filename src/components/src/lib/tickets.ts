import { SupportTicket } from '../types';

/**
 * Talks to /api/tickets.
 *
 * Replaces createTicket() in lib/storage.ts, which wrote the ticket into the
 * visitor's own browser and handed them a reference number for something nobody
 * would ever receive.
 *
 * The admin key is kept in localStorage purely so it does not have to be typed
 * on every visit. It is checked on the server against TICKETS_ADMIN_KEY, so
 * knowing it is what grants access - storing it here only trades convenience
 * against anyone who already has this browser.
 */

const ENDPOINT = '/api/tickets';
const ADMIN_KEY_STORAGE = 'ngo_tickets_admin_key';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  /** Message written for the person reading the screen. */
  error?: string;
  /** Technical cause, for the browser console. */
  detail?: string;
  status?: number;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // A static host with no function deployed answers with the HTML shell,
    // which is where "Unexpected token <" comes from.
    throw new Error(
      response.status === 404
        ? 'The support desk endpoint is not deployed on this site yet.'
        : 'The server sent an unexpected response.'
    );
  }
}

export interface NewTicket {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  categoryId?: string;
  message: string;
}

export async function submitTicket(input: NewTicket): Promise<ApiResult<SupportTicket>> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await readJson(response);
    if (!response.ok || !body.ticket) {
      return {
        ok: false,
        error: body.error || 'We could not send your request.',
        detail: body.detail,
        status: response.status,
      };
    }
    return { ok: true, data: body.ticket as SupportTicket };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'We could not reach the server. Please check your connection and try again.',
    };
  }
}

/* ------------------------------------------------------------------- admin */

export function getAdminKey(): string {
  try {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch (e) {
    return '';
  }
}

export function setAdminKey(key: string): void {
  try {
    if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
    else localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch (e) {
    /* private browsing - the key just has to be typed again next time */
  }
}

export interface TicketCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export async function fetchTickets(
  key: string
): Promise<ApiResult<{ tickets: SupportTicket[]; counts: TicketCounts }>> {
  try {
    const response = await fetch(ENDPOINT, { headers: { 'x-admin-key': key } });
    const body = await readJson(response);
    if (!response.ok) {
      return { ok: false, error: body.error || 'Could not load tickets.', detail: body.detail, status: response.status };
    }
    return {
      ok: true,
      data: {
        tickets: (body.tickets || []) as SupportTicket[],
        counts: (body.counts || { open: 0, in_progress: 0, resolved: 0, closed: 0 }) as TicketCounts,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not reach the server.' };
  }
}

export async function setTicketStatus(
  key: string,
  id: string,
  status: SupportTicket['status']
): Promise<ApiResult<null>> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ id, status }),
    });
    const body = await readJson(response);
    if (!response.ok) {
      return { ok: false, error: body.error || 'Could not update that ticket.', detail: body.detail, status: response.status };
    }
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not reach the server.' };
  }
}
