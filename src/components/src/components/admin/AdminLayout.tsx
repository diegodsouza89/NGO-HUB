import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  FolderTree, 
  LifeBuoy, 
  Settings, 
  Users2,
  FileBarChart,
  LogOut, 
  ArrowLeft, 
  Building2, 
  ShieldCheck 
} from 'lucide-react';
import { Article, Category, SiteSettings, SupportTicket } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { ArticleEditor } from './ArticleEditor';
import { CategoryManager } from './CategoryManager';
import { SupportTickets } from './SupportTickets';
import { SettingsManager } from './SettingsManager';
// These two screens were fully built but never imported anywhere, so the tabs
// for them did not exist and the dashboard tiles that pointed at them did
// nothing.
import { UserManager } from './UserManager';
import { ReportingAnalytics } from './ReportingAnalytics';
import { setAdminAuthenticated } from '../../lib/storage';

/** Kept in step with AdminDashboard's onNavigateTab, which already referred to
 *  'users' and 'analytics' before either tab existed. */
type AdminTab = 'dashboard' | 'articles' | 'categories' | 'users' | 'analytics' | 'tickets' | 'settings';

interface AdminLayoutProps {
  articles: Article[];
  categories: Category[];
  tickets: SupportTicket[];
  settings: SiteSettings;
  onArticlesUpdated: (articles: Article[]) => void;
  onCategoriesUpdated: (categories: Category[]) => void;
  onTicketsUpdated: (tickets: SupportTicket[]) => void;
  onSettingsUpdated: (settings: SiteSettings) => void;
  onBackToPublicSite: () => void;
  onResetAllData: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  articles,
  categories,
  tickets,
  settings,
  onArticlesUpdated,
  onCategoriesUpdated,
  onTicketsUpdated,
  onSettingsUpdated,
  onBackToPublicSite,
  onResetAllData,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const handleLogout = () => {
    setAdminAuthenticated(false);
    onBackToPublicSite();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-stone-100 text-sm flex items-center gap-2">
                <span>{settings.siteName}</span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPublicSite}
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Knowledge Portal</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-rose-800/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Links Bar */}
        <div className="bg-stone-950 border-t border-stone-800 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard & Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('articles');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'articles'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Articles ({articles.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('categories');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'categories'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'users'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Users</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'analytics'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileBarChart className="w-4 h-4" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tickets');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'tickets'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Tickets ({tickets.filter(t => t.status === 'open').length} open)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setEditingArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'settings'
                  ? 'border-amber-400 text-amber-300 bg-stone-900/80'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Site Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <AdminDashboard
            articles={articles}
            categories={categories}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onEditArticle={(art) => {
              setEditingArticle(art);
              setActiveTab('articles');
            }}
            onCreateNewArticle={() => {
              setEditingArticle(null);
              setActiveTab('articles');
            }}
          />
        )}

        {activeTab === 'articles' && (
          <ArticleEditor
            articles={articles}
            categories={categories}
            editingArticle={editingArticle}
            onArticlesUpdated={onArticlesUpdated}
            onCloseEditor={() => setEditingArticle(null)}
            onCreateNew={() => setEditingArticle(null)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManager
            categories={categories}
            onCategoriesUpdated={onCategoriesUpdated}
          />
        )}

        {activeTab === 'users' && <UserManager />}

        {activeTab === 'analytics' && <ReportingAnalytics />}

        {activeTab === 'tickets' && (
          <SupportTickets
            tickets={tickets}
            onTicketsUpdated={onTicketsUpdated}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsManager
            settings={settings}
            onSettingsUpdated={onSettingsUpdated}
            onResetData={onResetAllData}
          />
        )}
      </main>
    </div>
  );
};
