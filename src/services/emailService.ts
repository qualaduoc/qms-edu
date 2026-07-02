import nodemailer from 'nodemailer';

// Khởi tạo Transporter cho Nodemailer dùng SMTP của Gmail
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || process.env.GMAIL_USER; // Hỗ trợ cả SMTP_USER và GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS; // Hỗ trợ cả SMTP_PASS và GMAIL_PASS

  if (!user || !pass) {
    throw new Error('SMTP credentials are not configured in environment variables. Vui lòng cấu hình SMTP_USER/GMAIL_USER và SMTP_PASS/GMAIL_PASS trên Vercel.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true cho port 465, false cho 587
    auth: {
      user,
      pass,
    },
  });
};

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Gửi email thô
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const transporter = getTransporter();
  const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER;

  try {
    await transporter.sendMail({
      from: `"QMS-EDU Hệ Thống Báo Cáo" <${senderEmail}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Gửi email xác nhận Khối trưởng đã phê duyệt giáo viên nộp đủ tài liệu
 * Tiêu đề được thiết kế chính xác để tránh bị Gmail lọc vào hòm thư SPAM.
 */
export async function sendVerificationEmail(
  teacherEmail: string,
  teacherName: string,
  weekNumber: number,
  grade: string,
  leadName: string,
  leadNote?: string
): Promise<void> {
  // Tiêu đề mang tính thông báo chính sự, rõ ràng, không giật tít, không dùng từ khẩn cấp
  const subject = `[QMS-EDU] Xác nhận hoàn thành nộp tài liệu tuần ${weekNumber} - Khối ${grade}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1a202c; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #3182ce; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #2b6cb0; margin: 0; font-size: 20px;">Hệ thống QMS-EDU</h2>
        <span style="font-size: 12px; color: #718096;">Quản lý chất lượng giáo dục và báo cáo</span>
      </div>
      
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">Kính gửi Thầy/Cô ${teacherName},</p>
      
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Hệ thống QMS-EDU xin thông báo kết quả kiểm duyệt hồ sơ báo cáo của Thầy/Cô từ Khối trưởng <strong>${leadName}</strong>.
      </p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #38a169; margin-bottom: 20px; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #4a5568; width: 120px;"><strong>Tuần dạy:</strong></td>
            <td style="padding: 5px 0;">Tuần ${weekNumber}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568;"><strong>Trạng thái:</strong></td>
            <td style="padding: 5px 0; color: #38a169; font-weight: bold;">ĐÃ XÁC NHẬN NỘP ĐỦ TÀI LIỆU</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568; vertical-align: top;"><strong>Ghi chú:</strong></td>
            <td style="padding: 5px 0; font-style: italic; color: #2d3748;">
              ${leadNote && leadNote.trim() !== '' ? leadNote : 'Khối trưởng đã kiểm duyệt đầy đủ và không có thêm ghi chú.'}
            </td>
          </tr>
        </table>
      </div>
      
      <p style="line-height: 1.6; margin-bottom: 20px;">
        Tài liệu báo cáo của Thầy/Cô đã được đồng bộ an toàn lên thư mục Google Drive của nhà trường và sẵn sàng phục vụ công tác đánh giá của Ban Giám Hiệu.
      </p>
      
      <div style="border-top: 1px solid #edf2f7; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
        <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống QMS-EDU của nhà trường.</p>
        <p style="margin: 0;">Vui lòng không trả lời email này.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: teacherEmail, subject, html });
}

/**
 * Gửi email thông báo nộp thiếu tài liệu hoặc cần bổ sung điều chỉnh
 */
