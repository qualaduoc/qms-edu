'use client';

import { useState, useEffect } from 'react';
import { UserRole, UserStatus, GRADES } from '@/constants/roles';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/components/common/Toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  grade: string;
  status: UserStatus;
  created_at: string;
}

interface SystemConfig {
  id?: string;
  school_year: string;
  start_date: string;
  google_drive_root_folder_id: string;
  khbd_deadline_day: number;
  khbd_deadline_time: string;
  khbd_frequency: number;
  khbd_required_files: number;
  khgd_deadline_day: number;
  khgd_deadline_time: string;
  khgd_required_files: number;
  dctd_deadline_day: number;
  dctd_deadline_time: string;
  dctd_required_files: number;
}

interface AdminDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
    email?: string;
  };
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'config'>('members');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    school_year: '2026-2027',
    start_date: '2026-09-01',
    google_drive_root_folder_id: '',
    khbd_deadline_day: 5,
    khbd_deadline_time: '16:00',
    khbd_frequency: 2,
    khbd_required_files: 2,
    khgd_deadline_day: 5,
    khgd_deadline_time: '16:00',
    khgd_required_files: 1,
    dctd_deadline_day: 5,
    dctd_deadline_time: '16:00',
    dctd_required_files: 1,
  });

  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load danh sách thành viên và cấu hình
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;

      // 1. Tải danh sách thành viên
      const usersRes = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const usersResult = await usersRes.json();
      if (usersRes.ok) {
        setProfiles(usersResult.data || []);
      } else {
        console.error('Lỗi tải thành viên:', usersResult.error);
      }

      // 2. Tải cấu hình hệ thống
      const configRes = await fetch('/api/admin/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const configResult = await configRes.json();
      if (configRes.ok && configResult.data?.id) {
        setConfig({
          id: configResult.data.id,
          school_year: configResult.data.school_year || '',
          start_date: configResult.data.start_date || '',
          google_drive_root_folder_id: configResult.data.google_root_folder_id || '',
          khbd_deadline_day: configResult.data.khbd_deadline_day !== null ? Number(configResult.data.khbd_deadline_day) : 5,
          khbd_deadline_time: configResult.data.khbd_deadline_time || '16:00',
          khbd_frequency: configResult.data.khbd_frequency !== null ? Number(configResult.data.khbd_frequency) : 2,
          khbd_required_files: configResult.data.khbd_required_files !== null ? Number(configResult.data.khbd_required_files) : 2,
          khgd_deadline_day: configResult.data.khgd_deadline_day !== null ? Number(configResult.data.khgd_deadline_day) : 5,
          khgd_deadline_time: configResult.data.khgd_deadline_time || '16:00',
          khgd_required_files: configResult.data.khgd_required_files !== null ? Number(configResult.data.khgd_required_files) : 1,
          dctd_deadline_day: configResult.data.dctd_deadline_day !== null ? Number(configResult.data.dctd_deadline_day) : 5,
          dctd_deadline_time: configResult.data.dctd_deadline_time || '16:00',
          dctd_required_files: configResult.data.dctd_required_files !== null ? Number(configResult.data.dctd_required_files) : 1,
        });
      }
    } catch (err) {
      console.error('Lỗi kết nối dữ liệu Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cập nhật thuộc tính của thành viên (Duyệt, đổi vai trò, đổi khối)
  const handleUpdateUser = async (userId: string, updates: { role?: UserRole; status?: UserStatus; grade?: string }) => {
    setActionLoading(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setProfiles(prev =>
          prev.map(p => (p.id === userId ? { ...p, ...result.data } : p))
        );
        showToast('Cập nhật trạng thái thành viên thành công!', 'success');
      } else {
        showToast(`Lỗi cập nhật: ${result.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối mạng: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Lưu cấu hình hệ thống
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: config.id,
          schoolYear: config.school_year,
          startDate: config.start_date,
          googleDriveRootFolderId: config.google_drive_root_folder_id,
          khbdDeadlineDay: config.khbd_deadline_day,
          khbdDeadlineTime: config.khbd_deadline_time,
          khbdFrequency: config.khbd_frequency,
          khbdRequiredFiles: config.khbd_required_files,
          khgdDeadlineDay: config.khgd_deadline_day,
          khgdDeadlineTime: config.khgd_deadline_time,
          khgdRequiredFiles: config.khgd_required_files,
          dctdDeadlineDay: config.dctd_deadline_day,
          dctdDeadlineTime: config.dctd_deadline_time,
          dctdRequiredFiles: config.dctd_required_files,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          id: result.data.id,
        }));
        showToast('Đã lưu cấu hình hệ thống thành công!', 'success');
      } else {
        showToast(`Lỗi lưu cấu hình: ${result.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối mạng: ${err.message}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Tính toán số liệu thống kê nhanh
  const stats = {
    total: profiles.length,
    pending: profiles.filter(p => p.status === 'pending').length,
    approved: profiles.filter(p => p.status === 'approved').length,
    teachers: profiles.filter(p => p.role === 'teacher').length,
    leads: profiles.filter(p => p.role === 'lead').length,
    bgh: profiles.filter(p => p.role === 'bgh').length,
  };

  // Lọc danh sách thành viên
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER: OLM Style - Brand Primary Background */}
      <header className="relative z-10 bg-brand-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
              Q
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-white leading-none">QMS-EDU ADMIN</div>
            <div className="text-[10px] text-indigo-200 font-medium">Bảng điều khiển quản trị hệ thống</div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-white">{user.fullName}</div>
            <div className="text-[10px] text-white font-bold bg-brand-accent px-2.5 py-0.5 rounded-full inline-block mt-0.5 shadow-sm">
              Super Admin
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            🏠 Chọn khu vực
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* SUB HEADER - TAB SELECTOR: White background, bottom border */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-1 flex gap-4 shadow-sm">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'members'
              ? 'border-brand-accent text-brand-accent font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          👥 Quản lý Thành viên
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'config'
              ? 'border-brand-accent text-brand-accent font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          ⚙️ Cấu hình Hệ thống
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* STATS OVERVIEW CARDS: OLM Light style */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200/60 bg-white shadow-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng thành viên</div>
              <div className="text-2xl font-black mt-1 text-slate-900">{stats.total}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tài khoản Google kết nối</div>
            </div>
            <div className="p-4 rounded-xl border border-brand-accent/30 bg-brand-accent-light/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-10 w-10 bg-brand-accent/5 rounded-full blur-md"></div>
              <div className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">Chờ phê duyệt</div>
              <div className="text-2xl font-black mt-1 text-brand-accent">{stats.pending}</div>
              <div className="text-[10px] text-brand-accent mt-0.5">Cần duyệt phân vai trò</div>
            </div>
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Đã kích hoạt</div>
              <div className="text-2xl font-black mt-1 text-emerald-600">{stats.approved}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Thành viên đang hoạt động</div>
            </div>
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Cơ cấu vai trò</div>
              <div className="text-xs font-bold mt-2.5 text-slate-700 flex items-center justify-between gap-1">
                <span>GV: {stats.teachers}</span>
                <span>•</span>
                <span>Khối Trưởng: {stats.leads}</span>
                <span>•</span>
                <span>BGH: {stats.bgh}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MEMBERS MANAGEMENT */}
        {activeTab === 'members' && (
          <div className="border border-slate-200/80 bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
            
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
              
              {/* Search Bar */}
              <div className="relative w-full md:max-w-sm">
                <input
                  type="text"
                  placeholder="Tìm thành viên (Tên, Email)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
                />
              </div>

              {/* Filter Selectors */}
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary shadow-sm"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="lead">Khối trưởng</option>
                  <option value="bgh">Ban Giám Hiệu</option>
                  <option value="super_admin">Super Admin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary shadow-sm"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ phê duyệt</option>
                  <option value="approved">Đã phê duyệt</option>
                  <option value="rejected">Từ chối</option>
                </select>

                <button
                  onClick={loadData}
                  className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer text-xs shadow-sm"
                  title="Tải lại dữ liệu"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Desktop View: Members Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-4">Họ và Tên / Email</th>
                    <th className="p-4">Vai trò (Role)</th>
                    <th className="p-4">Khối</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-accent border-t-transparent"></div>
                          <span className="font-semibold">Đang tải danh sách thành viên...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                        Không tìm thấy thành viên nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map(profile => {
                      const isProcessing = actionLoading === profile.id;
                      
                      return (
                        <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                          
                          {/* Name & Email */}
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{profile.full_name || '(Chưa khai báo)'}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{profile.email}</div>
                          </td>

                          {/* Role selector */}
                          <td className="p-4">
                            <select
                              value={profile.role}
                              disabled={isProcessing}
                              onChange={e => handleUpdateUser(profile.id, { role: e.target.value as UserRole })}
                              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50 focus:outline-none focus:border-brand-primary"
                            >
                              <option value="teacher">👨‍🏫 Giáo viên</option>
                              <option value="lead">🧑‍💼 Khối trưởng</option>
                              <option value="bgh">🏫 Ban Giám Hiệu</option>
                              <option value="super_admin">⚙️ Super Admin</option>
                            </select>
                          </td>

                          {/* Grade selector */}
                          <td className="p-4">
                            <select
                              value={profile.grade || ''}
                              disabled={isProcessing}
                              onChange={e => handleUpdateUser(profile.id, { grade: e.target.value })}
                              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50 focus:outline-none focus:border-brand-primary"
                            >
                              <option value="">Không phân khối</option>
                              {GRADES.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                              profile.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : profile.status === 'rejected'
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-orange-50 text-orange-600 border border-orange-200'
                            }`}>
                              {profile.status === 'approved' && 'Đã duyệt'}
                              {profile.status === 'rejected' && 'Từ chối'}
                              {profile.status === 'pending' && 'Chờ duyệt'}
                            </span>
                          </td>

                          {/* Approval Actions */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {profile.status !== 'approved' && (
                                <button
                                  onClick={() => handleUpdateUser(profile.id, { status: 'approved' })}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                                >
                                  Duyệt
                                </button>
                              )}
                              {profile.status !== 'rejected' && (
                                <button
                                  onClick={() => handleUpdateUser(profile.id, { status: 'rejected' })}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                                >
                                  Từ chối
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Cards list (Visible only on mobile screen widths) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-accent border-t-transparent"></div>
                    <span className="font-semibold">Đang tải danh sách...</span>
                  </div>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">
                  Không tìm thấy thành viên nào khớp bộ lọc.
                </div>
              ) : (
                filteredProfiles.map(profile => {
                  const isProcessing = actionLoading === profile.id;
                  
                  return (
                    <div key={profile.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      {/* Tên & Status Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-800 text-sm leading-tight">{profile.full_name || '(Chưa khai báo)'}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">{profile.email}</div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          profile.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : profile.status === 'rejected'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-orange-50 text-orange-600 border border-orange-200'
                        }`}>
                          {profile.status === 'approved' && 'Đã duyệt'}
                          {profile.status === 'rejected' && 'Từ chối'}
                          {profile.status === 'pending' && 'Chờ duyệt'}
                        </span>
                      </div>

                      {/* Selectors grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Vai trò</label>
                          <select
                            value={profile.role}
                            disabled={isProcessing}
                            onChange={e => handleUpdateUser(profile.id, { role: e.target.value as UserRole })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50 focus:outline-none focus:border-brand-primary"
                          >
                            <option value="teacher">👨‍🏫 Giáo viên</option>
                            <option value="lead">🧑‍💼 Khối trưởng</option>
                            <option value="bgh">🏫 Ban Giám Hiệu</option>
                            <option value="super_admin">⚙️ Super Admin</option>
                          </select>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Khối</label>
                          <select
                            value={profile.grade || ''}
                            disabled={isProcessing}
                            onChange={e => handleUpdateUser(profile.id, { grade: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50 focus:outline-none focus:border-brand-primary"
                          >
                            <option value="">Không phân khối</option>
                            {GRADES.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Actions buttons */}
                      <div className="flex justify-end gap-2 pt-2">
                        {profile.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateUser(profile.id, { status: 'approved' })}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                          >
                            Duyệt tài khoản
                          </button>
                        )}
                        {profile.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateUser(profile.id, { status: 'rejected' })}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                          >
                            Từ chối
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SYSTEM CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="border border-slate-200 bg-white rounded-xl p-6 max-w-2xl mx-auto shadow-sm animate-fade-in">
            <h2 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-brand-accent text-base">⚙️</span> Cấu hình Năm học & Cổng Google Drive
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Năm học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 2026-2027"
                  value={config.school_year}
                  onChange={e => setConfig(prev => ({ ...prev, school_year: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors shadow-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Dùng để định danh cấu trúc năm nộp tài liệu.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Ngày bắt đầu năm học (Khai giảng)</label>
                <input
                  type="date"
                  required
                  value={config.start_date}
                  onChange={e => setConfig(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors shadow-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Hệ thống dùng ngày này để tự động tính toán tuần học hiện tại (Tuần 1, Tuần 2,...).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Mã Thư mục Google Drive cha (Root Folder ID)</label>
                <input
                  type="text"
                  placeholder="Mã ID chuỗi ký tự trên URL của thư mục Google Drive"
                  value={config.google_drive_root_folder_id}
                  onChange={e => setConfig(prev => ({ ...prev, google_drive_root_folder_id: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors shadow-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">Thư mục Google Drive mà nhà trường sở hữu để chứa các tệp nộp bài.</p>
              </div>

              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">🔔 Cấu hình Hạn nộp & Nhắc nhở Học liệu</h3>
                
                {/* KHBD (Giáo án) */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">📚 Kế hoạch bài dạy (Giáo án)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Thứ nộp bài (Hàng tuần)</label>
                      <select
                        value={config.khbd_deadline_day}
                        onChange={e => setConfig(prev => ({ ...prev, khbd_deadline_day: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary shadow-sm"
                      >
                        <option value={1}>Thứ Hai</option>
                        <option value={2}>Thứ Ba</option>
                        <option value={3}>Thứ Tư</option>
                        <option value={4}>Thứ Năm</option>
                        <option value={5}>Thứ Sáu</option>
                        <option value={6}>Thứ Bảy</option>
                        <option value={7}>Chủ Nhật</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Hạn giờ nộp (HH:MM)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 16:00"
                        value={config.khbd_deadline_time}
                        onChange={e => setConfig(prev => ({ ...prev, khbd_deadline_time: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tần suất nộp (Số tuần/lần)</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={config.khbd_frequency}
                        onChange={e => setConfig(prev => ({ ...prev, khbd_frequency: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Số lượng file yêu cầu</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={config.khbd_required_files}
                        onChange={e => setConfig(prev => ({ ...prev, khbd_required_files: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* KHGD (Kế hoạch tuần) */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">📅 Kế hoạch giảng dạy (Đầu tháng)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngày nộp bài trong tháng (1-31)</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={config.khgd_deadline_day}
                        onChange={e => setConfig(prev => ({ ...prev, khgd_deadline_day: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Hạn giờ nộp (HH:MM)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 16:00"
                        value={config.khgd_deadline_time}
                        onChange={e => setConfig(prev => ({ ...prev, khgd_deadline_time: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DCTD (Điều chỉnh sau tiết dạy) */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">📝 Điều chỉnh sau tiết dạy (Hàng tuần)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Thứ nộp bài (Hàng tuần)</label>
                      <select
                        value={config.dctd_deadline_day}
                        onChange={e => setConfig(prev => ({ ...prev, dctd_deadline_day: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary shadow-sm"
                      >
                        <option value={1}>Thứ Hai</option>
                        <option value={2}>Thứ Ba</option>
                        <option value={3}>Thứ Tư</option>
                        <option value={4}>Thứ Năm</option>
                        <option value={5}>Thứ Sáu</option>
                        <option value={6}>Thứ Bảy</option>
                        <option value={7}>Chủ Nhật</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Hạn giờ nộp (HH:MM)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 16:00"
                        value={config.dctd_deadline_time}
                        onChange={e => setConfig(prev => ({ ...prev, dctd_deadline_time: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Chạy Quét Nhắc Nhở Thử Nghiệm */}
                <div className="p-4 rounded-xl border border-dashed border-brand-accent/30 bg-brand-accent-light/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-black text-brand-accent uppercase tracking-wider">🔬 Chế độ quét nhắc nhở thử nghiệm</div>
                    <p className="text-[10px] text-slate-500 max-w-md">Bấm nút bên cạnh để lập tức giả lập quét nộp bài của toàn trường và gửi email thúc giục giáo viên thiếu file (Khầy không cần đợi đến thứ Sáu để kiểm thử).</p>
                  </div>
                  <a
                    href="/api/cron/check-deadlines?test=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-xs font-bold cursor-pointer transition-all text-center shrink-0 shadow-sm"
                  >
                    🚀 Chạy quét ngay ↗
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow shadow-indigo-600/10 btn-interactive"
                >
                  {savingConfig ? 'Đang lưu cấu hình...' : 'Lưu cấu hình hệ thống'}
                </button>
              </div>

            </form>
          </div>
        )}

      </main>

    </div>
  );
}
