export type Language = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'gu' | 'kn';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'కన్నడ', flag: '🇮🇳' },
];

export type ResourceType = 'article' | 'case_study' | 'best_practice' | 'toolkit' | 'guide' | 'policy';

export interface User {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  role: string;
  sector: string;
  registeredAt: string;
  lastLoginAt: string;
  loginCount: number;
  pageViewsCount?: number;
  downloadsCount?: number;
  savedResourceIds: string[];
  status: 'active' | 'suspended';
}

export interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationName: string;
  role: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  device: string;
}

export interface DownloadLog {
  id: string;
  resourceId: string;
  resourceTitle: string;
  userEmail?: string;
  organizationName?: string;
  date: string;
  timestamp: number;
}

export interface Category {
  id: string;
  slug: string;
  icon: string; // Lucide icon name or emoji
  order: number;
  names: Record<Language, string>;
  descriptions: Record<Language, string>;
}

export interface Article {
  id: string;
  slug: string;
  categoryId: string;
  resourceType: ResourceType;
  published: boolean;
  views: number;
  downloadsCount: number;
  bookmarkCount: number;
  helpfulYes: number;
  helpfulNo: number;
  updatedAt: string;
  tags: string[];
  sector?: string; // e.g. "All Sectors", "Education", "Healthcare", "Rural Development", "Governance"
  downloadUrl?: string;
  fileType?: string; // e.g. "PDF Document", "Excel Template", "DOCX Guide"
  fileSize?: string; // e.g. "2.4 MB"
  titles: Partial<Record<Language, string>>;
  bodies: Partial<Record<Language, string>>;
}

export interface SupportTicket {
  id: string;
  ticketId?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  categoryId?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  supportEmail: string;
  helplinePhone: string;
  ga4Id: string;
  adminPasswordHash: string; // Stored hash or password string
  primaryLanguage: Language;
  logoUrl?: string;
}

export interface PageViewLog {
  id: string;
  articleId: string;
  language: Language;
  date: string; // YYYY-MM-DD
  timestamp: number;
  userId?: string;
}