export async function sendIncompleteEmail(
  teacherEmail: string,
  teacherName: string,
  weekNumber: number,
  grade: string,
  leadName: string,
  leadNote: string
): Promise<void> {
  const subject = `[QMS-EDU] Yêu cầu bổ sung tài liệu báo cáo tuần ${weekNumber} - Khối ${grade}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1a202c; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #e53e3e; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #e53e3e; margin: 0; font-size: 20px;">Hệ thống QMS-EDU</h2>
        <span style="font-size: 12px; color: #718096;">Quản lý chất lượng giáo dục và báo cáo</span>
      </div>
      
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">Kính gửi Thầy/Cô ${teacherName},</p>
      
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Khối trưởng <strong>${leadName}</strong> đã kiểm duyệt báo cáo Tuần ${weekNumber} và gửi yêu cầu bổ sung/chỉnh sửa tài liệu.
      </p>
      
      <div style="background-color: #fffaf0; padding: 15px; border-left: 4px solid #dd6b20; margin-bottom: 20px; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #4a5568; width: 120px;"><strong>Tuần dạy:</strong></td>
            <td style="padding: 5px 0;">Tuần ${weekNumber}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568;"><strong>Trạng thái:</strong></td>
            <td style="padding: 5px 0; color: #dd6b20; font-weight: bold;">CẦN BỔ SUNG / CHỈNH SỬA</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568; vertical-align: top;"><strong>Nội dung yêu cầu:</strong></td>
            <td style="padding: 5px 0; color: #c05621; font-weight: bold;">
              ${leadNote}
            </td>
          </tr>
        </table>
      </div>
      
      <p style="line-height: 1.6; margin-bottom: 20px;">
        Thầy/Cô vui lòng truy cập ứng dụng QMS-EDU để cập nhật hoặc bổ sung các file còn thiếu theo yêu cầu để hoàn thành báo cáo tuần này.
      </p>
      
      <div style="border-top: 1px solid #edf2f7; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
        <p style="margin: 0 0 5px 0;">Đây là email tự động từ hệ thống QMS-EDU của nhà trường.</p>
        <p style="margin: 0;">Vui lòng không trả lời email này.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: teacherEmail, subject, html });
}

/**
 * Gửi email tự động nhắc nhở/thúc giục giáo viên nộp bài khi sắp đến hạn
 */
export async function sendDeadlineReminderEmail(
  teacherEmail: string,
  teacherName: string,
  weekNumber: number,
  missingFilesText: string,
  dueDateText: string
): Promise<void> {
  const subject = `[QMS-EDU] Nhắc nhở: Sắp hết hạn nộp tài liệu báo cáo tuần ${weekNumber}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fed7d7; border-radius: 8px; color: #1a202c; background-color: #fffaf0;">
      <div style="text-align: center; border-bottom: 2px solid #e53e3e; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #e53e3e; margin: 0; font-size: 20px;">🔔 Nhắc Nhở Tự Động QMS-EDU</h2>
        <span style="font-size: 12px; color: #718096;">Đôn đốc hoàn thành học liệu giảng dạy</span>
      </div>
      
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">Kính gửi Thầy/Cô ${teacherName},</p>
      
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Hệ thống tự động phát hiện Thầy/Cô **chưa hoàn thành nộp đủ** các tài liệu học liệu quy định cho **Tuần ${weekNumber}**.
      </p>
      
      <div style="background-color: #fff5f5; padding: 15px; border-left: 4px solid #e53e3e; margin-bottom: 20px; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #4a5568; width: 150px;"><strong>Học kỳ/Tuần dạy:</strong></td>
            <td style="padding: 5px 0;">Tuần ${weekNumber}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568;"><strong>Các tài liệu còn thiếu:</strong></td>
            <td style="padding: 5px 0; color: #e53e3e; font-weight: bold;">
              ${missingFilesText}
            </td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568;"><strong>Hạn chót nộp bài:</strong></td>
            <td style="padding: 5px 0; color: #2d3748; font-weight: bold; text-decoration: underline;">
              ${dueDateText}
            </td>
          </tr>
        </table>
      </div>
      
      <p style="line-height: 1.6; margin-bottom: 20px; color: #2d3748;">
        Kính mong Thầy/Cô khẩn trương truy cập hệ thống QMS-EDU và tải lên các tài liệu còn thiếu trước thời hạn quy định để đảm bảo chất lượng công tác chuyên môn của nhà trường.
      </p>
      
      <div style="text-align: center; margin-bottom: 20px;">
        <a 
          href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
          style="display: inline-block; background-color: #e53e3e; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px;"
        >
          ➔ Truy Cập QMS-EDU Nộp Bài Ngay
        </a>
      </div>
      
      <div style="border-top: 1px solid #fed7d7; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
        <p style="margin: 0 0 5px 0;">Đây là email đôn đốc tự động được thiết lập bởi Ban Giám Hiệu trường Tiểu học Lương Thế Vinh.</p>
        <p style="margin: 0;">Vui lòng không trả lời email này.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: teacherEmail, subject, html });
}

/**
 * Gửi email thông báo kết quả nhận xét/đánh giá riêng tư của Ban Giám Hiệu tới Giáo viên
 */
export async function sendBghEvaluationEmail(
  teacherEmail: string,
  teacherName: string,
  weekNumber: number,
  bghRating: string,
  bghFeedback: string,
  criteriaText: string
): Promise<void> {
  const subject = `[QMS-EDU] Ban Giám Hiệu thông báo kết quả nhận xét, đánh giá học liệu Tuần ${weekNumber}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #edf2f7; border-radius: 8px; color: #1a202c; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #4a5568; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #2d3748; margin: 0; font-size: 20px;">Hệ thống QMS-EDU</h2>
        <span style="font-size: 12px; color: #718096;">Thanh tra chất lượng học liệu Ban Giám Hiệu</span>
      </div>
      
      <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">Kính gửi Thầy/Cô ${teacherName},</p>
      
      <p style="line-height: 1.6; margin-bottom: 15px;">
        Ban Giám Hiệu nhà trường đã tiến hành thanh tra chất lượng học liệu giảng dạy của Thầy/Cô trong **Tuần ${weekNumber}** và gửi kết quả đánh giá thi đua:
      </p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #4a5568; margin-bottom: 20px; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #4a5568; width: 180px;"><strong>Tuần dạy học:</strong></td>
            <td style="padding: 5px 0;">Tuần ${weekNumber}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568;"><strong>Xếp loại chất lượng:</strong></td>
            <td style="padding: 5px 0; color: #2b6cb0; font-weight: bold;">${bghRating.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #4a5568; vertical-align: top;"><strong>Nhận xét / Góp ý:</strong></td>
            <td style="padding: 5px 0; color: #2d3748; font-style: italic;">
              "${bghFeedback}"
            </td>
          </tr>
        </table>
      </div>

      <h4 style="color: #4a5568; margin-bottom: 10px; border-bottom: 1px solid #edf2f7; padding-bottom: 5px; font-size: 13px;">ĐIỂM CHI TIẾT THEO 6 TIÊU CHÍ THANH TRA:</h4>
      <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 12px; color: #4a5568; line-height: 1.8; margin-bottom: 20px;">
        ${criteriaText}
      </div>
      
      <p style="line-height: 1.6; margin-bottom: 20px; font-size: 13px;">
        Kết quả đánh giá này đã được bảo mật và lưu trữ vào cơ sở dữ liệu làm tiêu chí thi đua thi đua chuyên môn của Thầy/Cô. Thầy/Cô có thể đăng nhập QMS-EDU để xem nhận xét chi tiết.
      </p>
      
      <div style="border-top: 1px solid #edf2f7; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
        <p style="margin: 0 0 5px 0;">Email này được gửi bảo mật riêng tư tới giáo viên tương ứng.</p>
        <p style="margin: 0;">Vui lòng không trả lời email này.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: teacherEmail, subject, html });
}


