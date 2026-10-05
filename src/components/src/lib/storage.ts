import { 
  Article, 
  Category, 
  PageViewLog, 
  SiteSettings, 
  User, 
  LoginLog, 
  DownloadLog, 
  Language,
  SupportTicket 
} from '../types';
import { 
  INITIAL_ARTICLES, 
  INITIAL_CATEGORIES, 
  INITIAL_SETTINGS 
} from '../data/initialData';
import { getCachedMembers, reportActivity } from './members';

const KEYS = {
  SETTINGS: 'ngo_settings',
  CATEGORIES: 'ngo_categories',
  ARTICLES: 'ngo_articles',
  USERS: 'ngo_users',
  CURRENT_USER: 'ngo_current_user',
  LOGIN_LOGS: 'ngo_login_logs',
  DOWNLOAD_LOGS: 'ngo_download_logs',
  PAGE_VIEWS: 'ngo_page_views',
  ADMIN_AUTH: 'ngo_admin_authed',
  TICKETS: 'ngo_tickets',
};

const LEGACY_CATEGORY_IDS = ['cat-grants', 'cat-fcra', 'cat-governance', 'cat-me', 'cat-toolkits'];
const LEGACY_ARTICLE_IDS = ['res-101', 'res-102', 'res-103', 'res-104', 'res-105', 'res-111'];

function isLegacyStoredCategoryData(data: Category[]): boolean {
  return data.some(category => LEGACY_CATEGORY_IDS.includes(category.id));
}

function isLegacyStoredArticleData(data: Article[]): boolean {
  return data.some(article => LEGACY_ARTICLE_IDS.includes(article.id) || LEGACY_CATEGORY_IDS.includes(article.categoryId));
}

function seedCategories(): Category[] {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  return INITIAL_CATEGORIES;
}

function seedArticles(): Article[] {
  localStorage.setItem(KEYS.ARTICLES, JSON.stringify(INITIAL_ARTICLES));
  return INITIAL_ARTICLES;
}

