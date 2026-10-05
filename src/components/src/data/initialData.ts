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

// No demo accounts. Real members are stored on the server (/api/users).
export const INITIAL_USERS: User[] = [];
export const INITIAL_LOGIN_LOGS: LoginLog[] = [];
