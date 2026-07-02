'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/services/supabaseClient';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Sau khi login Google thành công sẽ redirect về trang dashboard
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Lỗi đăng nhập Google:', err);
      alert(`Đăng nhập thất bại: ${err.message || 'Lỗi không xác định.'}`);
      setLoading(false);
    }
  };

  const selectDemoRole = (role: string) => {
    // Lưu role demo vào localStorage để chuyển hướng
    localStorage.setItem('qms_demo_role', role);
    localStorage.setItem('qms_user_name', role === 'teacher' ? 'Nguyễn Văn An' : role === 'lead' ? 'Trần Minh Tâm' : 'Ban Giám Hiệu');
    localStorage.setItem('qms_user_grade', role === 'teacher' || role === 'lead' ? 'Khối 1' : '');
    
    // Điều hướng sang trang dashboard tương ứng
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50 text-slate-900 selection:bg-brand-accent selection:text-white overflow-hidden">
      
      {/* CỘT TRÁI: Banner giới thiệu & Thẩm mỹ cao (Asymmetric split layout) */}
      <div className="relative flex flex-col justify-between p-8 lg:p-16 lg:w-7/12 bg-gradient-to-br from-brand-primary via-brand-primary-hover to-indigo-900 border-b lg:border-b-0 lg:border-r border-indigo-700/20 overflow-hidden">
        
        {/* Decorative Grid Background & Light Orbs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute -bottom-40 right-20 w-80 h-80 bg-brand-accent-light/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }}></div>
 
        {/* Header Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-0.5 shadow-lg shadow-indigo-600/20">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-base font-black text-white">
              Q
            </div>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            QMS-<span className="text-brand-accent">EDU</span>
          </span>
        </div>
 
        {/* Main Content */}
        <div className="relative z-10 my-auto py-8 lg:py-16 max-w-full flex flex-col lg:flex-row items-center justify-between gap-10">
          
          {/* Cột trái của Main Content: Phần chữ */}
          <div className="max-w-xl space-y-6 flex-grow">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-indigo-100 font-medium backdrop-blur-sm animate-fade-in">
              <span className="flex h-2 w-2 rounded-full bg-brand-accent animate-ping"></span>
              Giải pháp số hóa chất lượng sư phạm
            </div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.1] text-white">
              Hệ thống Báo cáo <br />
              & Quản lý Chất lượng <br />
              <span className="bg-gradient-to-r from-blue-100 via-orange-200 to-brand-accent-light bg-clip-text text-transparent">
                Giáo Dục
              </span>
            </h1>
            <p className="text-indigo-100 text-sm lg:text-base leading-relaxed max-w-lg">
              QMS-EDU kết nối tự động hệ thống học liệu và báo cáo tuần của Giáo viên trực tiếp lên Google Drive của nhà trường, rút ngắn khâu phê duyệt cho Khối trưởng và Ban Giám Hiệu.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs lg:text-sm text-indigo-50">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white shrink-0">📊</div>
                <span>Quét báo cáo tự động trên Drive</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent/25 text-brand-accent-light shrink-0">✨</div>
                <span>Giao diện trực quan khoa học</span>
              </div>
            </div>
          </div>

          {/* Cột phải của Main Content: Phần ảnh demo (Style Wow Design) */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 relative animate-fade-in group mt-6 lg:mt-0">
            {/* Vòng hào quang phát sáng phía sau */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/25 to-indigo-500/25 rounded-3xl blur-3xl opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
            {/* Khung ảnh viền mờ kính mờ Glassmorphism */}
            <div className="relative rounded-3xl border border-white/20 bg-white/5 p-2 shadow-2xl backdrop-blur-sm overflow-hidden group-hover:border-white/35 transition-all duration-300">
              <img
                src="https://cdn.gamma.app/mwvy6i8k79wma58/generated-images/KQZyAB-8zK_54VpOr4oL4.png"
                alt="QMS-EDU Dashboard Preview"
                className="w-full h-auto rounded-2xl object-cover shadow-inner group-hover:scale-[1.01] transition-transform duration-500"
              />
            </div>
          </div>

        </div>
 
        {/* Footer info */}
        <div className="relative z-10 text-xs text-indigo-200/80 flex flex-wrap gap-x-6 gap-y-2 mt-auto">
          <span>&copy; {new Date().getFullYear()} QMS-EDU. Mọi quyền được bảo lưu.</span>
          <span className="hover:text-white cursor-pointer transition-colors">Tài liệu tham khảo</span>
          <span className="hover:text-white cursor-pointer transition-colors">Hỗ trợ kỹ thuật</span>
        </div>
      </div>
 
      {/* CỘT PHẢI: Form Đăng nhập & Demo Mode */}
      <div className="flex flex-col justify-center items-center lg:w-5/12 p-8 lg:p-16 bg-white relative">
        <div className="w-full max-w-md space-y-8 z-10">
          
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Đăng nhập hệ thống
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Sử dụng tài khoản Google được nhà trường cung cấp để truy cập
            </p>
          </div>
 
          <div className="space-y-4">
            {/* Nút Đăng nhập bằng Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all px-4 py-4 text-sm font-bold text-slate-700 shadow-sm cursor-pointer disabled:opacity-50 btn-interactive"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google icon"
                width={20}
                height={20}
              />
              {loading ? 'Đang kết nối...' : 'Tiếp tục với tài khoản Google'}
            </button>
          </div>
 
          {/* Note Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800">💡 Ghi chú hệ thống:</div>
            <p>1. Giáo viên mới đăng nhập lần đầu sẽ cần điền thông tin Họ Tên và Khối để gửi yêu cầu phê duyệt.</p>
            <p>2. Dữ liệu sẽ tự động đồng bộ hóa thời gian thực (Realtime) và đẩy trực tiếp lên Google Drive.</p>
          </div>
 
        </div>
      </div>
    </div>
  );
}
