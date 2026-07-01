export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/services/googleDriveService';
import { getSupabaseAdmin } from '@/services/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { fileId, teacherId, weekNumber } = await req.json();

    if (!fileId || !teacherId) {
      return NextResponse.json({ error: 'Thiếu thông tin fileId hoặc teacherId.' }, { status: 400 });
    }

    // 1. Thực hiện xóa file trên Google Drive qua Service Account
    console.log(`[Drive API] Bắt đầu xóa file ID: ${fileId} trên Drive...`);
    await deleteFile(fileId);
    console.log(`[Drive API] Đã xóa file ID: ${fileId} trên Drive thành công.`);

    // 2. Không cần thay đổi nhiều trong Database vì dữ liệu file được quét trực tiếp từ Drive.
    // Tuy nhiên, ta có thể cập nhật thời gian thay đổi hoặc ghi chú nếu cần.

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tệp tin trên Google Drive thành công.'
    });

  } catch (err: any) {
    console.error('Lỗi khi xóa file trên Drive:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xóa file ở Server.' }, { status: 500 });
  }
}
