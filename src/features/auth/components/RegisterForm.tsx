'use client';

import { useState } from 'react';
import { GRADES, ROLES, UserRole } from '@/constants/roles';

interface RegisterFormProps {
  onSuccess: (fullName: string, grade: string, role: UserRole) => void;
  onLogout: () => void;
}

export default function RegisterForm({ onSuccess, onLogout }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.TEACHER);
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole);
    // Nếu chọn Ban giám hiệu thì không cần khối
    if (selectedRole === ROLES.BGH) {
      setGrade('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và Tên của Thầy/Cô.');
      return;
    }

    if (role !== ROLES.BGH && !grade) {
      setError(
        role === ROLES.LEAD 
          ? 'Vui lòng chọn Khối quản lý của Khối trưởng.' 
          : 'Vui lòng chọn Khối giảng dạy của Giáo viên.'
      );
      return;
    }

    onSuccess(fullName.trim(), role === ROLES.BGH ? '' : grade, role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800 p-6 relative overflow-hidden">
      
      {/* Decorative Orbs */}
      <div className="absolute top-20 left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-orange-500"></div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Thông tin hồ sơ nhân sự
          </h2>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            Khai báo thông tin chính xác để thiết lập phân quyền và đồng bộ hệ thống trường
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Họ và Tên */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Họ và Tên chính xác
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Thị Hoa"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
            />
          </div>

          {/* Lựa chọn vai trò */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Chọn vai trò nhân sự
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange(ROLES.TEACHER)}
                className={`p-3 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  role === ROLES.TEACHER
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                👤 Giáo viên
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange(ROLES.LEAD)}
                className={`p-3 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  role === ROLES.LEAD
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                👥 Khối trưởng
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange(ROLES.BGH)}
                className={`p-3 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  role === ROLES.BGH
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                🎓 BGH
              </button>
            </div>
          </div>

          {/* Khối giảng dạy / quản lý (Ẩn đi nếu là BGH) */}
          {role !== ROLES.BGH && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                {role === ROLES.LEAD ? 'Chọn Khối quản lý chuyên môn' : 'Chọn Khối giảng dạy (Hoặc bộ môn)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGrade(item)}
                    className={`p-3 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
                      grade === item
                        ? 'border-orange-500 bg-orange-50 text-orange-600 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-xl py-3.5 font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-orange-500/10 text-sm"
            >
              Gửi thông tin phê duyệt
            </button>
            
            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer text-center"
            >
              Đăng xuất tài khoản
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
