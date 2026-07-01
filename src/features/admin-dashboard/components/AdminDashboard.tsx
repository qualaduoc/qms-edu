'use client';

import { useState, useEffect } from 'react';
import { UserRole, UserStatus, GRADES } from '@/constants/roles';
import { supabase } from '@/services/supabaseClient';

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
  });

  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Lưu ID user đang được xử lý

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
          google_drive_root_folder_id: configResult.data.google_drive_root_folder_id || '',
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
        // Cập nhật state list
        setProfiles(prev =>
          prev.map(p => (p.id === userId ? { ...p, ...result.data } : p))
        );
      } else {
        alert(`Lỗi cập nhật: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối mạng: ${err.message}`);
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
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          id: result.data.id,
        }));
        alert('Đã lưu cấu hình hệ thống thành công!');
      } else {
        alert(`Lỗi lưu cấu hình: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối mạng: ${err.message}`);
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

  // Lọc danh sách thành viên theo từ khóa tìm kiếm và các bộ lọc
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* HEADER */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-orange-500 p-0.5 shadow-md shadow-blue-500/10">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950 text-xs font-black text-orange-500">
              Q
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-slate-200">QMS-EDU ADMIN</div>
            <div className="text-[10px] text-slate-500 font-medium">Bảng điều khiển quản trị hệ thống</div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-slate-300">{user.fullName}</div>
            <div className="text-[10px] text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
              Super Admin
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* SUB HEADER - TAB SELECTOR */}
      <div className="bg-slate-900/30 border-b border-slate-900/60 px-6 py-1 flex gap-4">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'members'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          👥 Quản lý Thành viên
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'config'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚙️ Cấu hình Hệ thống
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* STATS OVERVIEW CARDS */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng thành viên</div>
              <div className="text-2xl font-black mt-1 text-slate-100">{stats.total}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tài khoản Google đã kết nối</div>
            </div>
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-10 w-10 bg-orange-500/10 rounded-full blur-md"></div>
              <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Chờ phê duyệt</div>
              <div className="text-2xl font-black mt-1 text-orange-400">{stats.pending}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Yêu cầu cần duyệt phân vai trò</div>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Đã kích hoạt</div>
              <div className="text-2xl font-black mt-1 text-emerald-400">{stats.approved}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Giáo viên / CBQL đang hoạt động</div>
            </div>
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Cơ cấu vai trò</div>
              <div className="text-xs font-semibold mt-2.5 text-slate-300 flex items-center justify-between gap-1">
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
          <div className="border border-slate-900 bg-slate-900/10 backdrop-blur-sm rounded-xl overflow-hidden">
            
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:max-w-sm">
                <input
                  type="text"
                  placeholder="Tìm thành viên (Tên, Email)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Filter Selectors */}
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 cursor-pointer"
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
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ phê duyệt</option>
                  <option value="approved">Đã phê duyệt</option>
                  <option value="rejected">Từ chối</option>
                </select>

                <button
                  onClick={loadData}
                  className="p-2 border border-slate-800 bg-slate-950 rounded-lg hover:bg-slate-900 active:scale-[0.98] transition-all cursor-pointer text-xs"
                  title="Tải lại dữ liệu"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 font-bold border-b border-slate-900">
                    <th className="p-4">Họ và Tên / Email</th>
                    <th className="p-4">Vai trò (Role)</th>
                    <th className="p-4">Khối</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                          <span>Đang tải danh sách thành viên...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        Không tìm thấy thành viên nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map(profile => {
                      const isProcessing = actionLoading === profile.id;
                      
                      return (
                        <tr key={profile.id} className="hover:bg-slate-900/20 transition-colors">
                          
                          {/* Name & Email */}
                          <td className="p-4">
                            <div className="font-bold text-slate-200">{profile.full_name || '(Chưa khai báo)'}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{profile.email}</div>
                          </td>

                          {/* Role selector */}
                          <td className="p-4">
                            <select
                              value={profile.role}
                              disabled={isProcessing}
                              onChange={e => handleUpdateUser(profile.id, { role: e.target.value as UserRole })}
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-semibold text-slate-300 cursor-pointer disabled:opacity-50"
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
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-semibold text-slate-300 cursor-pointer disabled:opacity-50"
                            >
                              <option value="">Không phân khối</option>
                              {GRADES.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              profile.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : profile.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse'
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
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
                                >
                                  Duyệt
                                </button>
                              )}
                              {profile.status !== 'rejected' && (
                                <button
                                  onClick={() => handleUpdateUser(profile.id, { status: 'rejected' })}
                                  disabled={isProcessing}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
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
          </div>
        )}

        {/* TAB 2: SYSTEM CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="border border-slate-900 bg-slate-900/10 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
            <h2 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
              <span>⚙️</span> Cấu hình Năm học & Cổng Google Drive
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Năm học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 2026-2027"
                  value={config.school_year}
                  onChange={e => setConfig(prev => ({ ...prev, school_year: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Dùng để định danh cấu trúc năm nộp tài liệu.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Ngày bắt đầu năm học (Khai giảng)</label>
                <input
                  type="date"
                  required
                  value={config.start_date}
                  onChange={e => setConfig(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Hệ thống dùng ngày này để tự động tính toán tuần học hiện tại (Tuần 1, Tuần 2,...).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Mã Thư mục Google Drive cha (Root Folder ID)</label>
                <input
                  type="text"
                  placeholder="Mã ID chuỗi ký tự trên URL của thư mục Google Drive"
                  value={config.google_drive_root_folder_id}
                  onChange={e => setConfig(prev => ({ ...prev, google_drive_root_folder_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Thư mục Google Drive mà nhà trường sở hữu để chứa các tệp nộp bài.</p>
              </div>

              <div className="pt-4 border-t border-slate-900/60 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10"
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
