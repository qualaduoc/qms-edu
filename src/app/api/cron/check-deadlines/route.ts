import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/services/supabaseClient';
import { findFolder, listFilesInFolder } from '@/services/googleDriveService';
import { sendDeadlineReminderEmail } from '@/services/emailService';

// Hàm helper tính toán Tuần dạy học hiện tại
function getCurrentWeek(startDateStr: string): number {
  const startDate = new Date(startDateStr);
  const today = new Date();
  
  // Tính số ngày chênh lệch giữa hôm nay và ngày bắt đầu năm học
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 1;
  
  // 7 ngày = 1 tuần
  const week = Math.ceil(diffDays / 7);
  return week > 35 ? 35 : week;
}

// Map số ngày sang tên Thứ Tiếng Việt để gửi mail cho thân thiện
function getDayNameVi(dayNum: number): string {
  if (dayNum === 1) return 'Thứ Hai';
  if (dayNum === 2) return 'Thứ Ba';
  if (dayNum === 3) return 'Thứ Tư';
  if (dayNum === 4) return 'Thứ Năm';
  if (dayNum === 5) return 'Thứ Sáu';
  if (dayNum === 6) return 'Thứ Bảy';
  return 'Chủ Nhật';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isTestMode = searchParams.get('test') === 'true';

    const supabase = getSupabaseAdmin();

    // 1. Đọc cấu hình hệ thống
    const { data: config, error: configErr } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configErr) {
      console.error('[Cron API] Lỗi lấy cấu hình hệ thống:', configErr);
      return NextResponse.json({ success: false, error: 'Không thể đọc cấu hình hệ thống.' }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json({ success: false, error: 'Chưa có cấu hình hệ thống trong database.' }, { status: 400 });
    }

    const startDateStr = config.start_date || '2026-09-01';
    const weekNumber = getCurrentWeek(startDateStr);

    // Lấy cấu hình hạn nộp từ config (có fallback giá trị mặc định của Khầy)
    const khbdDay = config.khbd_deadline_day !== null ? config.khbd_deadline_day : 5; // Thứ 6
    const khbdTime = config.khbd_deadline_time || '16:00';
    const khbdRequired = config.khbd_required_files !== null ? config.khbd_required_files : 2;

    const khgdDayOfMonth = config.khgd_deadline_day !== null ? config.khgd_deadline_day : 5; // Ngày 5 đầu tháng
    const khgdTime = config.khgd_deadline_time || '16:00';
    const khgdRequired = config.khgd_required_files !== null ? config.khgd_required_files : 1;

    const dctdDay = config.dctd_deadline_day !== null ? config.dctd_deadline_day : 5; // Thứ 6
    const dctdTime = config.dctd_deadline_time || '16:00';
    const dctdRequired = config.dctd_required_files !== null ? config.dctd_required_files : 1;

    // 2. Xác định ngày giờ hiện tại
    const now = new Date();
    // getDay(): 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy. 
    // Ta map sang: 1 = Thứ Hai, ..., 5 = Thứ Sáu, 6 = Thứ Bảy, 7 = Chủ Nhật.
    const rawDay = now.getDay();
    const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
    const currentDayOfMonth = now.getDate();
    
    const currentHourStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    // Các khung giờ quét nhắc nhở: 6h sáng, 12h trưa, 14h chiều, 15h chiều (nhắc nhở trước hạn 16h00)
    const reminderHours = ['06:00', '12:00', '14:00', '15:00'];
    
    // Kiểm tra xem giờ hiện tại có trùng với khung giờ nhắc nhở không (chỉ áp dụng khi chạy Cron thực tế, test mode bỏ qua)
    const isReminderTime = reminderHours.some(h => {
      const [hHour, hMin] = h.split(':');
      const [nowHour, nowMin] = currentHourStr.split(':');
      return Number(hHour) === Number(nowHour) && Math.abs(Number(hMin) - Number(nowMin)) <= 30; // Chênh lệch tối đa 30 phút để tránh hụt cron
    });

    let checkKHBD = false;
    let checkKHGD = false;
    let checkDCTD = false;

    if (isTestMode) {
      // Ở chế độ Test: quét đồng loạt cả 3 loại tệp tin để dễ kiểm chứng
      checkKHBD = true;
      checkKHGD = true;
      checkDCTD = true;
      console.log('[Cron API] Đang chạy ở chế độ TEST MODE. Quét tất cả học liệu...');
    } else {
      // Ở chế độ thực tế: Kiểm tra xem hôm nay có phải là ngày đến hạn và đúng khung giờ nhắc nhở không
      if (currentDayOfWeek === khbdDay && isReminderTime) checkKHBD = true;
      if (currentDayOfMonth === khgdDayOfMonth && isReminderTime) checkKHGD = true;
      if (currentDayOfWeek === dctdDay && isReminderTime) checkDCTD = true;
      
      // Nếu không phải là khung giờ nhắc nhở, dừng quét để tối ưu hóa tài nguyên
      if (!checkKHBD && !checkKHGD && !checkDCTD) {
        return NextResponse.json({ 
          success: true, 
          message: `Hệ thống bỏ qua lượt quét. Hôm nay: ${getDayNameVi(currentDayOfWeek)} (Ngày ${currentDayOfMonth}), Giờ: ${currentHourStr}. Không trùng khung giờ nhắc nhở.` 
        });
      }
    }

    // 3. Lấy danh sách Giáo viên đang hoạt động
    const { data: teachers, error: teachersErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, drive_folder_id')
      .eq('role', 'teacher')
      .eq('status', 'approved');

    if (teachersErr) {
      console.error('[Cron API] Lỗi lấy danh sách giáo viên:', teachersErr);
      return NextResponse.json({ success: false, error: 'Không thể lấy danh sách giáo viên.' }, { status: 500 });
    }

    console.log(`[Cron API] Bắt đầu quét học liệu cho ${teachers?.length || 0} giáo viên...`);
    const reminderLogs: string[] = [];

    // 4. Quét từng giáo viên một cách tuần tự (cách nhau 200ms để tránh Google API block)
    for (const teacher of (teachers || [])) {
      try {
        const driveFolderId = teacher.drive_folder_id;
        let khbdCount = 0;
        let khgdCount = 0;
        let dctdCount = 0;

        let hasFolder = false;

        if (driveFolderId) {
          // Tìm thư mục Tuần hiện tại
          const weekFolderName = `Tuan-${weekNumber}`;
          const weekFolderId = await findFolder(weekFolderName, driveFolderId);

          if (weekFolderId) {
            hasFolder = true;
            // Quét danh sách file trong thư mục Tuần
            const driveFiles = await listFilesInFolder(weekFolderId);
            
            // Đếm số lượng file theo quy chuẩn đặt tên
            driveFiles.forEach(file => {
              const nameUpper = file.name.toUpperCase();
              if (nameUpper.includes('KHBD')) khbdCount++;
              else if (nameUpper.includes('KHGD')) khgdCount++;
              else if (nameUpper.includes('DCTD')) dctdCount++;
            });
          }
        }

        // 5. Đối chiếu số lượng file thực tế nộp và cấu hình hạn nộp
        const missingList: string[] = [];

        if (checkKHBD && khbdCount < khbdRequired) {
          missingTypesPush('Kế hoạch bài dạy (KHBD)', khbdCount, khbdRequired);
        }
        if (checkKHGD && khgdCount < khgdRequired) {
          missingTypesPush('Kế hoạch giảng dạy (KHGD)', khgdCount, khgdRequired);
        }
        if (checkDCTD && dctdCount < dctdRequired) {
          missingTypesPush('Điều chỉnh sau tiết dạy (DCTD)', dctdCount, dctdRequired);
        }

        function missingTypesPush(typeName: string, current: number, required: number) {
          missingList.push(`${typeName} (Đã nộp: ${current}/${required} file)`);
        }

        // 6. Nếu phát hiện thiếu file, gửi email thúc giục giáo viên nộp bài
        if (missingList.length > 0) {
          const missingFilesText = missingList.join(', ');
          
          // Xác định hạn nộp mô tả cụ thể để đính kèm vào email
          let dueDateText = '';
          if (checkKHBD || checkDCTD) {
            dueDateText = `Trước ${khbdTime} ngày ${getDayNameVi(khbdDay)} hàng tuần`;
          } else if (checkKHGD) {
            dueDateText = `Trước ${khgdTime} ngày ${khgdDayOfMonth} hàng tháng`;
          }

          console.log(`[Cron API] Phát hiện GV ${teacher.full_name} thiếu: ${missingFilesText}. Tiến hành gửi mail nhắc nhở...`);
          
          await sendDeadlineReminderEmail(
            teacher.email,
            teacher.full_name || 'Giáo viên',
            weekNumber,
            missingFilesText,
            dueDateText
          );

          reminderLogs.push(`Đã gửi nhắc nhở tới Thầy/Cô: ${teacher.full_name} (${teacher.email}) do thiếu: ${missingFilesText}`);
        }

        // Chờ 200ms trước khi quét giáo viên tiếp theo
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (gvErr: any) {
        console.error(`[Cron API] Lỗi xử lý giáo viên ${teacher.full_name}:`, gvErr.message || gvErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isTestMode ? 'Quét thử nghiệm (TEST MODE) hoàn tất.' : 'Quét hạn nộp tự động hoàn tất.',
      weekChecked: weekNumber,
      totalChecked: teachers?.length || 0,
      remindersSentCount: reminderLogs.length,
      logs: reminderLogs
    });

  } catch (error: any) {
    console.error('[Cron API] Lỗi xử lý Cron check-deadlines:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi hệ thống.' }, { status: 500 });
  }
}
