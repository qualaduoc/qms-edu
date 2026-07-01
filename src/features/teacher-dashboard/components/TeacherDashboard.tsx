'use client';

import { useState, useEffect } from 'react';
import { FILE_TYPES, FILE_TYPE_LABELS, EVALUATION_LEVELS, EVALUATION_COLORS } from '@/constants/roles';
import { getCurrentWeek, getWeekDateRange, formatDate } from '@/utils/weekCalculator';

interface TeacherDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
  };
  onLogout: () => void;
}

interface DemoFile {
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface DemoSubmission {
  weekNumber: number;
  submittedAt: string | null;
  teacherNote: string;
  leadStatus: 'pending' | 'verified' | 'incomplete';
  leadNote: string | null;
  bghRating: string | null;
  bghFeedback: string | null;
  files: DemoFile[];
}

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  // 1. Cấu hình năm học mặc định cho Demo
  const schoolStartDate = '2026-09-01'; // Ngày giả định khai giảng
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;

  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [teacherNote, setTeacherNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // File states cho 3 loại tài liệu
  const [files, setFiles] = useState<{ [key: string]: DemoFile | null }>({
    [FILE_TYPES.KHBD]: null,
    [FILE_TYPES.KHGD]: null,
    [FILE_TYPES.DCTD]: null,
  });

  // Giả lập cơ sở dữ liệu các bản nộp tuần của giáo viên này
  const [submissions, setSubmissions] = useState<{ [key: number]: DemoSubmission }>({});

  useEffect(() => {
    // Khởi tạo một số dữ liệu demo cho giáo viên dễ hình dung lịch sử nộp bài
    const initialSubmissions: { [key: number]: DemoSubmission } = {
      1: {
        weekNumber: 1,
        submittedAt: '2026-09-05T17:00:00Z',
        teacherNote: 'Gửi giáo án tuần 1 đầy đủ',
        leadStatus: 'verified',
        leadNote: 'Đã nhận đủ tài liệu tuần 1, trình bày khoa học.',
        bghRating: EVALUATION_LEVELS.TOT,
        bghFeedback: 'Giáo án soạn rất tốt, bám sát đối tượng học sinh.',
        files: [
          { name: `KHBD_Tuan01_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHBD, size: '245 KB', uploadedAt: '2026-09-05' },
          { name: `KHGD_Tuan01_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHGD, size: '120 KB', uploadedAt: '2026-09-05' },
          { name: `DCTD_Tuan01_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.DCTD, size: '98 KB', uploadedAt: '2026-09-05' },
        ]
      },
      2: {
        weekNumber: 2,
        submittedAt: '2026-09-12T08:30:00Z',
        teacherNote: 'Báo cáo tuần 2 bổ sung điều chỉnh tiết 3',
        leadStatus: 'verified',
        leadNote: 'Đã duyệt nộp đủ.',
        bghRating: EVALUATION_LEVELS.XUAT_SAC,
        bghFeedback: 'Phần điều chỉnh sau tiết dạy rất sâu sắc, đáng học tập.',
        files: [
          { name: `KHBD_Tuan02_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHBD, size: '250 KB', uploadedAt: '2026-09-12' },
          { name: `KHGD_Tuan02_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHGD, size: '115 KB', uploadedAt: '2026-09-12' },
          { name: `DCTD_Tuan02_${user.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.DCTD, size: '102 KB', uploadedAt: '2026-09-12' },
        ]
      },
      3: {
        weekNumber: 3,
        submittedAt: null,
        teacherNote: '',
        leadStatus: 'incomplete',
        leadNote: null,
        bghRating: null,
        bghFeedback: null,
        files: []
      }
    };
    
    // Đọc thêm từ localStorage nếu GV đã nộp thử trong phiên này
    const stored = localStorage.getItem(`qms_submissions_${user.fullName}`);
    if (stored) {
      setSubmissions({ ...initialSubmissions, ...JSON.parse(stored) });
    } else {
      setSubmissions(initialSubmissions);
    }
  }, [user.fullName]);

  // Cập nhật form khi chọn tuần khác nhau
  useEffect(() => {
    const sub = submissions[selectedWeek];
    if (sub && sub.submittedAt) {
      setTeacherNote(sub.teacherNote);
      const mappedFiles: { [key: string]: DemoFile | null } = {
        [FILE_TYPES.KHBD]: null,
        [FILE_TYPES.KHGD]: null,
        [FILE_TYPES.DCTD]: null,
      };
      sub.files.forEach(f => {
        mappedFiles[f.type] = f;
      });
      setFiles(mappedFiles);
    } else {
      setTeacherNote('');
      setFiles({
        [FILE_TYPES.KHBD]: null,
        [FILE_TYPES.KHGD]: null,
        [FILE_TYPES.DCTD]: null,
      });
    }
  }, [selectedWeek, submissions]);

  // Lấy dải ngày của tuần đang chọn
  const dateRange = getWeekDateRange(selectedWeek, schoolStartDate);

  // Xử lý nộp file giả lập
  const handleFileChange = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn chỉ nhận file Word (.doc, .docx)
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      alert('Hệ thống chỉ chấp nhận file Word (.doc hoặc .docx) theo đúng quy chuẩn!');
      return;
    }

    // Đổi tên file tự động theo quy chuẩn: PREFIX_TuanXX_TenGiaoVien.docx
    const prefix = type;
    const cleanName = user.fullName.replace(/\s+/g, '');
    const standardName = `${prefix}_Tuan${String(selectedWeek).padStart(2, '0')}_${cleanName}.docx`;

    const newFile: DemoFile = {
      name: standardName,
      type: type,
      size: `${Math.round(file.size / 1024)} KB`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    setFiles(prev => ({
      ...prev,
      [type]: newFile,
    }));
  };

  const removeFile = (type: string) => {
    setFiles(prev => ({
      ...prev,
      [type]: null,
    }));
  };

  // Xác nhận nộp toàn bộ báo cáo tuần
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Kiểm tra xem đã nộp ít nhất 1 file chưa
    const uploadedFiles = Object.values(files).filter(f => f !== null) as DemoFile[];
    if (uploadedFiles.length === 0) {
      alert('Thầy/Cô vui lòng tải lên ít nhất một tài liệu trước khi xác nhận nộp báo cáo!');
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      const newSubmission: DemoSubmission = {
        weekNumber: selectedWeek,
        submittedAt: new Date().toISOString(),
        teacherNote: teacherNote,
        leadStatus: 'pending', // Gửi xong ở trạng thái chờ duyệt
        leadNote: null,
        bghRating: null,
        bghFeedback: null,
        files: uploadedFiles,
      };

      const updatedSubmissions = {
        ...submissions,
        [selectedWeek]: newSubmission,
      };

      setSubmissions(updatedSubmissions);
      localStorage.setItem(`qms_submissions_${user.fullName}`, JSON.stringify(updatedSubmissions));
      setIsSubmitting(false);
      setNotification(`Đã gửi báo cáo Tuần ${selectedWeek} thành công tới Khối trưởng!`);
      
      // Auto-hide notification
      setTimeout(() => setNotification(null), 5000);
    }, 1200);
  };

  const selectedWeekSubmission = submissions[selectedWeek];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* 1. TOP HEADER */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-orange-500 p-0.5 shadow-md">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950 text-xs font-black text-orange-500">
              Q
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">QMS-EDU</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hệ thống chất lượng</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">Thầy/Cô: {user.fullName}</div>
            <div className="text-[10px] text-slate-400 font-semibold">{user.grade} | Vai trò: Giáo viên</div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* 2. MAIN LAYOUT (Sidebar chọn Tuần + Main Content) */}
      <div className="flex-grow flex flex-col md:flex-row">
        
        {/* SIDEBAR BÊN TRÁI: Chọn Tuần (dễ dùng, khoa học giống OLM) */}
        <aside className="w-full md:w-64 border-r border-slate-900 bg-slate-950/40 p-4 shrink-0 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Tuần dạy học (Năm học 2026-2027)
          </div>
          
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto max-h-[150px] md:max-h-[calc(100vh-200px)] pb-2 md:pb-0 pr-1">
            {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map((week) => {
              const sub = submissions[week];
              const isCurrent = week === currentWeek;
              const isSelected = week === selectedWeek;
              
              let statusBadge = '🔴'; // Chưa nộp
              if (sub) {
                if (sub.leadStatus === 'verified') statusBadge = '🟢'; // Đã duyệt
                else if (sub.submittedAt) statusBadge = '🟡'; // Đang chờ duyệt
                else if (sub.leadStatus === 'incomplete') statusBadge = '🟠'; // Cần bổ sung
              }

              return (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all shrink-0 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold'
                      : 'border-slate-900/40 bg-slate-900/10 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{statusBadge}</span>
                    <span>Tuần {week}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-black text-[9px]">
                        HIỆN TẠI
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CỘT CHÍNH: Form nộp & xem trạng thái duyệt của Tuần đã chọn */}
        <main className="flex-grow p-6 lg:p-10 max-w-4xl space-y-6">
          
          {/* Banner thông báo trạng thái nộp thành công */}
          {notification && (
            <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-sm text-green-400 font-medium animate-fade-in flex items-center gap-2">
              <span>✅</span> {notification}
            </div>
          )}

          {/* 2.1 TRẠNG THÁI TUẦN CHỌN */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm relative overflow-hidden flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Trạng thái báo cáo</div>
              <h2 className="text-2xl font-black">Tuần {selectedWeek}</h2>
              <p className="text-xs text-slate-400">
                Khoảng thời gian học: <strong>{formatDate(dateRange.start)}</strong> đến <strong>{formatDate(dateRange.end)}</strong>
              </p>
            </div>

            {/* Trạng thái duyệt của Khối Trưởng */}
            <div className="flex flex-col gap-1 items-start md:items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Kiểm duyệt Khối trưởng</span>
              {!selectedWeekSubmission?.submittedAt ? (
                <span className="px-3 py-1 text-xs font-bold rounded-lg border border-red-500/20 bg-red-500/5 text-red-400">
                  Chưa nộp báo cáo
                </span>
              ) : selectedWeekSubmission.leadStatus === 'pending' ? (
                <span className="px-3 py-1 text-xs font-bold rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-400">
                  ⏳ Đã nộp - Chờ Khối trưởng duyệt
                </span>
              ) : selectedWeekSubmission.leadStatus === 'incomplete' ? (
                <span className="px-3 py-1 text-xs font-bold rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-400">
                  ⚠️ Cần nộp lại hoặc nộp thiếu
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-bold rounded-lg border border-green-500/20 bg-green-500/5 text-green-400">
                  ✓ Khối trưởng đã xác nhận nộp đủ
                </span>
              )}
            </div>
          </div>

          {/* 2.2 NHẬN XÉT CỦA BGH (RIÊNG TƯ TUYỆT ĐỐI) */}
          {selectedWeekSubmission?.bghRating && (
            <div className="p-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 relative overflow-hidden space-y-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  🛡️ Nhận xét riêng tư từ Ban Giám Hiệu
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${EVALUATION_COLORS[selectedWeekSubmission.bghRating as keyof typeof EVALUATION_COLORS]}`}>
                  Đánh giá: {selectedWeekSubmission.bghRating}
                </span>
              </div>
              <p className="text-slate-300 text-sm italic leading-relaxed">
                "{selectedWeekSubmission.bghFeedback || 'Không có nhận xét chi tiết.'}"
              </p>
              <div className="text-[10px] text-slate-500">
                Chỉ Thầy/Cô và Ban Giám Hiệu có thể xem kết quả đánh giá thi đua này.
              </div>
            </div>
          )}

          {/* GHI CHÚ KHỐI TRƯỞNG */}
          {selectedWeekSubmission?.leadNote && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 space-y-1">
              <div className="text-xs font-bold text-slate-400">Nhận xét của Khối trưởng:</div>
              <p className="text-slate-300 text-xs font-semibold">{selectedWeekSubmission.leadNote}</p>
            </div>
          )}

          {/* 2.3 KHU VỰC NỘP FILE (Form) */}
          <div className="p-6 lg:p-8 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-6">
            <h3 className="text-lg font-bold tracking-tight">Tải lên hồ sơ báo cáo tuần</h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 3 Module Upload File */}
                {Object.values(FILE_TYPES).map((type) => {
                  const uploadedFile = files[type];
                  
                  return (
                    <div key={type} className="flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/60 justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tài liệu</span>
                        <h4 className="text-xs font-bold text-slate-200 mt-1 leading-snug">{FILE_TYPE_LABELS[type]}</h4>
                      </div>

                      {uploadedFile ? (
                        <div className="p-3 rounded-lg border border-slate-800 bg-slate-900 space-y-2 relative">
                          <button
                            type="button"
                            onClick={() => removeFile(type)}
                            className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                            title="Xóa file để đổi file khác"
                          >
                            ×
                          </button>
                          <div className="text-[10px] font-bold text-green-400 truncate pr-2" title={uploadedFile.name}>
                            📎 {uploadedFile.name}
                          </div>
                          <div className="text-[9px] text-slate-500">{uploadedFile.size}</div>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-slate-800 hover:border-orange-500/50 rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-slate-900/30">
                          <input
                            type="file"
                            accept=".doc,.docx"
                            onChange={(e) => handleFileChange(type, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <span className="text-2xl mb-1 block">📄</span>
                          <span className="text-[10px] font-bold text-slate-400 hover:text-slate-200 block">Kéo thả hoặc Chọn file Word</span>
                          <span className="text-[8px] text-slate-600 block mt-1">.doc, .docx</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ghi chú nộp bài */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ghi chú của giáo viên (Không bắt buộc)
                </label>
                <textarea
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Nhập ghi chú cho khối trưởng kiểm duyệt..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-orange-500/50 focus:outline-none transition-all h-24"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-900">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 hover:opacity-90 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-orange-500/10 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Xác nhận nộp báo cáo'}
                </button>
              </div>

            </form>
          </div>

        </main>
      </div>
    </div>
  );
}
