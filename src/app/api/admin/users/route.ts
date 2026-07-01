export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';
import { getOrCreateFolder } from '@/services/googleDriveService';

// Helper kiểm tra xem user gọi API có phải là Super Admin thật sự không
async function isSuperAdmin(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return false;

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'super_admin';
  } catch (e) {
    return false;
  }
}

// Hàm chuẩn hóa tiếng Việt viết liền không dấu làm tên thư mục Giáo viên (ví dụ: DoThiAnhTuyet)
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD') // Tách dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, ''); // Chỉ giữ lại chữ cái và số
}

// Hàm chuẩn hóa tên Khối cho folder Drive (ví dụ: "Khối 1" -> "khoi-1", "Bộ môn đặc thù" -> "bo-mon-dac-thu")
function formatGradeFolderName(gradeStr: string): string {
  const raw = gradeStr
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Xóa ký tự đặc biệt, giữ khoảng trắng
    .replace(/\s+/g, '-'); // Đổi khoảng trắng thành gạch ngang
}

/**
 * GET: Lấy toàn bộ danh sách giáo viên và thành viên trong trường (Chỉ dành cho Admin)
 */
export async function GET(req: NextRequest) {
  const isAdmin = await isSuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: profiles });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách thành viên:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}

/**
 * PATCH: Cập nhật thông tin thành viên (Phân vai trò, khối, duyệt trạng thái)
 */
export async function PATCH(req: NextRequest) {
  const isAdmin = await isSuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role, status, grade, driveFolderId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID thành viên cần cập nhật.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // 1. Nếu có yêu cầu duyệt hoạt động thành 'approved' -> tự động tạo thư mục trên Drive
    let finalDriveFolderId = driveFolderId;
    
    if (status === 'approved') {
      // Lấy thông tin profile hiện tại để xác định tên và khối của giáo viên
      const { data: currentProfile, error: getErr } = await supabase
        .from('profiles')
        .select('full_name, grade, role, drive_folder_id')
        .eq('id', userId)
        .single();

      if (!getErr && currentProfile) {
        const userRole = role !== undefined ? role : currentProfile.role;
        const userGrade = grade !== undefined ? grade : currentProfile.grade;
        const currentFolderId = currentProfile.drive_folder_id;

        // Chỉ tự động tạo thư mục trên Drive đối với tài khoản Giáo viên và chưa có thư mục
        if (userRole === 'teacher' && userGrade && !currentFolderId && !finalDriveFolderId) {
          console.log(`[Admin API] Bắt đầu tự động tạo thư mục Drive khi duyệt giáo viên: ${currentProfile.full_name}`);
          
          try {
            // Lấy cấu hình root folder
            const { data: config } = await supabase
              .from('system_config')
              .select('google_root_folder_id')
              .limit(1)
              .maybeSingle();

            const rootDriveId = config?.google_root_folder_id || '17CFaCERq_F-EMxyi7oD6BFvqqxe57356';
            
            // Tên thư mục khối quy chuẩn (ví dụ: "khoi-1")
            const gradeFolderName = formatGradeFolderName(userGrade);
            const gradeFolderId = await getOrCreateFolder(gradeFolderName, rootDriveId);
            
            // Tên thư mục giáo viên không dấu viết liền (ví dụ: "DoThiAnhTuyet")
            const teacherFolderName = removeVietnameseTones(currentProfile.full_name || 'GiaoVien');
            const newFolderId = await getOrCreateFolder(teacherFolderName, gradeFolderId);
            
            console.log(`[Admin API] Đã tạo/Sử dụng thư mục Giáo viên ID: ${newFolderId}`);
            finalDriveFolderId = newFolderId;
          } catch (driveErr: any) {
            console.error('[Admin API] Lỗi tạo thư mục tự động trên Drive:', driveErr);
          }
        }
      }
    }

    // 2. Tạo object cập nhật động dựa vào các trường truyền lên
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (grade !== undefined) updateData.grade = grade;
    if (finalDriveFolderId !== undefined) updateData.drive_folder_id = finalDriveFolderId;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Cập nhật thành viên thành công.', data });
  } catch (error: any) {
    console.error('Lỗi cập nhật thành viên:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}
