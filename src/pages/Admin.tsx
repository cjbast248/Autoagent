import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, User, Shield, Edit2, Key, Coins, Ban, Trash2, RefreshCw, UserCheck } from 'lucide-react';
import { UserEditModal } from '@/components/UserEditModal';
import ApiKeyManager from '@/components/admin/ApiKeyManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AgentManagement from '@/components/admin/AgentManagement';
import SystemMonitoring from '@/components/admin/SystemMonitoring';
import MarketingNotifications from '@/components/admin/MarketingNotifications';
import SecurityAudit from '@/components/admin/SecurityAudit';
import SupportTickets from '@/components/admin/SupportTickets';
import FinancialBilling from '@/components/admin/FinancialBilling';
import { GDPRMonitoring } from '@/components/admin/GDPRMonitoring';

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  account_type: string;
  user_role: 'admin' | 'moderator' | 'user';
  balance_usd: number;
  total_calls: number;
  total_minutes: number;
  total_spent_usd: number;
  plan: string;
  created_at: string;
  last_sign_in: string | null;
}

interface AdminStats {
  total_users: number;
  total_calls: number;
  total_revenue: number;
  active_users_today: number;
  banned_users: number;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const handleBlockUser = async (targetUser: AdminUser) => {
    if (!user) return;

    try {
      const newBanStatus = targetUser.account_type !== 'banned';

      const { error } = await supabase.rpc('admin_ban_user', {
        p_target_user_id: targetUser.user_id,
        p_ban_status: newBanStatus,
        p_admin_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Utilizatorul a fost ${newBanStatus ? 'blocat' : 'deblocat'} cu succes.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut modifica statusul utilizatorului.",
        variant: "destructive"
      });
    }
  };

