export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';
import { findFolder, listFilesInFolder } from '@/services/googleDriveService';
import { FILE_TYPES } from '@/constants/roles';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const weekNumber = Number(searchParams.get('weekNumber'));

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

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ giáo viên.' }, { status: 404 });
    }

    const teacherFolderId = profile.drive_folder_id;

    // Nếu giáo viên chưa có thư mục gốc (tức là chưa từng nộp bài bao giờ)
    if (!teacherFolderId) {
      return NextResponse.json({ success: true, files: [] });
    }

    // 2. Tìm thư mục tuần (ví dụ: "Tuan-3") dưới thư mục giáo viên
    const weekFolderName = `Tuan-${weekNumber}`;
    const weekFolderId = await findFolder(weekFolderName, teacherFolderId);

    // Nếu thư mục tuần này chưa được tạo (chưa từng nộp bài tuần này)
    if (!weekFolderId) {
      return NextResponse.json({ success: true, files: [] });
    }

    // 3. Quét toàn bộ file trong thư mục tuần trên Drive
    console.log(`[Drive API] Quét file trong thư mục tuần ID: ${weekFolderId}`);
    const rawFiles = await listFilesInFolder(weekFolderId);

    // 4. Phân loại các file theo kiểu tài liệu (KHBD, KHGD, DCTD) dựa trên tiền tố tên file
    const formattedFiles = rawFiles.map(file => {
      const name = file.name.toUpperCase();
      let type = 'OTHER';
      
      if (name.startsWith(FILE_TYPES.KHBD)) {
        type = FILE_TYPES.KHBD;
      } else if (name.startsWith(FILE_TYPES.KHGD)) {
        type = FILE_TYPES.KHGD;
      } else if (name.startsWith(FILE_TYPES.DCTD)) {
        type = FILE_TYPES.DCTD;
      }

      return {
        id: file.id,
        name: file.name,
        url: file.url,
        type: type,
        uploadedAt: file.createdTime ? file.createdTime.split('T')[0] : ''
      };
    });

    return NextResponse.json({
      success: true,
      files: formattedFiles
    });

  } catch (err: any) {
    console.error('Lỗi API Quét Drive:', err);
    return NextResponse.json({ error: err.message || 'Lỗi quét thư mục Google Drive ở Server.' }, { status: 500 });
  }
}
