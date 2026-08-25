import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSearch } from './components/HeroSearch';
import { CategoryList } from './components/CategoryList';
import { CategoryDetail } from './components/CategoryDetail';
import { ArticleView } from './components/ArticleView';
import { ContactModal } from './components/ContactModal';
import { AskAi } from './components/AskAi';
import { UserAuthModal } from './components/UserAuthModal';
import { UserDashboardModal } from './components/UserDashboardModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { Footer } from './components/Footer';

import { Category, Article, SupportTicket, SiteSettings, Language, User as UserType } from './types';
import { 
  getCategories, 
  getArticles, 
  getTickets, 
  getSettings, 
  saveSettings,
  isAdminAuthenticated,
  getCurrentUser
} from './lib/storage';

export default function App() {
  const isAdminRoute = (path: string) => path === '/admin' || path === '/staff';

  // Core Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(getSettings());
  const [currentUser, setCurrentUser] = useState<UserType | null>(getCurrentUser());

  // UI Navigation States
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const getInitialView = (): 'home' | 'category' | 'article' | 'admin_login' | 'admin_panel' => {
    if (typeof window !== 'undefined' && isAdminRoute(window.location.pathname)) {
      return isAdminAuthenticated() ? 'admin_panel' : 'admin_login';
    }
    return 'home';
  };
  const [currentView, setCurrentView] = useState<'home' | 'category' | 'article' | 'admin_login' | 'admin_panel'>(getInitialView);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');

  // Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isUserAuthOpen, setIsUserAuthOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);

  // Refresh data
  const refreshData = () => {
    setCategories(getCategories());
    setArticles(getArticles());
    setTickets(getTickets());
    setSettings(getSettings());
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Route listener for separate admin portal page
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      if (isAdminRoute(path)) {
        setCurrentView(isAdminAuthenticated() ? 'admin_panel' : 'admin_login');
      } else {
        setCurrentView('home');
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const handleOpenAdmin = () => {
    window.history.pushState({}, '', '/staff');
    setCurrentView(isAdminAuthenticated() ? 'admin_panel' : 'admin_login');
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setCurrentView('category');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArticle = (art: Article) => {
    setSelectedArticle(art);
    const cat = categories.find(c => c.id === art.categoryId);
    if (cat) setSelectedCategory(cat);
    setCurrentView('article');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    window.history.pushState("", document.title, "/");
    setCurrentView('home');
    setSelectedCategory(null);
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900">
      {/* Admin Panel View */}
      {currentView === 'admin_panel' ? (
        <AdminLayout
          articles={articles}
          categories={categories}
          tickets={tickets}
          settings={settings}
          onArticlesUpdated={(updated) => {
            setArticles(updated);
            refreshData();
          }}
          onCategoriesUpdated={(updated) => {
            setCategories(updated);
            refreshData();
          }}
          onTicketsUpdated={(updated) => {
            setTickets(updated);
            refreshData();
          }}
          onSettingsUpdated={(updated) => {
            setSettings(updated);
            refreshData();
          }}
          onBackToPublicSite={handleNavigateHome}
          onResetAllData={() => {
            refreshData();
            handleNavigateHome();
          }}
        />
      ) : currentView === 'admin_login' ? (
        <AdminLogin
          savedPasswordHash={settings.adminPasswordHash}
          onPasswordUpgraded={(hashed) => {
            // A plain-text password was just verified. Store the hashed form so
            // the readable copy stops sitting in this browser.
            const updated = { ...settings, adminPasswordHash: hashed };
            saveSettings(updated);
            setSettings(updated);
          }}
          onSuccess={() => {
            window.history.pushState({}, '', '/staff');
            setCurrentView('admin_panel');
          }}
          onBackToSite={handleNavigateHome}
        />
      ) : (
        /* Public Knowledge Portal */
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <Navbar
              currentLanguage={currentLanguage}
              onLanguageChange={(lang) => setCurrentLanguage(lang)}
              onNavigateHome={handleNavigateHome}
              onOpenSearch={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onOpenUserAuth={() => setIsUserAuthOpen(true)}
              onOpenUserDashboard={() => setIsUserDashboardOpen(true)}
              currentUser={currentUser}
              settings={settings}
              isAdmin={isAdminAuthenticated()}
            />

            <main>
              {currentView === 'home' && (
                <>
                  <HeroSearch
                    currentLanguage={currentLanguage}
                    articles={articles}
                    categories={categories}
                    onSelectArticle={handleSelectArticle}
                    onSelectCategory={handleSelectCategory}
                    tagline={settings.tagline}
                    selectedResourceType={selectedResourceType}
                    onSelectResourceType={(type) => setSelectedResourceType(type)}
                  />

                  <CategoryList
                    categories={categories}
                    articles={articles}
                    currentLanguage={currentLanguage}
                    onSelectCategory={handleSelectCategory}
                    onSelectArticle={handleSelectArticle}
                    selectedResourceType={selectedResourceType}
                  />
                </>
              )}

              {currentView === 'category' && selectedCategory && (
                <CategoryDetail
                  category={selectedCategory}
                  articles={articles}
                  currentLanguage={currentLanguage}
                  onSelectArticle={handleSelectArticle}
                  onBackToHome={handleNavigateHome}
                />
              )}

              {currentView === 'article' && selectedArticle && (
                <ArticleView
                  article={selectedArticle}
                  category={selectedCategory || categories.find(c => c.id === selectedArticle.categoryId)}
                  relatedArticles={articles.filter(a => a.categoryId === selectedArticle.categoryId && a.id !== selectedArticle.id && a.published)}
                  currentLanguage={currentLanguage}
                  currentUser={currentUser}
                  onBackToHome={handleNavigateHome}
                  onSelectCategory={handleSelectCategory}
                  onSelectArticle={handleSelectArticle}
                  onOpenUserAuth={() => setIsUserAuthOpen(true)}
                />
              )}
            </main>
          </div>

          <Footer
            settings={settings}
            currentLanguage={currentLanguage}
            onLanguageChange={(lang) => setCurrentLanguage(lang)}
            onOpenContact={() => setIsContactOpen(true)}
            onNavigateHome={handleNavigateHome}
          />

          {/* User Member Authentication Modal */}
          <UserAuthModal
            isOpen={isUserAuthOpen}
            onClose={() => setIsUserAuthOpen(false)}
            onSuccess={() => {
              setCurrentUser(getCurrentUser());
              setIsUserAuthOpen(false);
              setIsUserDashboardOpen(true);
            }}
          />

          {/* User Member Dashboard Modal */}
          <UserDashboardModal
            isOpen={isUserDashboardOpen}
            onClose={() => setIsUserDashboardOpen(false)}
            currentUser={currentUser}
            articles={articles}
            onSelectArticle={(art) => {
              setIsUserDashboardOpen(false);
              handleSelectArticle(art);
            }}
            onLogout={() => {
              setCurrentUser(null);
              setIsUserDashboardOpen(false);
            }}
          />

          {/* Floating AI assistant - available on every public page */}
          <AskAi
            articles={articles}
            currentLanguage={currentLanguage}
            onSelectArticle={handleSelectArticle}
          />

          {/* Ticket Modal */}
          <ContactModal
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            categories={categories}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
}
