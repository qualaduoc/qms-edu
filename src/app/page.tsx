'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Giả lập hoặc gọi Supabase Auth
    // supabase.auth.signInWithOAuth({ provider: 'google' })
    setTimeout(() => {
      setLoading(false);
      // Nếu có Supabase sẽ chuyển hướng, còn hiện tại thông báo demo
      alert('Hệ thống đang chờ kết nối Supabase của Khầy. Hãy click vào "Chế độ dùng thử (Demo)" bên dưới để trải nghiệm ngay giao diện!');
    }, 1000);
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
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white overflow-hidden">
      
      {/* CỘT TRÁI: Banner giới thiệu & Thẩm mỹ cao (Asymmetric split layout) */}
      <div className="relative flex flex-col justify-between p-8 lg:p-16 lg:w-7/12 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 border-b lg:border-b-0 lg:border-r border-slate-800/60 overflow-hidden">
        
        {/* Decorative Grid Background & Light Orbs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute -bottom-40 right-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Header Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-orange-500 p-0.5 shadow-lg shadow-blue-500/10">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950 text-base font-black text-orange-500">
              Q
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            QMS-<span className="text-orange-500">EDU</span>
          </span>
        </div>

        {/* Main Content */}
        <div className="relative z-10 my-auto py-12 lg:py-24 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/30 px-3 py-1 text-xs text-blue-400 font-medium mb-6 backdrop-blur-sm animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
            Giải pháp số hóa chất lượng sư phạm
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-slate-100">
            Hệ thống Báo cáo <br />
            & Quản lý Chất lượng <br />
            <span className="bg-gradient-to-r from-blue-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">
              Giáo Dục
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            QMS-EDU kết nối tự động hệ thống học liệu và báo cáo tuần của Giáo viên trực tiếp lên Google Drive của nhà trường, rút ngắn khâu phê duyệt cho Khối trưởng và Ban Giám Hiệu.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/40 bg-slate-900/30 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">📊</div>
              <span>Quét báo cáo tự động trên Drive</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/40 bg-slate-900/30 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">✨</div>
              <span>Giao diện trực quan khoa học</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2 mt-auto">
          <span>&copy; {new Date().getFullYear()} QMS-EDU. Mọi quyền được bảo lưu.</span>
          <span className="hover:text-slate-400 cursor-pointer transition-colors">Tài liệu tham khảo</span>
          <span className="hover:text-slate-400 cursor-pointer transition-colors">Hỗ trợ kỹ thuật</span>
        </div>
      </div>

      {/* CỘT PHẢI: Form Đăng nhập & Demo Mode */}
      <div className="flex flex-col justify-center items-center lg:w-5/12 p-8 lg:p-16 bg-slate-950 relative">
        <div className="w-full max-w-md space-y-8 z-10">
          
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">
              Đăng nhập hệ thống
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Sử dụng tài khoản Google được nhà trường cung cấp để truy cập
            </p>
          </div>

          <div className="space-y-4">
            {/* Nút Đăng nhập bằng Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 active:scale-[0.98] transition-all px-4 py-3.5 text-sm font-semibold text-slate-200 cursor-pointer disabled:opacity-50"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google icon"
                width={20}
                height={20}
              />
              {loading ? 'Đang kết nối...' : 'Tiếp tục với tài khoản Google'}
            </button>

            <div className="relative flex py-3 items-center text-xs text-slate-600 uppercase">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="mx-4">Hoặc trải nghiệm nhanh</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Chế độ Demo dùng thử */}
            {(!demoMode) ? (
              <button
                onClick={() => setDemoMode(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white transition-all px-4 py-3.5 text-sm font-semibold cursor-pointer shadow-lg shadow-orange-600/10"
              >
                🚀 Bật chế độ dùng thử (Demo)
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 backdrop-blur-sm animate-fade-in">
                <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2 text-center">
                  Vui lòng chọn vai trò để chạy Demo
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => selectDemoRole('teacher')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/40 hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer text-slate-200"
                  >
                    <span className="text-xl mb-1">👩‍🏫</span>
                    Giáo viên
                  </button>
                  <button
                    onClick={() => selectDemoRole('lead')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/40 hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer text-slate-200"
                  >
                    <span className="text-xl mb-1">🧑‍💼</span>
                    Khối trưởng
                  </button>
                  <button
                    onClick={() => selectDemoRole('bgh')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/40 hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer text-slate-200"
                  >
                    <span className="text-xl mb-1">🏫</span>
                    Ban Giám Hiệu
                  </button>
                  <button
                    onClick={() => selectDemoRole('super_admin')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/40 hover:bg-slate-900 transition-all text-xs font-semibold cursor-pointer text-slate-200"
                  >
                    <span className="text-xl mb-1">⚙️</span>
                    Super Admin
                  </button>
                </div>
                <button
                  onClick={() => setDemoMode(false)}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-400 mt-2 block"
                >
                  Quay lại đăng nhập thông thường
                </button>
              </div>
            )}
          </div>

          {/* Note Box */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">💡 Ghi chú hệ thống:</div>
            <p>1. Giáo viên mới đăng nhập lần đầu sẽ cần điền thông tin Họ Tên và Khối để gửi yêu cầu phê duyệt.</p>
            <p>2. Dữ liệu sẽ tự động đồng bộ hóa thời gian thực (Realtime) và đẩy trực tiếp lên Google Drive.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
