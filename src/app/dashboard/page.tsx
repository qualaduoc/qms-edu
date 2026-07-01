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

  // TRƯỜNG HỢP 3: Đã được duyệt, hiển thị Dashboard tương ứng
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
