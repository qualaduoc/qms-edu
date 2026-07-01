'use client';

import { useEffect, useState } from 'react';
import RegisterForm from '@/features/auth/components/RegisterForm';
import TeacherDashboard from '@/features/teacher-dashboard/components/TeacherDashboard';
import LeadDashboard from '@/features/lead-dashboard/components/LeadDashboard';
import BghDashboard from '@/features/bgh-dashboard/components/BghDashboard';
import { UserRole, UserStatus } from '@/constants/roles';

interface DemoUser {
  fullName: string;
  role: UserRole;
  grade: string;
  status: UserStatus;
}

export default function DashboardPage() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra xem có đang chạy Demo Mode hay không
    const demoRole = localStorage.getItem('qms_demo_role');
    const demoName = localStorage.getItem('qms_user_name');
    const demoGrade = localStorage.getItem('qms_user_grade');
    const demoStatus = localStorage.getItem('qms_user_status') as UserStatus || 'approved'; // Mặc định demo duyệt luôn để test, có thể chỉnh sửa

    if (demoRole) {
      setUser({
        fullName: demoName || '',
        role: demoRole as UserRole,
        grade: demoGrade || '',
        status: demoStatus,
      });
      setLoading(false);
      return;
    }

    // 2. Nếu không có demo role, giả lập đang chờ kết nối hoặc check session từ Supabase
    // (Khi có Supabase thật sẽ thay thế đoạn này bằng check session auth thực tế)
    setTimeout(() => {
      // Giả định chưa đăng nhập thì đẩy về Home
      // window.location.href = '/';
      setUser(null);
      setLoading(false);
    }, 1000);
  }, []);

  const handleRegisterSuccess = (fullName: string, grade: string) => {
    // Cập nhật state sau khi cập nhật hồ sơ thành công
    const demoRole = localStorage.getItem('qms_demo_role') as UserRole || 'teacher';
    
    // Lưu vào storage cho demo
    localStorage.setItem('qms_user_name', fullName);
    localStorage.setItem('qms_user_grade', grade);
    localStorage.setItem('qms_user_status', 'pending'); // Sau khi gửi sẽ chờ duyệt

    setUser({
      fullName,
      role: demoRole,
      grade,
      status: 'pending',
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
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

  // Nếu không đăng nhập hoặc không có demo user
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-8 text-center">
        <div className="max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold">Chưa kết nối tài khoản</h2>
          <p className="text-sm text-slate-400">
            Vui lòng đăng nhập qua Google hoặc bật chế độ dùng thử (Demo) tại trang chủ để tiếp tục.
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
            <p>Hồ sơ của Thầy/Cô đã được gửi tới Khối trưởng và Ban Giám Hiệu phê duyệt.</p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mt-4 text-left space-y-1">
              <div>• <strong>Họ tên:</strong> {user.fullName}</div>
              <div>• <strong>Cấp quyền đề xuất:</strong> Giáo viên</div>
              <div>• <strong>Phân khối:</strong> {user.grade}</div>
            </div>
          </div>
          <div className="pt-4 space-y-3">
            {/* Nút giả lập duyệt nhanh cho Khầy Được test Demo */}
            <button
              onClick={() => {
                localStorage.setItem('qms_user_status', 'approved');
                window.location.reload();
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-xl py-3 font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              ⚡ Click nhanh để Duyệt tài khoản (Chỉ có ở Demo)
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 font-semibold transition-all cursor-pointer text-sm"
            >
              Đăng xuất
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
        <div className="p-8 text-center bg-slate-950 min-h-screen text-slate-200">
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="mt-4 text-slate-400">Đang phát triển các chức năng cài đặt nâng cao...</p>
          <button onClick={() => { localStorage.setItem('qms_demo_role', 'bgh'); window.location.reload(); }} className="mt-6 px-6 py-2 bg-orange-600 rounded-lg cursor-pointer font-bold text-xs">Xem BGH Dashboard</button>
          <button onClick={handleLogout} className="mt-6 ml-4 px-6 py-2 bg-slate-800 rounded-lg cursor-pointer font-bold text-xs">Đăng xuất</button>
        </div>
      )}
    </>
  );
}
