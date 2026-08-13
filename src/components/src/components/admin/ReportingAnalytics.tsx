import React from 'react';
import { 
  FileBarChart, 
  Download, 
  Users, 
  BookOpen, 
  TrendingUp, 
  FileSpreadsheet, 
  Bookmark, 
  CheckCircle,
  BarChart3,
  Globe
} from 'lucide-react';
import { 
  getAnalyticsData, 
  exportUsersCSV, 
  exportLoginLogsCSV, 
  exportResourceAnalyticsCSV 
} from '../../lib/storage';

export const ReportingAnalytics: React.FC = () => {
  const analytics = getAnalyticsData();

  const handleDownloadReport = (type: 'users' | 'logins' | 'resources') => {
    let csvContent = '';
    let fileName = '';

    if (type === 'users') {
      csvContent = exportUsersCSV();
      fileName = `NGO_Users_Registration_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'logins') {
      csvContent = exportLoginLogsCSV();
      fileName = `NGO_User_Login_Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'resources') {
      csvContent = exportResourceAnalyticsCSV();
      fileName = `NGO_Knowledge_Resources_Engagement_Report_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxLogins = Math.max(...analytics.days.map((d) => d.logins), 1);
  const maxViews = Math.max(...analytics.days.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-800 to-blue-900 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileBarChart className="w-6 h-6 text-sky-300" />
            <span className="text-xs uppercase tracking-wider font-semibold text-sky-200">NGO Knowledge Hub</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Reporting & Engagement Analytics</h2>
          <p className="text-xs text-sky-100/90 mt-1 max-w-xl">
            Monitor registered non-profit user registrations, visitor login activity, article readership, and resource toolkit downloads.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDownloadReport('users')}
            className="py-2.5 px-3.5 bg-white text-sky-950 hover:bg-sky-50 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-700" />
            User Registrations CSV
          </button>
          <button
            onClick={() => handleDownloadReport('resources')}
            className="py-2.5 px-3.5 bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-sky-200" />
            Content Usage CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered NGO Users</span>
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalUsers}</div>
          <span className="text-[11px] text-sky-700 font-semibold mt-1 inline-block">
            {analytics.activeUsers} active organizations
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Login Sessions</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalLoginSessions}</div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Captured across all devices
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Reads</span>
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalViews}</div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            {analytics.publishedResources} published resources
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Toolkit Downloads</span>
            <Download className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{analytics.totalDownloads}</div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 inline-block">
            {analytics.totalBookmarks} total bookmarks
          </span>
        </div>
      </div>

      {/* Login & Readership Activity Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-700" />
              14-Day Visitor Engagement & Readership Trend
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of daily active user login sessions vs. knowledge article page views.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-700">
              <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block"></span> Login Sessions
            </span>
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block"></span> Resource Views
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
          {analytics.days.map((d) => {
            const loginBarHeight = Math.max((d.logins / maxLogins) * 100, 10);
            const viewBarHeight = Math.max((d.views / maxViews) * 100, 12);

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    style={{ height: `${loginBarHeight}%` }}
                    className="w-1/2 bg-sky-600 group-hover:bg-sky-700 rounded-t-sm transition-all relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10 shadow">
                      {d.logins} logins
                    </span>
                  </div>
                  <div
                    style={{ height: `${viewBarHeight}%` }}
                    className="w-1/2 bg-blue-500 group-hover:bg-blue-600 rounded-t-sm transition-all relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10 shadow">
                      {d.views} views
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                  {d.displayDate}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Top Resources & Sector Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard: Most Read Articles & Downloads */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-700" />
            Top Engaged Knowledge Resources
          </h3>
          <div className="space-y-3">
            {analytics.topReadResources.map((art) => (
              <div
                key={art.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 bg-sky-100 px-2 py-0.5 rounded">
                    {art.resourceType.replace('_', ' ')}
                  </span>
                  <h4 className="text-xs font-semibold text-slate-900 mt-1 line-clamp-1">
                    {art.titles.en || 'Untitled Article'}
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-slate-700 flex-shrink-0">
                  <span className="flex items-center gap-1 text-blue-700" title="Views">
                    <BookOpen className="w-3 h-3" /> {art.views || 0}
                  </span>
                  <span className="flex items-center gap-1 text-amber-700" title="Downloads">
                    <Download className="w-3 h-3" /> {art.downloadsCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-700" />
            Registered NGO Sector Focus Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.sectorCounts).map(([sector, count]) => {
              const pct = Math.round((count / analytics.totalUsers) * 100) || 0;
              return (
                <div key={sector}>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>{sector}</span>
                    <span>{count} NGOs ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
