'use client';

import { useEffect, useState } from 'react';
import RegisterForm from '@/features/auth/components/RegisterForm';
import TeacherDashboard from '@/features/teacher-dashboard/components/TeacherDashboard';
import LeadDashboard from '@/features/lead-dashboard/components/LeadDashboard';
import BghDashboard from '@/features/bgh-dashboard/components/BghDashboard';
import AdminDashboard from '@/features/admin-dashboard/components/AdminDashboard';
import { UserRole, UserStatus } from '@/constants/roles';
import { supabase } from '@/services/supabaseClient';

interface UserProfileData {
  id: string;
  fullName: string;
  role: UserRole;
  grade: string;
  status: UserStatus;
  email: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Truy vấn thông tin profile của giáo viên từ database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Lỗi tải hồ sơ:', error);
        }

        if (profile) {
          setUser({
            id: profile.id,
            fullName: profile.full_name || '',
            role: profile.role as UserRole,
            grade: profile.grade || '',
            status: profile.status as UserStatus,
            email: profile.email,
          });
        } else {
          // User mới đăng nhập Google lần đầu, chưa khai báo Họ tên & Khối
          setUser({
            id: session.user.id,
            fullName: '',
            role: 'teacher', // Mặc định tự đăng ký là Giáo viên
            grade: '',
            status: 'pending',
            email: session.user.email || '',
          });
        }
      } catch (err) {
        console.error('Lỗi kiểm tra session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();

    // Lắng nghe sự thay đổi trạng thái đăng nhập của Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        checkUserSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRegisterSuccess = async (fullName: string, grade: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: fullName,
        grade: grade,
        role: 'teacher', // Mặc định giáo viên tự đăng ký
        status: 'pending', // Chờ duyệt thủ công
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setUser({
        id: session.user.id,
        fullName,
        role: 'teacher',
        grade,
        status: 'pending',
        email: session.user.email || '',
      });
    } catch (err: any) {
      console.error('Lỗi đăng ký hồ sơ:', err);
      alert(`Không thể lưu hồ sơ: ${err.message || 'Lỗi kết nối database.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    } finally {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-sm text-slate-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-8 text-center">
        <div className="max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold">Chưa đăng nhập tài khoản</h2>
          <p className="text-sm text-slate-400">
            Vui lòng đăng nhập qua Google tại trang chủ để tiếp tục truy cập hệ thống.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-3 font-semibold transition-all cursor-pointer"
          >
            Quay lại Trang chủ
          </button>
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP 1: Tài khoản mới, chưa khai báo thông tin hồ sơ (Tên, Khối)
  if (!user.fullName) {
    return (
      <RegisterForm 
        onSuccess={handleRegisterSuccess} 
        onLogout={handleLogout} 
      />
    );
  }

  // TRƯỜNG HỢP 2: Tài khoản đang ở trạng thái Chờ duyệt (Pending)
  if (user.status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-8 text-center">
        <div className="max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-orange-500"></div>
          <div className="text-5xl animate-bounce">⏳</div>
          <h2 className="text-2xl font-black">Yêu cầu đang chờ duyệt</h2>
          <div className="space-y-2 text-sm text-slate-400">
            <p>Xin chào <strong>{user.fullName}</strong>,</p>
            <p>Hồ sơ đăng ký của Thầy/Cô đã được ghi nhận và đang chờ Khối trưởng hoặc Ban Giám Hiệu phê duyệt để kích hoạt tài khoản.</p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mt-4 text-left space-y-1">
              <div>• <strong>Họ tên:</strong> {user.fullName}</div>
              <div>• <strong>Email:</strong> {user.email}</div>
              <div>• <strong>Đăng ký khối:</strong> {user.grade}</div>
            </div>
          </div>
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3.5 font-bold transition-all cursor-pointer text-sm"
            >
              Đăng xuất tài khoản
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP 3: Đã được duyệt
  if (viewMode === 'landing') {
    // Xác định tên vai trò hiển thị tiếng Việt cho người dùng
    const roleLabels = {
      teacher: 'Giáo viên',
      lead: 'Khối trưởng',
      bgh: 'Ban Giám Hiệu',
      super_admin: 'Quản trị viên hệ thống'
    };

    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
        {/* Các chấm sáng mờ tạo không gian sâu (Wow Design) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-950/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header trên Landing Page */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 relative z-10 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
                Q
              </div>
            </div>
            <div>
              <div className="text-sm font-black text-white leading-none">QMS-EDU</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Tiểu học Lương Thế Vinh</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Nội dung chính Landing */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-12 relative z-10 max-w-5xl mx-auto w-full">
          <div className="text-center space-y-3 mb-12 animate-fade-in">
            <span className="text-[10px] font-black text-brand-primary bg-brand-primary-light/10 border border-brand-primary-light/30 px-3 py-1 rounded-full uppercase tracking-widest">
              Hệ thống quản lý học liệu chất lượng cao
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Xin chào Thầy/Cô, <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">{user.fullName}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
              Tài khoản của Thầy/Cô đã được kích hoạt thành công với vai trò <strong className="text-indigo-400 font-bold">{roleLabels[user.role] || 'Giáo viên'}</strong>. Vui lòng chọn khu vực làm việc tiếp theo:
            </p>
          </div>

          {/* Grid 2 lựa chọn lớn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-2 sm:px-0">
            
            {/* CARD 1: KHO HỌC LIỆU VÀNG */}
            <div
              onClick={() => window.location.href = '/dashboard/library'}
              className="p-8 rounded-3xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/50 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between min-h-[300px] shadow-2xl relative cursor-pointer group active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 p-6 text-4xl group-hover:scale-110 transition-transform duration-300">🏆</div>
              <div className="space-y-4">
                <div className="text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  Chia sẻ & Học hỏi
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                  Kho Học Liệu Vàng
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Xem và tải xuống các bài học mẫu mực, kế hoạch bài dạy chất lượng cao được Ban Giám Hiệu nhà trường tuyển chọn và vinh danh toàn trường.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">Xem học liệu mẫu mực</span>
                <span className="h-8 w-8 rounded-full bg-slate-850 group-hover:bg-amber-500 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">➔</span>
              </div>
            </div>

            {/* CARD 2: KHU VỰC LÀM VIỆC */}
            <div
              onClick={() => setViewMode('workspace')}
              className="p-8 rounded-3xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/50 hover:border-brand-primary/50 transition-all duration-300 flex flex-col justify-between min-h-[300px] shadow-2xl relative cursor-pointer group active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 p-6 text-4xl group-hover:scale-110 transition-transform duration-300">💼</div>
              <div className="space-y-4">
                <div className="text-xs font-black text-brand-primary bg-brand-primary-light/10 border border-brand-primary-light/25 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  Nghiệp vụ Chuyên môn
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-brand-primary transition-colors">
                  Khu Vực Làm Việc
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {user.role === 'teacher' && 'Tải lên học liệu giảng dạy, theo dõi tiến độ nộp bài và xem nhận xét phê duyệt từ Khối trưởng & BGH.'}
                  {user.role === 'lead' && 'Theo dõi đôn đốc giáo viên trong tổ chuyên môn nộp bài, phê duyệt hồ sơ tuần học trực quan.'}
                  {user.role === 'bgh' && 'Khảo sát chất lượng giáo án ngẫu nhiên/thủ công toàn trường, gửi nhận xét đánh giá thi đua và vinh danh học liệu.'}
                  {user.role === 'super_admin' && 'Cấu hình thời gian hạn nộp học liệu hệ thống, quản lý tài khoản thành viên.'}
                </p>
              </div>
              <div className="pt-6 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Truy cập khu vực làm việc</span>
                <span className="h-8 w-8 rounded-full bg-slate-850 group-hover:bg-brand-primary flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">➔</span>
              </div>
            </div>

          </div>
        </main>

        {/* Footer của Landing Page */}
        <footer className="py-6 text-center text-[10px] text-slate-650 border-t border-slate-900 mt-12 bg-slate-950/40 relative z-10">
          <p>© 2026 QMS-EDU. Bản quyền thuộc về trường Tiểu học Lương Thế Vinh.</p>
        </footer>
      </div>
    );
  }

  // TRƯỜNG HỢP 4: Hiển thị Dashboard tương ứng khi chọn Khu vực làm việc
  return (
    <>
      {user.role === 'teacher' && (
        <TeacherDashboard user={user} onLogout={handleLogout} />
      )}
      {user.role === 'lead' && (
        <LeadDashboard user={user} onLogout={handleLogout} />
      )}
      {user.role === 'bgh' && (
        <BghDashboard user={user} onLogout={handleLogout} />
      )}
      {user.role === 'super_admin' && (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}
