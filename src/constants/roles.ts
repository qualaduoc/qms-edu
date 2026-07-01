export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BGH: 'bgh',
  LEAD: 'lead',
  TEACHER: 'teacher',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

export const GRADES = [
  'Khối 1',
  'Khối 2',
  'Khối 3',
  'Khối 4',
  'Khối 5',
  'Bộ môn đặc thù', // Tiếng Anh, Tin học, Thể dục, Mỹ thuật, Âm nhạc...
] as const;

export type Grade = typeof GRADES[number];

// Định nghĩa 3 loại file tài liệu bắt buộc
export const FILE_TYPES = {
  KHBD: 'KHBD', // Kế hoạch bài dạy (Giáo án)
  KHGD: 'KHGD', // Kế hoạch giảng dạy (Lịch báo giảng)
  DCTD: 'DCTD', // Điều chỉnh sau tiết dạy
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

export const FILE_TYPE_LABELS = {
  [FILE_TYPES.KHBD]: 'Kế hoạch bài dạy (Giáo án)',
  [FILE_TYPES.KHGD]: 'Kế hoạch giảng dạy',
  [FILE_TYPES.DCTD]: 'Điều chỉnh sau tiết dạy',
} as const;

export const FILE_TYPE_PREFIXES = {
  [FILE_TYPES.KHBD]: 'KHBD',
  [FILE_TYPES.KHGD]: 'KHGD',
  [FILE_TYPES.DCTD]: 'DCTD',
} as const;

export const EVALUATION_LEVELS = {
  CHUA_DAT: 'Chưa Đạt',
  DAT: 'Đạt',
  TOT: 'Tốt',
  XUAT_SAC: 'Xuất sắc',
} as const;

export type EvaluationLevel = typeof EVALUATION_LEVELS[keyof typeof EVALUATION_LEVELS];

export const EVALUATION_COLORS = {
  [EVALUATION_LEVELS.CHUA_DAT]: 'text-red-600 bg-red-50 border-red-200',
  [EVALUATION_LEVELS.DAT]: 'text-blue-600 bg-blue-50 border-blue-200',
  [EVALUATION_LEVELS.TOT]: 'text-green-600 bg-green-50 border-green-200',
  [EVALUATION_LEVELS.XUAT_SAC]: 'text-orange-600 bg-orange-50 border-orange-200',
} as const;
