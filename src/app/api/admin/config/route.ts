import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';

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

/**
 * GET: Lấy cấu hình hệ thống
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: config, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data: config || {} });
  } catch (error: any) {
    console.error('Lỗi lấy cấu hình:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}

/**
 * POST: Cập nhật hoặc thêm mới cấu hình hệ thống (Chỉ dành cho Admin)
 */
export async function POST(req: NextRequest) {
  const isAdmin = await isSuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      id, 
      schoolYear, 
      startDate, 
      googleDriveRootFolderId,
      khbdDeadlineDay,
      khbdDeadlineTime,
      khbdFrequency,
      khbdRequiredFiles,
      khgdDeadlineDay,
      khgdDeadlineTime,
      khgdRequiredFiles,
      dctdDeadlineDay,
      dctdDeadlineTime,
      dctdRequiredFiles
    } = body;

    const supabase = getSupabaseAdmin();
    
    const configData: any = {
      school_year: schoolYear,
      start_date: startDate,
      google_root_folder_id: googleDriveRootFolderId,
      khbd_deadline_day: khbdDeadlineDay !== undefined ? Number(khbdDeadlineDay) : undefined,
      khbd_deadline_time: khbdDeadlineTime,
      khbd_frequency: khbdFrequency !== undefined ? Number(khbdFrequency) : undefined,
      khbd_required_files: khbdRequiredFiles !== undefined ? Number(khbdRequiredFiles) : undefined,
      khgd_deadline_day: khgdDeadlineDay !== undefined ? Number(khgdDeadlineDay) : undefined,
      khgd_deadline_time: khgdDeadlineTime,
      khgd_required_files: khgdRequiredFiles !== undefined ? Number(khgdRequiredFiles) : undefined,
      dctd_deadline_day: dctdDeadlineDay !== undefined ? Number(dctdDeadlineDay) : undefined,
      dctd_deadline_time: dctdDeadlineTime,
      dctd_required_files: dctdRequiredFiles !== undefined ? Number(dctdRequiredFiles) : undefined,
    };

    // Loại bỏ các trường undefined để tránh ghi đè lỗi
    Object.keys(configData).forEach(key => {
      if (configData[key] === undefined) {
        delete configData[key];
      }
    });

    let result;
    if (id) {
      // Update config hiện có
      const { data, error } = await supabase
        .from('system_config')
        .update(configData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Thêm mới nếu chưa có
      const { data, error } = await supabase
        .from('system_config')
        .insert({
          ...configData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, message: 'Lưu cấu hình thành công.', data: result });
  } catch (error: any) {
    console.error('Lỗi lưu cấu hình:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}
