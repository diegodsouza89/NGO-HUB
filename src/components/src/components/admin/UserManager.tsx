import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Clock, 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  Eye, 
  CheckCircle, 
  Ban,
  FileSpreadsheet,
  Globe
} from 'lucide-react';
import { User, LoginLog } from '../../types';
import { 
  getUsers, 
  getLoginLogs, 
  toggleUserStatus, 
  exportUsersCSV, 
  exportLoginLogsCSV 
} from '../../lib/storage';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [loginLogs] = useState<LoginLog[]>(getLoginLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleToggleStatus = (userId: string) => {
    toggleUserStatus(userId);
    setUsers(getUsers());
    if (selectedUser && selectedUser.id === userId) {
      const updated = getUsers().find(u => u.id === userId);
      if (updated) setSelectedUser(updated);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.organizationName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector =
      sectorFilter === 'all' || u.sector === sectorFilter;

    return matchesSearch && matchesSector;
  });

  const userLogs = selectedUser
    ? loginLogs.filter((l) => l.userId === selectedUser.id || l.userEmail.toLowerCase() === selectedUser.email.toLowerCase())
    : [];

  const handleDownloadUsersCSV = () => {
    const csvContent = exportUsersCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NGO_Registered_Users_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLoginLogsCSV = () => {
    const csvContent = exportLoginLogsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NGO_Login_Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allSectors = Array.from(new Set(users.map((u) => u.sector).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900">NGO Users & Visitor Records</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track registered non-profit organizations, designatory roles, login activity history, and access status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadUsersCSV}
            className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Users Report (CSV)
          </button>
          <button
            onClick={handleDownloadLoginLogsCSV}
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Export Login Logs (CSV)
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user name, email, or NGO organization..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            <option value="all">All NGO Sectors ({users.length})</option>
            {allSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">NGO User & Organization</th>
                <th className="py-3 px-4">Role & Sector</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4 text-center">Logins</th>
                <th className="py-3 px-4 text-center">Downloads</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
                    No NGO users found matching your search query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 leading-tight">{u.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" /> {u.organizationName}
                          </p>
                          <span className="text-[11px] text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-800">{u.role}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3 text-slate-400" /> {u.sector}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {new Date(u.registeredAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                        {u.loginCount || 1}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {u.downloadsCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                          <ShieldAlert className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedUser(u)}
                        title="View user login activity history"
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Logs</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                        className={`p-1.5 rounded-lg transition-colors inline-flex items-center text-xs font-medium ${
                          u.status === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Login Activity Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedUser.name} — Activity Log</h3>
                <p className="text-xs text-slate-300">{selectedUser.organizationName} • {selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[420px] overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-lg font-bold text-slate-900">{selectedUser.loginCount}</span>
                  <span className="text-slate-500">Total Logins</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-slate-900">{selectedUser.downloadsCount || 0}</span>
                  <span className="text-slate-500">Downloads</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-slate-900">{selectedUser.savedResourceIds?.length || 0}</span>
                  <span className="text-slate-500">Bookmarked Toolkits</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Recent Login History
                </h4>
                {userLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No historical log entries captured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {userLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="font-semibold text-slate-800">{log.device}</span>
                            <span className="block text-[11px] text-slate-500">
                              {new Date(log.timestamp).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Logged In
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