  const handleAddCredits = async (targetUser: AdminUser, amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('admin_modify_balance', {
        p_target_user_id: targetUser.user_id,
        p_balance_amount: amount,
        p_operation: 'add',
        p_admin_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Am adăugat ${amount} USD în contul utilizatorului.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error adding credits:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut adăuga credite.",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (targetUser: AdminUser) => {
    if (!user) return;

    if (!confirm(`Sigur vrei să trimiți un email de resetare parolă către ${targetUser.email}?`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          target_user_id: targetUser.user_id,
          target_email: targetUser.email
        }
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Email de resetare parolă trimis către ${targetUser.email}`,
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut trimite email-ul de resetare parolă.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (targetUser: AdminUser) => {
    if (!user) return;

    if (!confirm(`⚠️ ATENȚIE: Această acțiune va șterge PERMANENT utilizatorul ${targetUser.email} și TOATE datele asociate.\n\nAceastă acțiune NU poate fi anulată!\n\nVrei să continui?`)) {
      return;
    }

    if (!confirm(`Confirmă din nou: Șterge definitiv utilizatorul ${targetUser.email}?`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          admin_user_id: user.id,
          target_user_id: targetUser.user_id
        }
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Utilizatorul ${targetUser.email} a fost șters complet din sistem.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut șterge utilizatorul.",
        variant: "destructive"
      });
    }
  };

  const fetchUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('admin_get_all_users', {
        p_admin_user_id: user.id
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca utilizatorii.",
        variant: "destructive"
      });
    }
  };

  const fetchStats = async () => {
    try {
      const totalUsers = users.length;
      const totalCalls = users.reduce((sum, u) => sum + (u.total_calls || 0), 0);
      const totalRevenue = users.reduce((sum, u) => sum + (u.balance_usd || 0), 0);
      const bannedUsers = users.filter(u => u.account_type === 'banned').length;

      setStats({
        total_users: totalUsers,
        total_calls: totalCalls,
        total_revenue: totalRevenue,
        active_users_today: Math.floor(totalUsers * 0.1),
        banned_users: bannedUsers
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (users.length > 0) {
      fetchStats();
      setLoadingData(false);
    }
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Se încarcă...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/pricing" replace />;
  }

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const firstName = (u.first_name || '').toLowerCase();
    const lastName = (u.last_name || '').toLowerCase();
    return email.includes(search) || firstName.includes(search) || lastName.includes(search);
  });

  // Dotted background style
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  const tabs = [
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'agents', label: 'Agents' },
    { id: 'system', label: 'System' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'security', label: 'Security' },
    { id: 'gdpr', label: 'GDPR' },
    { id: 'financial', label: 'Financial' },
    { id: 'settings', label: 'Settings' },
  ];

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-8" style={dotPatternStyle}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Admin Panel</h1>
              <p className="text-sm text-zinc-500">Manage users, permissions, and system health.</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition shadow-lg hover:-translate-y-0.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2 border-b border-zinc-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-[13px] font-medium rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-black text-white font-semibold'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Users Tab Content */}
          {activeTab === 'users' && (
            <>
              {/* Search */}
              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 pl-10 text-[13px] focus:outline-none focus:border-black transition"
                  />
                </div>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Users</span>
                    <span className="text-2xl font-bold tracking-tight font-mono">{formatNumber(stats.total_users)}</span>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Calls</span>
                    <span className="text-2xl font-bold tracking-tight font-mono">{formatNumber(stats.total_calls)}</span>
                  </div>
                  <div className="bg-black border border-black rounded-2xl p-5 flex flex-col justify-between h-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Revenue</span>
                    <span className="text-2xl font-bold tracking-tight font-mono text-green-400">{formatMoney(stats.total_revenue)}</span>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Today</span>
                    <span className="text-2xl font-bold tracking-tight font-mono">{formatNumber(stats.active_users_today)}</span>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Banned</span>
                    <span className="text-2xl font-bold tracking-tight font-mono text-red-500">{formatNumber(stats.banned_users)}</span>
                  </div>
                </div>
              )}

              {/* Table Header */}
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] px-6 mb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <div>User Identity</div>
                <div>Status</div>
                <div>Balance / Usage</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {loadingData ? (
                  <div className="text-center py-8 text-zinc-500">Se încarcă utilizatorii...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">Nu s-au găsit utilizatori.</div>
                ) : (
                  filteredUsers.map((adminUser) => {
                    const isAdmin = adminUser.user_role === 'admin';
                    const isBanned = adminUser.account_type === 'banned';

                    return (
                      <div
                        key={adminUser.user_id}
                        className={`group bg-white border rounded-2xl p-4 px-5 grid grid-cols-[2.5fr_1fr_1fr_1.5fr] items-center transition-all hover:border-zinc-400 hover:shadow-md hover:-translate-y-0.5 ${
                          isAdmin ? 'border-l-4 border-l-black border-zinc-200' : 'border-zinc-200'
                        } ${isBanned ? 'border-red-200 bg-red-50/30' : ''}`}
                      >
                        {/* User Identity */}
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isAdmin
                              ? 'bg-black text-white border-black'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}>
                            {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-black flex items-center gap-2">
                              {adminUser.first_name || ''} {adminUser.last_name || ''}
                              <span className={`text-[9px] px-1.5 rounded ${
                                isAdmin
                                  ? 'bg-black text-white'
                                  : 'bg-zinc-100 border border-zinc-200 text-zinc-500'
                              }`}>
                                {adminUser.user_role?.toUpperCase() || 'USER'}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">{adminUser.email || ''}</div>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isBanned
                              ? 'bg-red-100 text-red-600'
                              : 'bg-black text-white'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isBanned ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                            }`} />
                            {isBanned ? 'Banned' : 'Active'}
                          </div>
                        </div>

                        {/* Balance / Usage */}
                        <div>
                          <div className={`text-sm font-bold font-mono ${
                            (adminUser.balance_usd || 0) > 100 ? 'text-green-600' : 'text-black'
                          }`}>
                            ${(adminUser.balance_usd || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-zinc-400">{adminUser.total_calls || 0} calls</div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingUser(adminUser);
                              setEditModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600 hover:border-zinc-400 hover:text-black hover:bg-zinc-50 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(adminUser)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600 hover:border-zinc-400 hover:text-black hover:bg-zinc-50 transition"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const amount = parseFloat(prompt('Suma pentru adăugare (USD):') || '0');
                              if (amount > 0) {
                                handleAddCredits(adminUser, amount);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600 hover:border-zinc-400 hover:text-black hover:bg-zinc-50 transition"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>

                          <div className="w-px h-6 bg-zinc-200 mx-1" />

                          <button
                            onClick={() => handleBlockUser(adminUser)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition ${
                              isBanned
                                ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-300'
                                : 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:border-red-300'
                            }`}
                          >
                            {isBanned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(adminUser)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-[11px] font-semibold text-red-500 hover:bg-red-100 hover:border-red-300 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <UserEditModal
                user={editingUser}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                onUserUpdated={fetchUsers}
              />
            </>
          )}

          {/* Other Tabs Content */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <AnalyticsDashboard />
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <AgentManagement />
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <SystemMonitoring />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <MarketingNotifications />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <SecurityAudit />
            </div>
          )}

          {activeTab === 'gdpr' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <GDPRMonitoring />
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <FinancialBilling />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-lg font-bold mb-4">API Keys Management</h2>
              <ApiKeyManager />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
