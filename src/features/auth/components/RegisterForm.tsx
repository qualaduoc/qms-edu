'use client';

import { useState } from 'react';
import { GRADES } from '@/constants/roles';

interface RegisterFormProps {
  onSuccess: (fullName: string, grade: string) => void;
  onLogout: () => void;
}

export default function RegisterForm({ onSuccess, onLogout }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và Tên của Thầy/Cô.');
      return;
    }

    if (!grade) {
      setError('Vui lòng chọn Khối giảng dạy hiện tại.');
      return;
    }

    onSuccess(fullName.trim(), grade);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      
      {/* Decorative Orbs */}
      <div className="absolute top-20 left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-orange-500"></div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Thông tin hồ sơ giáo viên
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Khai báo thông tin chính xác để thiết lập đồng bộ Google Drive của trường
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Họ và Tên */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Họ và Tên chính xác
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Thị Hoa"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-slate-200 placeholder-slate-600 focus:border-orange-500/50 focus:outline-none transition-all"
            />
          </div>

          {/* Khối giảng dạy */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Chọn Khối giảng dạy (Hoặc bộ môn)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGrade(item)}
                  className={`p-3 text-left rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    grade === item
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-xl py-3.5 font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-orange-500/10 text-sm"
            >
              Gửi thông tin phê duyệt
            </button>
            
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 py-2 transition-all cursor-pointer"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
