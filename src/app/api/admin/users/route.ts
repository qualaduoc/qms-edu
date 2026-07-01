import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';

// Helper kiểm tra xem user gọi API có phải là Super Admin thật sự không
async function isSuperAdmin(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    // Lấy token auth từ header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return false;

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return false;

    // Truy vấn role từ bảng profiles
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
    
    // Tạo object cập nhật động dựa vào các trường truyền lên
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (grade !== undefined) updateData.grade = grade;
    if (driveFolderId !== undefined) updateData.drive_folder_id = driveFolderId;

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
