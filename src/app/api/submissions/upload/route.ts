export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';
import { getOrCreateFolder, uploadFile, listFilesInFolder, deleteFile } from '@/services/googleDriveService';

// Hàm helper loại bỏ dấu tiếng Việt và ký tự đặc biệt để đặt tên thư mục/file chuẩn xác
function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Y|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Loại bỏ ký tự đặc biệt, dấu cách để viết liền không dấu
  return str.replace(/[^a-zA-Z0-9]/g, "");
}

// Format tên khối lớp cho folder (ví dụ: "Khối 1" -> "Khoi-1", "Bộ môn đặc thù" -> "Bo-mon-dac-thu")
function formatGradeFolderName(gradeStr: string): string {
  let raw = gradeStr.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
                    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
                    .replace(/ì|í|ị|ỉ|ĩ/g, "i")
                    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
                    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
                    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
                    .replace(/đ/g, "d")
                    .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
                    .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
                    .replace(/Ì|Í|Ị|ỉ|Ĩ/g, "I")
                    .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
                    .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
                    .replace(/Ỳ|Ý|Y|Ỷ|Ỹ/g, "Y")
                    .replace(/Đ/g, "D");
  
  // Chuyển sang chữ thường, thay khoảng trắng thành dấu gạch ngang
  return raw.toLowerCase()
            .trim()
            .replace(/\s+/g, '-');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    const weekNumber = Number(formData.get('weekNumber'));
    const teacherId = formData.get('teacherId') as string;
    const teacherName = formData.get('teacherName') as string;
    const grade = formData.get('grade') as string;
    const teacherNote = formData.get('teacherNote') as string || '';
    const fileIndex = formData.get('fileIndex') as string || '1';

    // Validate inputs
    if (!file || !fileType || !weekNumber || !teacherId || !teacherName || !grade) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu tải lên.' }, { status: 400 });
    }

    // Validate dung lượng tối đa 15MB
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'Dung lượng file vượt quá giới hạn 15MB cho phép của nhà trường.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Tải cấu hình hệ thống từ bảng system_config
    const { data: config } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    const rootDriveId = config?.google_root_folder_id || '17CFaCERq_F-EMxyi7oD6BFvqqxe57356';
    const schoolYear = config?.school_year || '2026-2027';

    // 2. Lấy thông tin profiles của giáo viên để lấy drive_folder_id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('drive_folder_id')
      .eq('id', teacherId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ giáo viên.' }, { status: 404 });
    }

    let teacherFolderId = profile.drive_folder_id;

    // 3. Nếu giáo viên chưa có drive_folder_id, tiến hành tạo thư mục trên Drive
    if (!teacherFolderId) {
      console.log(`[Drive API] Giáo viên ${teacherName} chưa có thư mục. Bắt đầu tạo cây thư mục...`);
      
      // a. Tìm/Tạo thư mục Khối (ví dụ: "Khoi-1") dưới thư mục gốc
      const gradeFolderName = formatGradeFolderName(grade);
      const gradeFolderId = await getOrCreateFolder(gradeFolderName, rootDriveId);
      
      // b. Tìm/Tạo thư mục Giáo viên (ví dụ: "DoThiAnhTuyet") dưới thư mục Khối
      const teacherFolderName = removeVietnameseTones(teacherName);
      teacherFolderId = await getOrCreateFolder(teacherFolderName, gradeFolderId);

      // c. Cập nhật drive_folder_id vào profile giáo viên trong Database
      const { error: updateProfileErr } = await supabase
        .from('profiles')
        .update({ drive_folder_id: teacherFolderId })
        .eq('id', teacherId);

      if (updateProfileErr) {
        console.error('Lỗi lưu drive_folder_id vào database profiles:', updateProfileErr);
      } else {
        console.log(`[Drive API] Đã lưu drive_folder_id mới cho GV ${teacherName}: ${teacherFolderId}`);
      }
    }

    // 4. Tìm hoặc tạo thư mục Tuần (ví dụ: "Tuan-3") trực tiếp dưới thư mục Giáo viên
    const weekFolderName = `Tuan-${weekNumber}`;
    const weekFolderId = await getOrCreateFolder(weekFolderName, teacherFolderId);

    // 5. Chuẩn hóa tên file theo quy chuẩn (ví dụ: KHBD_Tuan03_DoThiAnhTuyet_GiaoAnToan1_1.docx)
    const teacherNameNoSign = removeVietnameseTones(teacherName);
    const weekStr = String(weekNumber).padStart(2, '0');
    // Lấy đuôi file động
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'docx';
    // Giữ lại tên gốc của file tải lên (không dấu viết liền, bỏ đuôi file cũ) để phân biệt các file khác nhau cùng loại
    const originalFileNameClean = removeVietnameseTones(file.name.replace(/\.[^/.]+$/, ''));
    const standardFileName = `${fileType}_Tuan${weekStr}_${teacherNameNoSign}_${originalFileNameClean}_${fileIndex}.${fileExtension}`;

    // 5.1 Kiểm tra xem file trùng tên đã tồn tại trên Drive của tuần đó chưa. Nếu có, xóa để ghi đè.
    try {
      console.log(`[Drive API] Đang quét kiểm tra file trùng tên: ${standardFileName} trong thư mục ${weekFolderName}...`);
      const existingFiles = await listFilesInFolder(weekFolderId);
      const duplicateFile = existingFiles.find(f => f.name === standardFileName);
      if (duplicateFile) {
        console.log(`[Drive API] Phát hiện file cũ trùng tên đã tồn tại (ID: ${duplicateFile.id}). Tiến hành xóa trước khi upload bản mới...`);
        await deleteFile(duplicateFile.id);
        console.log(`[Drive API] Đã xóa file trùng tên cũ thành công.`);
      }
    } catch (scanErr: any) {
      console.warn('[Drive API] Không thể quét/xóa file trùng tên cũ:', scanErr.message || scanErr);
    }

    // 6. Convert file thành Buffer để upload qua Drive API
    const fileBytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileBytes);
    
    // Xác định mimeType động dựa vào đuôi file
    let mimeType = 'application/octet-stream';
    if (fileExtension === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileExtension === 'doc') {
      mimeType = 'application/msword';
    } else if (fileExtension === 'pdf') {
      mimeType = 'application/pdf';
    } else if (fileExtension === 'xls') {
      mimeType = 'application/vnd.ms-excel';
    } else if (fileExtension === 'xlsx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    console.log(`[Drive API] Đang tải file lên thư mục tuần: ${weekFolderName}...`);
    const { fileId, fileUrl } = await uploadFile(fileBuffer, standardFileName, mimeType, weekFolderId);
    console.log(`[Drive API] Upload thành công! File ID: ${fileId}`);

    // 7. Ghi nhận trạng thái nộp bài vào bảng submissions
    const { error: upsertErr } = await supabase
      .from('submissions')
      .upsert({
        teacher_id: teacherId,
        week_number: weekNumber,
        school_year: schoolYear,
        teacher_note: teacherNote,
        submitted_at: new Date().toISOString(),
        lead_status: 'pending' // Khi có file mới -> reset chờ duyệt
      }, {
        onConflict: 'teacher_id,week_number,school_year'
      });

    if (upsertErr) {
      console.error('Lỗi khi lưu thông tin nộp bài vào database submissions:', upsertErr);
      return NextResponse.json({ error: 'File đã tải lên Drive nhưng lưu trạng thái vào Database thất bại.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: standardFileName,
        fileId: fileId,
        fileUrl: fileUrl,
        weekNumber: weekNumber
      }
    });

  } catch (err: any) {
    console.error('Lỗi API Upload:', err);
    return NextResponse.json({ error: err.message || 'Lỗi xử lý file upload ở Server.' }, { status: 500 });
  }
}
