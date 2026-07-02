export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin xác thực.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseAdmin();
    
    // Xác thực user từ token
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ.' }, { status: 401 });
    }

    // Kiểm tra role của user
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profErr || !profile || (profile.role !== 'bgh' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Không có quyền truy cập tính năng này.' }, { status: 403 });
    }

    let dbData: any[] | null = null;
    let queryError = null;

    // 1. Thử truy vấn đầy đủ với các cột mới
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          week_number,
          bgh_rating,
          bgh_feedback,
          submitted_at,
          teacher_note,
          elite_file_name,
          elite_file_url,
          profiles!teacher_id (
            id,
            full_name,
            grade,
            email
          )
        `)
        .not('bgh_rating', 'is', null)
        .order('submitted_at', { ascending: false });

      if (error) {
        queryError = error;
      } else {
        dbData = data;
      }
    } catch (e: any) {
      queryError = e;
    }

    // 2. Chế độ dự phòng (fallback) nếu thiếu cột mới
    if (queryError || !dbData) {
      console.warn('[BGH History API] Chạy chế độ fallback do thiếu cột mới:', queryError?.message || queryError);
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('submissions')
        .select(`
          week_number,
          bgh_rating,
          bgh_feedback,
          submitted_at,
          teacher_note,
          profiles!teacher_id (
            id,
            full_name,
            grade,
            email
          )
        `)
        .not('bgh_rating', 'is', null)
        .order('submitted_at', { ascending: false });

      if (fallbackErr) throw fallbackErr;
      dbData = fallbackData;
    }

    return NextResponse.json({ success: true, data: dbData });

  } catch (err: any) {
    console.error('[BGH History API] Lỗi:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}
