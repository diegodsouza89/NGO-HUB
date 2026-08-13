import React, { useState } from 'react';
import { X, Bookmark, Download, LogOut, Building2, User, Mail, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { User as UserType, Article } from '../types';
import { getArticles, toggleBookmarkResource, logoutUser } from '../lib/storage';

interface UserDashboardModalProps {
  isOpen: boolean;
  user: UserType | null;
  onClose: () => void;
  onSelectArticle: (slug: string) => void;
  onLogout: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  isOpen,
  user,
  onClose,
  onSelectArticle,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'activity' | 'profile'>('bookmarks');
  const [, setRefreshKey] = useState(0);

  if (!isOpen || !user) return null;

  const allArticles = getArticles();
  const bookmarkedArticles = allArticles.filter(a => user.savedResourceIds?.includes(a.id));

  const handleRemoveBookmark = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    toggleBookmarkResource(articleId);
    setRefreshKey(k => k + 1);
  };

  const handleArticleClick = (slug: string) => {
    onSelectArticle(slug);
    onClose();
  };

  const handleSignOut = () => {
    logoutUser();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header Profile Banner */}
        <div className="bg-gradient-to-r from-sky-800 via-blue-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-sky-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-700/80 border-2 border-sky-400/40 flex items-center justify-center text-xl font-bold text-white shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/20 text-sky-200 border border-sky-500/30">
                  <ShieldCheck className="w-3 h-3 text-sky-300" /> Active Member
                </span>
              </div>
              <p className="text-sm text-sky-100 font-medium">{user.role} • {user.organizationName}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sky-200/80 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {user.sector}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-sky-700/50 text-center">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="block text-xl font-bold text-white">{bookmarkedArticles.length}</span>
              <span className="text-[11px] text-sky-200 font-medium">Saved Toolkits</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="block text-xl font-bold text-white">{user.downloadsCount || 0}</span>
              <span className="text-[11px] text-sky-200 font-medium">Resource Downloads</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="block text-xl font-bold text-white">{user.loginCount || 1}</span>
              <span className="text-[11px] text-sky-200 font-medium">Login Sessions</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'bookmarks'
                ? 'border-sky-600 text-sky-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Saved Resources ({bookmarkedArticles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-sky-600 text-sky-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Activity & Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-sky-600 text-sky-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            NGO Profile
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[380px] overflow-y-auto">
          {activeTab === 'bookmarks' && (
            <div>
              {bookmarkedArticles.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No saved resources yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Bookmark articles, FCRA guides, proposal templates, and M&E frameworks while browsing to build your organization's quick-access library.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarkedArticles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => handleArticleClick(art.slug)}
                      className="p-3.5 bg-slate-50 hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                            {art.resourceType.replace('_', ' ')}
                          </span>
                          {art.fileType && (
                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                              <Download className="w-3 h-3" /> {art.fileType}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 group-hover:text-sky-900 line-clamp-1">
                          {art.titles.en || 'Untitled Article'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBookmark(e, art.id)}
                          title="Remove bookmark"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Bookmark className="w-4 h-4 fill-sky-600 text-sky-600" />
                        </button>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-700 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Engagement & Login Overview
                </h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Member Since</dt>
                    <dd className="font-semibold text-slate-800">
                      {new Date(user.registeredAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Last Active Session</dt>
                    <dd className="font-semibold text-slate-800">
                      {new Date(user.lastLoginAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Total Knowledge Views</dt>
                    <dd className="font-semibold text-slate-800">{user.pageViewsCount || 0} articles viewed</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Total Toolkits Downloaded</dt>
                    <dd className="font-semibold text-slate-800">{user.downloadsCount || 0} files downloaded</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block">Organization Name</span>
                  <p className="text-sm font-semibold text-slate-800">{user.organizationName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Designation / Role</span>
                  <p className="text-sm font-semibold text-slate-800">{user.role}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Focus Sector</span>
                  <p className="text-sm font-semibold text-slate-800">{user.sector}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out of NGO Member Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
