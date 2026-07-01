import { UserRole, UserStatus, FileType, EvaluationLevel } from '@/constants/roles';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  grade: string | null;
  driveFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: number;
  schoolYear: string;
  startDate: string; // YYYY-MM-DD
  totalWeeks: number;
  googleRootFolderId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  teacherId: string;
  weekNumber: number;
  schoolYear: string;
  teacherNote: string | null;
  submittedAt: string;
  
  // Thông tin Khối trưởng duyệt
  leadStatus: 'pending' | 'verified' | 'incomplete';
  leadNote: string | null;
  leadVerifiedAt: string | null;
  leadId: string | null;
  
  // Thông tin Ban giám hiệu đánh giá
  bghRating: EvaluationLevel | null;
  bghFeedback: string | null;
  bghRatedAt: string | null;
  bghId: string | null;
  isElite: boolean;

  // Trích xuất thông tin giáo viên khi join bảng
  teacher?: {
    fullName: string;
    email: string;
    grade: string;
  };
  
  // Danh sách các file đính kèm trong bản nộp
  files?: SubmissionFile[];
}

export interface SubmissionFile {
  id: string;
  submissionId: string;
  driveFileId: string;
  fileName: string;
  fileUrl: string;
  fileType: FileType;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Cấu trúc đánh giá chi tiết theo tiêu chí cho BGH (từ Tiêu chí đánh giá.docx)
export interface CriteriaRating {
  id: string;
  submissionId: string;
  criteriaKey: string; // Tên tiêu chí viết tắt, ví dụ: KHGD_TIEN_DO, KHBD_THIET_KE...
  ratingLevel: EvaluationLevel; // Chưa Đạt, Đạt, Tốt, Xuất sắc
  note: string | null;
}