// --- Support Tickets Storage ---
export function getTickets(): SupportTicket[] {
  try {
    const data = localStorage.getItem(KEYS.TICKETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTickets(tickets: SupportTicket[]): void {
  localStorage.setItem(KEYS.TICKETS, JSON.stringify(tickets));
}

/**
 * SUPERSEDED. Kept only so resetToDefaults and older callers still compile.
 *
 * This wrote a support ticket into the visitor's own browser and returned a
 * reference number for a request nobody would ever receive. The contact form
 * now posts to /api/tickets, which stores it in Cloudflare D1. Do not use this
 * for new work - see lib/tickets.ts.
 */
export function createTicket(data: Omit<SupportTicket, 'id' | 'ticketId' | 'status' | 'createdAt'>): SupportTicket {
  const tickets = getTickets();
  const ticketId = `NGO-${Math.floor(100000 + Math.random() * 900000)}`;
  const newTicket: SupportTicket = {
    ...data,
    id: `ticket-${Date.now()}`,
    ticketId,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  tickets.unshift(newTicket);
  saveTickets(tickets);
  return newTicket;
}

export function updateTicketStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed'): SupportTicket[] {
  const tickets = getTickets();
  const t = tickets.find(x => x.id === id);
  if (t) {
    t.status = status;
    saveTickets(tickets);
  }
  return tickets;
}

// --- Settings Storage ---
export function getSettings(): SiteSettings {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: SiteSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Categories Storage ---
export function getCategories(): Category[] {
  try {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    if (!data) {
      return seedCategories();
    }

    const parsed = JSON.parse(data) as Category[];
    if (isLegacyStoredCategoryData(parsed)) {
      return seedCategories();
    }

    return parsed;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

// --- Articles & Resources Storage ---
export function getArticles(): Article[] {
  try {
    const data = localStorage.getItem(KEYS.ARTICLES);
    if (!data) {
      return seedArticles();
    }

    const parsed = JSON.parse(data) as Article[];
    if (isLegacyStoredArticleData(parsed)) {
      return seedArticles();
    }

    return parsed;
  } catch {
    return INITIAL_ARTICLES;
  }
}

/**
 * Raised when article content could not be written to this browser.
 *
 * This used to be an unguarded localStorage.setItem — the only write in this
 * file without a try/catch. When it threw, the exception died inside the React
 * click handler: the editor showed no error, and an admin who had just
 * translated an article into seven languages had no way to know the save had
 * not happened.
 */
export class ArticleSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArticleSaveError';
  }
}

/**
 * Writes the articles, then reads them back to prove the write took effect.
 *
 * The read-back matters because a browser can accept setItem and still not
 * keep the data — a storage quota reached part-way, or an extension or privacy
 * mode intercepting writes. Without it, "no exception" was being treated as
 * "saved".
 */
export function saveArticles(articles: Article[]): void {
  const payload = JSON.stringify(articles);

  try {
    localStorage.setItem(KEYS.ARTICLES, payload);
  } catch (err) {
    const size = Math.round(payload.length / 1024);
    const quota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new ArticleSaveError(
      quota
        ? 'This browser has run out of storage space for the Hub (tried to save ' +
          size +
          ' KB). Export content.json to keep your work, then clear older Hub data.'
        : 'This browser refused to save the articles: ' + String((err as Error)?.message || err)
    );
  }

  if (localStorage.getItem(KEYS.ARTICLES) !== payload) {
    throw new ArticleSaveError(
      'The save did not stick. This browser accepted the write but did not keep it, ' +
        'which happens in private or incognito windows and when storage is full.'
    );
  }
}

export function getArticleBySlug(slug: string): Article | undefined {
  const articles = getArticles();
  return articles.find(a => a.slug === slug || a.id === slug);
}

// --- Users & Login History Storage ---
//
// Members are stored on the server (/api/users, Cloudflare D1). This browser
// only keeps the profile of whoever is signed in HERE, so one member's details
// are never visible to the next person using the same computer.
//
// getUsers()/getLoginLogs() return the list the admin portal last fetched
// (in memory only). For public visitors they are always empty.

// One-time clean-up: older builds seeded two demo accounts (Priya Sharma,
// Dr. Rajesh Kulkarni) and kept every member who signed in on this browser.
const DUMMY_USER_IDS = ['usr-1001', 'usr-1002'];
try {
  localStorage.removeItem(KEYS.USERS);
  localStorage.removeItem(KEYS.LOGIN_LOGS);
  const raw = localStorage.getItem(KEYS.CURRENT_USER);
  if (raw) {
    const cu = JSON.parse(raw);
    if (!cu || DUMMY_USER_IDS.includes(cu.id)) localStorage.removeItem(KEYS.CURRENT_USER);
  }
} catch {
  /* storage blocked - nothing to clean */
}

export function getUsers(): User[] {
  return getCachedMembers().users;
}

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  } catch {
    /* private browsing */
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function toggleBookmarkResource(resourceId: string): string[] {
  const targetUser = getCurrentUser();
  if (!targetUser) return [];

  if (!targetUser.savedResourceIds) {
    targetUser.savedResourceIds = [];
  }

  const idx = targetUser.savedResourceIds.indexOf(resourceId);
  if (idx >= 0) {
    targetUser.savedResourceIds.splice(idx, 1);
  } else {
    targetUser.savedResourceIds.push(resourceId);
  }

  setCurrentUser(targetUser);
  reportActivity(targetUser, 'bookmarks');

  // Also update article bookmark count
  const articles = getArticles();
  const art = articles.find(a => a.id === resourceId);
  if (art) {
    art.bookmarkCount = (art.bookmarkCount || 0) + (idx >= 0 ? -1 : 1);
    if (art.bookmarkCount < 0) art.bookmarkCount = 0;
    saveArticles(articles);
  }

  return targetUser.savedResourceIds;
}

// --- Login Activity Logs ---
// Recorded on the server when a member registers or signs in.
export function getLoginLogs(): LoginLog[] {
  return getCachedMembers().loginLogs;
}

// --- Article View & Download Tracking ---
export function incrementArticleView(articleId: string, language: Language = 'en'): void {
  const articles = getArticles();
  const article = articles.find(a => a.id === articleId);
  if (article) {
    article.views = (article.views || 0) + 1;
    saveArticles(articles);
  }

  // Also increment logged-in user page views count if logged in
  const currentUser = getCurrentUser();
  if (currentUser) {
    currentUser.pageViewsCount = (currentUser.pageViewsCount || 0) + 1;
    setCurrentUser(currentUser);
    reportActivity(currentUser, 'view');
  }

  // Page view log
  try {
    const logsData = localStorage.getItem(KEYS.PAGE_VIEWS);
    const logs: PageViewLog[] = logsData ? JSON.parse(logsData) : [];
    const today = new Date().toISOString().split('T')[0];
    
    logs.push({
      id: `pv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      articleId,
      language,
      date: today,
      timestamp: Date.now(),
      userId: currentUser?.id,
    });

    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    localStorage.setItem(KEYS.PAGE_VIEWS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to log page view:', e);
  }
}

export function incrementResourceDownload(articleId: string): void {
  const articles = getArticles();
  const article = articles.find(a => a.id === articleId);
  if (!article) return;

  article.downloadsCount = (article.downloadsCount || 0) + 1;
  saveArticles(articles);

  const currentUser = getCurrentUser();
  if (currentUser) {
    currentUser.downloadsCount = (currentUser.downloadsCount || 0) + 1;
    setCurrentUser(currentUser);
    reportActivity(currentUser, 'download');
  }

  // Record Download Log
  try {
    const logsData = localStorage.getItem(KEYS.DOWNLOAD_LOGS);
    const logs: DownloadLog[] = logsData ? JSON.parse(logsData) : [];
    const today = new Date().toISOString().split('T')[0];

    logs.unshift({
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId: articleId,
      resourceTitle: article.titles.en || 'Untitled Resource',
      userEmail: currentUser?.email,
      organizationName: currentUser?.organizationName,
      date: today,
      timestamp: Date.now(),
    });

    if (logs.length > 1000) logs.splice(1000);
    localStorage.setItem(KEYS.DOWNLOAD_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to log download:', e);
  }
}

export function voteArticleHelpful(articleId: string, helpful: boolean): { yes: number; no: number } {
  const articles = getArticles();
  const article = articles.find(a => a.id === articleId);
  if (!article) return { yes: 0, no: 0 };

  if (helpful) {
    article.helpfulYes = (article.helpfulYes || 0) + 1;
  } else {
    article.helpfulNo = (article.helpfulNo || 0) + 1;
  }
  saveArticles(articles);
  return { yes: article.helpfulYes, no: article.helpfulNo };
}

export function getPageViews(): PageViewLog[] {
  try {
    const data = localStorage.getItem(KEYS.PAGE_VIEWS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getDownloadLogs(): DownloadLog[] {
  try {
    const data = localStorage.getItem(KEYS.DOWNLOAD_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// --- Analytics Calculations ---
export function getAnalyticsData() {
  const articles = getArticles();
  const categories = getCategories();
  const users = getUsers();
  const loginLogs = getLoginLogs();
  const pageViews = getPageViews();
  const downloadLogs = getDownloadLogs();

  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalDownloads = articles.reduce((sum, a) => sum + (a.downloadsCount || 0), 0);
  const totalBookmarks = articles.reduce((sum, a) => sum + (a.bookmarkCount || 0), 0);

  // 14-day trend for user logins & views
  const days: { date: string; displayDate: string; logins: number; views: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    
    const dayLogins = loginLogs.filter(l => l.date === dateStr).length;
    const dayViews = pageViews.filter(pv => pv.date === dateStr).length;
    
    days.push({
      date: dateStr,
      displayDate,
      // Real counts only. These two lines used to fall back to invented values
      // - Math.floor((i % 4) + 1) for logins and totalViews / 20 for views - so the
      // chart displayed traffic that never happened. An empty chart is better than
      // a false one.
      logins: dayLogins,
      views: dayViews,
    });
  }

  // Sector breakdown among users
  const sectorCounts: Record<string, number> = {};
  users.forEach(u => {
    const s = u.sector || 'General NGO';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });

  // Top resources by views and downloads
  const topReadResources = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const topDownloadedResources = [...articles].sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0)).slice(0, 5);

  return {
    totalViews,
    totalDownloads,
    totalBookmarks,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalLoginSessions: loginLogs.length,
    totalResources: articles.length,
    publishedResources: articles.filter(a => a.published).length,
    totalCategories: categories.length,
    days,
    sectorCounts,
    topReadResources,
    topDownloadedResources,
  };
}

// --- CSV Export Generators ---
export function exportUsersCSV(): string {
  const users = getUsers();
  const headers = ['User ID', 'Full Name', 'Email', 'Organization Name', 'Role', 'Sector Focus', 'Registration Date', 'Last Login Date', 'Login Count', 'Page Views', 'Downloads', 'Status'];
  const rows = users.map(u => [
    u.id,
    `"${u.name.replace(/"/g, '""')}"`,
    `"${u.email.replace(/"/g, '""')}"`,
    `"${u.organizationName.replace(/"/g, '""')}"`,
    `"${u.role.replace(/"/g, '""')}"`,
    `"${u.sector.replace(/"/g, '""')}"`,
    u.registeredAt,
    u.lastLoginAt,
    u.loginCount,
    u.pageViewsCount || 0,
    u.downloadsCount || 0,
    u.status,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportLoginLogsCSV(): string {
  const logs = getLoginLogs();
  const headers = ['Log ID', 'User Name', 'Email', 'Organization Name', 'Role', 'Date', 'Timestamp', 'Device / Browser'];
  const rows = logs.map(l => [
    l.id,
    `"${l.userName.replace(/"/g, '""')}"`,
    `"${l.userEmail.replace(/"/g, '""')}"`,
    `"${l.organizationName.replace(/"/g, '""')}"`,
    `"${l.role.replace(/"/g, '""')}"`,
    l.date,
    new Date(l.timestamp).toISOString(),
    `"${l.device.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportResourceAnalyticsCSV(): string {
  const articles = getArticles();
  const categories = getCategories();
  const headers = ['Resource ID', 'Title (EN)', 'Category', 'Resource Type', 'Target Sector', 'Published Status', 'Views', 'Downloads', 'Bookmarks', 'Helpful YES', 'Helpful NO', 'File Type'];
  
  const rows = articles.map(a => {
    const cat = categories.find(c => c.id === a.categoryId);
    return [
      a.id,
      `"${(a.titles.en || 'Untitled').replace(/"/g, '""')}"`,
      `"${(cat?.names.en || 'General').replace(/"/g, '""')}"`,
      a.resourceType,
      `"${(a.sector || 'All Sectors').replace(/"/g, '""')}"`,
      a.published ? 'Published' : 'Draft',
      a.views || 0,
      a.downloadsCount || 0,
      a.bookmarkCount || 0,
      a.helpfulYes || 0,
      a.helpfulNo || 0,
      `"${(a.fileType || 'N/A').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// --- Admin Auth ---
export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(KEYS.ADMIN_AUTH) === 'true';
}

export function setAdminAuthenticated(auth: boolean): void {
  if (auth) {
    localStorage.setItem(KEYS.ADMIN_AUTH, 'true');
  } else {
    localStorage.removeItem(KEYS.ADMIN_AUTH);
  }
}

export function resetToDefaults(): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(KEYS.ARTICLES, JSON.stringify(INITIAL_ARTICLES));
  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem(KEYS.DOWNLOAD_LOGS);
  localStorage.removeItem(KEYS.PAGE_VIEWS);
}
