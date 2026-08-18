import { Category, Article, SiteSettings, User, LoginLog } from '../types';
import content from './content.json';

/**
 * Categories and articles now come from content.json, which lives in this repo.
 *
 * That file is the single source of truth for the site's content: edit it on
 * GitHub, push, and Netlify rebuilds — every visitor sees the change. Previously
 * the content lived only in each browser's localStorage, so visitors only ever
 * saw the one seeded article and never the 22 articles in the admin portal.
 *
 * To pull your current admin-portal content back out into this file, open the
 * live site, press F12 → Console, and run the snippet in README_CONTENT.md.
 */
export const INITIAL_CATEGORIES: Category[] = content.categories as unknown as Category[];
export const INITIAL_ARTICLES: Article[] = content.articles as unknown as Article[];

export const INITIAL_SETTINGS: SiteSettings = {
  siteName: "NGO Knowledge Hub",
  tagline: "A centralized technology and digital operations portal for non-profit organizations, grassroots leaders, and social impact teams.",
  supportEmail: "",
  helplinePhone: "",
  ga4Id: "G-NGO98765432",
  adminPasswordHash: "changeme123",
  primaryLanguage: "en",
  logoUrl: "",
};

export const INITIAL_USERS: User[] = [
  {
    id: "usr-1001",
    name: "Priya Sharma",
    email: "priya.sharma@samparkfoundation.org",
    organizationName: "Sampark Rural Development Foundation",
    role: "Executive Director",
    sector: "Education & Rural Development",
    registeredAt: "2026-07-10T10:15:00Z",
    lastLoginAt: "2026-08-06T18:30:00Z",
    loginCount: 14,
    pageViewsCount: 42,
    downloadsCount: 8,
    savedResourceIds: ["res-107"],
    status: "active",
  },
  {
    id: "usr-1002",
    name: "Dr. Rajesh Kulkarni",
    email: "rajesh@aarogyatrust.org",
    organizationName: "Aarogya Public Health Trust",
    role: "Program Manager",
    sector: "Healthcare",
    registeredAt: "2026-07-18T14:20:00Z",
    lastLoginAt: "2026-08-05T11:45:00Z",
    loginCount: 9,
    pageViewsCount: 28,
    downloadsCount: 5,
    savedResourceIds: ["res-107"],
    status: "active",
  },
];

export const INITIAL_LOGIN_LOGS: LoginLog[] = [
  {
    id: "log-501",
    userId: "usr-1001",
    userName: "Priya Sharma",
    userEmail: "priya.sharma@samparkfoundation.org",
    organizationName: "Sampark Rural Development Foundation",
    role: "Executive Director",
    timestamp: Date.now() - 3600000 * 4,
    date: new Date().toISOString().split('T')[0],
    device: "Chrome / macOS Desktop",
  },
  {
    id: "log-502",
    userId: "usr-1002",
    userName: "Dr. Rajesh Kulkarni",
    userEmail: "rajesh@aarogyatrust.org",
    organizationName: "Aarogya Public Health Trust",
    role: "Program Manager",
    timestamp: Date.now() - 3600000 * 8,
    date: new Date().toISOString().split('T')[0],
    device: "Safari / iPhone iOS",
  },
];
