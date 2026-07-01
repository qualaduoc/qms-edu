export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';
import { findFolder, listFilesInFolder, shareFilePublicly } from '@/services/googleDriveService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const weekNumber = Number(searchParams.get('weekNumber'));
    const fileName = searchParams.get('fileName') || '';

    if (!teacherId || !weekNumber) {
      return NextResponse.json({ error: 'Thiếu thông tin teacherId hoặc weekNumber.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Lấy thông tin drive_folder_id của giáo viên từ database
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('drive_folder_id')
      .eq('id', teacherId)
      .single();

    if (profileErr || !profile || !profile.drive_folder_id) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ hoặc thư mục Drive của giáo viên.' }, { status: 404 });
    }

    const teacherFolderId = profile.drive_folder_id;

    // 2. Tìm thư mục tuần (ví dụ: "Tuan-1") dưới thư mục giáo viên
    const weekFolderName = `Tuan-${weekNumber}`;
    const weekFolderId = await findFolder(weekFolderName, teacherFolderId);

    if (!weekFolderId) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục tuần học trên Drive.' }, { status: 404 });
    }

    // 3. Quét các file trong thư mục tuần trên Drive
    const rawFiles = await listFilesInFolder(weekFolderId);

    // 4. Tìm file khớp nhất theo tên
    // Chuẩn hóa tên để so sánh (không dấu, viết thường, bỏ khoảng trắng)
    const normalize = (str: string) => 
      str.toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[^a-z0-9]/g, '');

    const targetNorm = normalize(fileName);
    let matchedFile = rawFiles.find(f => normalize(f.name) === targetNorm);

    // Nếu không tìm thấy file khớp chính xác tên, tìm file KHBD đầu tiên làm fallback
    if (!matchedFile) {
      matchedFile = rawFiles.find(f => f.name.toUpperCase().startsWith('KHBD'));
    }

    // Nếu vẫn không có, lấy file bất kỳ đầu tiên trong thư mục tuần
    if (!matchedFile && rawFiles.length > 0) {
      matchedFile = rawFiles[0];
    }

    if (matchedFile && matchedFile.url && matchedFile.url !== '#') {
      // Tự động mở khóa quyền xem công khai (anyone with link can view) cho tệp vinh danh
      try {
        await shareFilePublicly(matchedFile.id);
      } catch (e) {
        console.warn('[GetLink API] Không thể share file công khai:', e);
      }
      // Chuyển hướng người dùng trực tiếp tới URL thật của file trên Google Drive
      return NextResponse.redirect(matchedFile.url);
    }

    // Nếu không tìm thấy file nào trên Drive, chuyển hướng về thư mục tuần của giáo viên (an toàn)
    const folderUrl = `https://drive.google.com/drive/folders/${weekFolderId}`;
    return NextResponse.redirect(folderUrl);

  } catch (err: any) {
    console.error('Lỗi API Get Link Redirect:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server khi chuyển hướng file.' }, { status: 500 });
  }
}
