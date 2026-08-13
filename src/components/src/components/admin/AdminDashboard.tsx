import React from 'react';
import { 
  Eye, 
  FileText, 
  FolderTree, 
  LifeBuoy, 
  TrendingUp, 
  BarChart3, 
  Globe, 
  Plus, 
  ArrowUpRight,
  Edit3,
  Download,
  Users
} from 'lucide-react';
import { Article, Category, SupportTicket } from '../../types';
import { getAnalyticsData } from '../../lib/storage';

interface AdminDashboardProps {
  articles: Article[];
  categories: Category[];
  tickets?: SupportTicket[];
  onNavigateTab: (tab: 'dashboard' | 'articles' | 'categories' | 'users' | 'analytics' | 'tickets' | 'settings') => void;
  onEditArticle: (article: Article) => void;
  onCreateNewArticle: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  articles,
  categories,
  tickets = [],
  onNavigateTab,
  onEditArticle,
  onCreateNewArticle,
}) => {
  const analytics = getAnalyticsData();
  const maxDayViews = Math.max(...analytics.days.map(d => d.views), 10);
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            NGO Knowledge Hub Administration
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Real-time knowledge readership metrics, NGO visitor engagement, toolkit downloads, and user registrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreateNewArticle}
            className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Resource</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Readership */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resource Views</span>
            <Eye className="w-5 h-5 text-sky-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalViews}</div>
          <div className="text-[11px] text-sky-700 font-semibold mt-1">
            {analytics.publishedResources} published guides & toolkits
          </div>
        </div>

        {/* Registered Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered NGOs</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalUsers}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">
            {analytics.activeUsers} active organization accounts
          </div>
        </div>

        {/* Downloads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Toolkit Downloads</span>
            <Download className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalDownloads}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {analytics.totalBookmarks} saved bookmarks
          </div>
        </div>

        {/* Open Tickets */}
        <div 
          onClick={() => onNavigateTab('tickets')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Tickets</span>
            <LifeBuoy className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{openTicketsCount}</div>
          <div className="text-[11px] text-rose-700 font-semibold mt-1">
            Requires admin action
          </div>
        </div>
      </div>

      {/* 14-Day View Trend Bar Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-800" />
              14-Day Knowledge Article Traffic Trend
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Daily readership across all non-profit resource guides and compliance toolkits.
            </p>
          </div>
          <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
            Live Metrics
          </span>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-48 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-200">
          {analytics.days.map((day, idx) => {
            const heightPercent = Math.max(12, Math.round((day.views / maxDayViews) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-10 shadow">
                  {day.views} views ({day.displayDate})
                </div>

                <div 
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[28px] bg-gradient-to-t from-sky-800 to-sky-600 rounded-t-md group-hover:from-sky-700 group-hover:to-sky-500 transition-all shadow-2xs"
                ></div>
                <span className="text-[10px] text-slate-400 mt-2 font-mono truncate w-full text-center">
                  {day.displayDate.split(' ')[1]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-3">
          <span>14 Days Ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Top Read Resources Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Top Most Read Knowledge Resources
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Articles and toolkits generating the highest community NGO readership
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('articles')}
            className="text-xs font-bold text-sky-800 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Manage All Resources</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Resource Title</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-center">Total Views</th>
                <th className="p-4 text-center">Downloads</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {analytics.topReadResources.map((art) => {
                const title = art.titles.en || "Untitled Resource";
                return (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Updated: {art.updatedAt || 'Recent'}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
                        {art.resourceType ? art.resourceType.replace('_', ' ') : 'Guide'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800">
                      {art.views || 0}
                    </td>
                    <td className="p-4 text-center font-bold text-amber-700">
                      {art.downloadsCount || 0}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onEditArticle(art)}
                        className="p-1.5 text-slate-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Resource"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
