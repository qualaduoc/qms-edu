'use client';

import { useState, useEffect } from 'react';
import { FILE_TYPES, FILE_TYPE_LABELS, EVALUATION_LEVELS, EVALUATION_COLORS } from '@/constants/roles';
import { getCurrentWeek, getWeekDateRange, formatDate } from '@/utils/weekCalculator';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/components/common/Toast';

interface LeadDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
    id?: string;
  };
  onLogout: () => void;
}

interface TeacherFileStatus {
  fileName: string;
  fileType: string;
  uploadedAt: string;
  url: string;
}

interface DemoSubmission {
  teacherId: string;
  submittedAt: string | null;
  teacherNote: string | null;
  leadStatus: 'pending' | 'verified' | 'incomplete';
  leadNote: string | null;
  bghRating: string | null;
  bghFeedback: string | null;
  files: TeacherFileStatus[];
}

interface TeacherData {
  id: string;
  fullName: string;
  email: string;
  driveFolder: string;
  driveFolderId?: string | null;
}

export default function LeadDashboard({ user, onLogout }: LeadDashboardProps) {
  const { showToast } = useToast();
  const schoolStartDate = '2026-09-01';
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;

  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [autoScanProgress, setAutoScanProgress] = useState({ current: 0, total: 0 });
  
  // SMTP Log để hiển thị quá trình gửi Gmail
  const [smtpLog, setSmtpLog] = useState<string | null>(null);

  // Danh sách Giáo viên giảng dạy thuộc Khối quản lý của Khối Trưởng
  const [teachers, setTeachers] = useState<TeacherData[]>([]);

  // Dữ liệu báo cáo của các giáo viên
  const [submissions, setSubmissions] = useState<{ [key: string]: DemoSubmission }>({});

  const isReal = !!user.id;

  // Hàm quét tự động Drive ngầm hàng loạt cho tất cả giáo viên
  const autoScanAllTeachers = async (teachersList: TeacherData[]) => {
    if (teachersList.length === 0) return;
    setIsAutoScanning(true);
    setAutoScanProgress({ current: 0, total: teachersList.length });
    
    console.log(`[Auto-Scan] Bắt đầu tự động quét ngầm cho ${teachersList.length} giáo viên...`);
    
    for (let i = 0; i < teachersList.length; i++) {
      const t = teachersList[i];
      if (t.driveFolderId) {
        try {
          const res = await fetch(`/api/submissions/scan?teacherId=${t.id}&weekNumber=${selectedWeek}`);
          if (res.ok) {
            const result = await res.json();
            const driveFiles = result.files.map((f: any) => ({
              fileName: f.name,
              fileType: f.type,
              uploadedAt: f.uploadedAt || '',
              url: f.url
            }));
            
            setSubmissions(prev => {
              const currentSub = prev[t.id];
              return {
                ...prev,
                [t.id]: {
                  ...currentSub,
                  files: driveFiles,
                  submittedAt: currentSub?.submittedAt || (driveFiles.length > 0 ? new Date().toISOString() : null)
                }
              };
            });
          }
        } catch (err) {
          console.error(`[Auto-Scan] Lỗi quét giáo viên ${t.fullName}:`, err);
        }
      }
      setAutoScanProgress(prev => ({ ...prev, current: i + 1 }));
      // Đợi 200ms trước khi quét giáo viên tiếp theo để chống rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsAutoScanning(false);
  };

  // Tải danh sách giáo viên và trạng thái nộp bài thật từ Supabase
  const loadRealTeachersData = async () => {
    if (!user.id) return;
    setLoadingTeachers(true);
    try {
      // 1. Tải danh sách giáo viên thuộc cùng Khối và đã được phê duyệt hoạt động
      const { data: dbTeachers, error: errT } = await supabase
        .from('profiles')
        .select('id, full_name, email, drive_folder_id')
        .eq('role', 'teacher')
        .eq('grade', user.grade)
        .eq('status', 'approved');

      if (errT) throw errT;

      const formattedTeachers: TeacherData[] = (dbTeachers || []).map(t => ({
        id: t.id,
        fullName: t.full_name || '',
        email: t.email,
        driveFolder: t.drive_folder_id ? `Đã liên kết Drive` : 'Chưa tạo folder',
        driveFolderId: t.drive_folder_id
      }));

      setTeachers(formattedTeachers);

      // 2. Tải toàn bộ trạng thái nộp bài trong tuần đó của danh sách giáo viên này
      const teacherIds = formattedTeachers.map(t => t.id);
      if (teacherIds.length > 0) {
        const { data: dbSubs, error: errS } = await supabase
          .from('submissions')
          .select('*')
          .in('teacher_id', teacherIds)
          .eq('week_number', selectedWeek);

        if (errS) throw errS;

        const subMap: { [key: string]: DemoSubmission } = {};
        
        // Gán dữ liệu mặc định ban đầu cho các giáo viên chưa nộp
        formattedTeachers.forEach(t => {
          subMap[t.id] = {
            teacherId: t.id,
            submittedAt: null,
            teacherNote: null,
            leadStatus: 'incomplete',
            leadNote: null,
            bghRating: null,
            bghFeedback: null,
            files: []
          };
        });

        // Đổ dữ liệu từ Supabase vào map
        (dbSubs || []).forEach(sub => {
          subMap[sub.teacher_id] = {
            teacherId: sub.teacher_id,
            submittedAt: sub.submitted_at,
            teacherNote: sub.teacher_note,
            leadStatus: sub.lead_status,
            leadNote: sub.lead_note,
            bghRating: sub.bgh_rating,
            bghFeedback: sub.bgh_feedback,
            files: [] // Quét realtime background
          };
        });

        setSubmissions(subMap);
        
        // Gọi tự động quét ngầm sau khi có danh sách
        autoScanAllTeachers(formattedTeachers);
      }
    } catch (err) {
      console.error('Lỗi load danh sách giáo viên:', err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    if (isReal) {
      loadRealTeachersData();
    } else {
      // 1. Dữ liệu giả lập cho phiên Demo
      const gradeSuffix = user.grade || 'Khối 1';
      const mockTeachers: TeacherData[] = [
        { id: 't1', fullName: 'Nguyễn Văn An', email: 'ledinhphuonglanltv@gmail.com', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/NguyenVanAn` },
        { id: 't2', fullName: 'Lê Thị Bình', email: 'binh.lt@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/LeThiBinh` },
        { id: 't3', fullName: 'Phạm Hồng Sơn', email: 'son.ph@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/PhamHongSon` },
        { id: 't4', fullName: 'Trần Thị Diệu', email: 'dieu.tt@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/TranThiDieu` },
      ];
      setTeachers(mockTeachers);

      // 2. Dữ liệu báo cáo giả lập
      const storageKey = `qms_lead_submissions_w${selectedWeek}_${gradeSuffix}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSubmissions(JSON.parse(stored));
      } else {
        const initialSubmissions: { [key: string]: DemoSubmission } = {
          't1': {
            teacherId: 't1',
            submittedAt: '2026-09-12T08:30:00Z',
            teacherNote: 'Gửi giáo án tuần này đầy đủ, phần điều chỉnh đã cập nhật',
            leadStatus: 'pending',
            leadNote: null,
            bghRating: null,
            bghFeedback: null,
            files: [
              { fileName: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_NguyenVanAn.docx`, fileType: FILE_TYPES.KHBD, uploadedAt: '2026-09-12', url: '#' },
              { fileName: `KHGD_Tuan${String(selectedWeek).padStart(2, '0')}_NguyenVanAn.docx`, fileType: FILE_TYPES.KHGD, uploadedAt: '2026-09-12', url: '#' },
            ]
          },
          't2': {
            teacherId: 't2',
            submittedAt: '2026-09-11T16:45:00Z',
            teacherNote: 'Nộp đủ 3 file',
            leadStatus: 'verified',
            leadNote: 'Đã duyệt báo cáo đầy đủ, đúng hạn.',
            bghRating: EVALUATION_LEVELS.TOT,
            bghFeedback: 'Thực hiện tốt.',
            files: [
              { fileName: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_LeThiBinh.docx`, fileType: FILE_TYPES.KHBD, uploadedAt: '2026-09-11', url: '#' },
              { fileName: `KHGD_Tuan${String(selectedWeek).padStart(2, '0')}_LeThiBinh.docx`, fileType: FILE_TYPES.KHGD, uploadedAt: '2026-09-11', url: '#' },
              { fileName: `DCTD_Tuan${String(selectedWeek).padStart(2, '0')}_LeThiBinh.docx`, fileType: FILE_TYPES.DCTD, uploadedAt: '2026-09-11', url: '#' },
            ]
          },
          't3': {
            teacherId: 't3',
            submittedAt: null,
            teacherNote: null,
            leadStatus: 'incomplete',
            leadNote: null,
            bghRating: null,
            bghFeedback: null,
            files: []
          },
          't4': {
            teacherId: 't4',
            submittedAt: '2026-09-12T09:00:00Z',
            teacherNote: 'Gửi tổ chuyên môn kiểm tra',
            leadStatus: 'pending',
            leadNote: null,
            bghRating: null,
            bghFeedback: null,
            files: [
              { fileName: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_TranThiDieu.docx`, fileType: FILE_TYPES.KHBD, uploadedAt: '2026-09-12', url: '#' },
              { fileName: `KHGD_Tuan${String(selectedWeek).padStart(2, '0')}_TranThiDieu.docx`, fileType: FILE_TYPES.KHGD, uploadedAt: '2026-09-12', url: '#' },
              { fileName: `DCTD_Tuan${String(selectedWeek).padStart(2, '0')}_TranThiDieu.docx`, fileType: FILE_TYPES.DCTD, uploadedAt: '2026-09-12', url: '#' },
            ]
          }
        };
        setSubmissions(initialSubmissions);
        localStorage.setItem(storageKey, JSON.stringify(initialSubmissions));
      }
    }
  }, [selectedWeek, user.grade, user.id, isReal]);

  // Nút Quét Google Drive thật
  const handleScanDrive = async (teacherId: string, teacherName: string) => {
    setScanningId(teacherId);

    if (isReal) {
      try {
        // Gọi API quét Drive thật ở server-side
        const res = await fetch(`/api/submissions/scan?teacherId=${teacherId}&weekNumber=${selectedWeek}`);
        const result = await res.json();
        
        if (res.ok) {
          const driveFiles = result.files.map((f: any) => ({
            fileName: f.name,
            fileType: f.type,
            uploadedAt: f.uploadedAt || '',
            url: f.url
          }));

          setSubmissions(prev => {
            const currentSub = prev[teacherId];
            return {
              ...prev,
              [teacherId]: {
                ...currentSub,
                files: driveFiles,
                // Nếu quét thấy file mà db chưa có submittedAt thì gán mặc định
                submittedAt: currentSub?.submittedAt || (driveFiles.length > 0 ? new Date().toISOString() : null)
              }
            };
          });

          // Hiển thị thông báo quét thành công
          showToast(`[Drive API] Quét thành công thư mục của Giáo viên ${teacherName}. Phát hiện: ${driveFiles.length} file.`, 'success');
        } else {
          showToast(`Lỗi quét Drive: ${result.error}`, 'error');
        }
      } catch (err: any) {
        console.error('Lỗi khi quét Drive:', err);
        showToast(`Lỗi kết nối khi quét Google Drive: ${err.message}`, 'error');
      } finally {
        setScanningId(null);
      }
    } else {
      // Chế độ demo giả lập
      setTimeout(() => {
        setScanningId(null);
        const currentSub = submissions[teacherId];
        const cleanName = teacherName.replace(/\s+/g, '');
        
        let updatedFiles = [...(currentSub?.files || [])];
        
        if (teacherId === 't1' && !updatedFiles.some(f => f.fileType === FILE_TYPES.DCTD)) {
          updatedFiles.push({
            fileName: `DCTD_Tuan${String(selectedWeek).padStart(2, '0')}_${cleanName}.docx`,
            fileType: FILE_TYPES.DCTD,
            uploadedAt: new Date().toISOString().split('T')[0],
            url: '#',
          });
        }
        
        const newSub: DemoSubmission = {
          ...currentSub,
          submittedAt: currentSub?.submittedAt || (updatedFiles.length > 0 ? new Date().toISOString() : null),
          files: updatedFiles,
        };

        const newSubmissions = {
          ...submissions,
          [teacherId]: newSub,
        };

        setSubmissions(newSubmissions);
        const gradeSuffix = user.grade || 'Khối 1';
        localStorage.setItem(`qms_lead_submissions_w${selectedWeek}_${gradeSuffix}`, JSON.stringify(newSubmissions));
        
        showToast(`[Drive API] Quét thành công thư mục giáo viên ${teacherName}. Phát hiện: ${updatedFiles.length} file.`, 'success');
      }, 1500);
    }
  };

  const handleVerifyClick = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    const sub = submissions[teacher.id];
    setVerificationNote(sub?.leadNote || '');
  };

  // Xác nhận nộp đủ và gửi email SMTP thật
  const submitVerification = async (status: 'verified' | 'incomplete') => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setSmtpLog(null);

    const sub = submissions[selectedTeacher.id];

    if (isReal) {
      try {
        // 1. Gọi API phản hồi & gửi mail SMTP ở server-side (Bypass RLS)
        console.log(`[SMTP] Gửi phản hồi trạng thái ${status} tới ${selectedTeacher.email}...`);
        const emailResponse = await fetch('/api/mail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherId: selectedTeacher.id,
            leadId: user.id,
            teacherEmail: selectedTeacher.email,
            teacherName: selectedTeacher.fullName,
            weekNumber: selectedWeek,
            grade: user.grade,
            leadName: user.fullName,
            status: status,
            note: verificationNote,
          }),
        });

        const emailResult = await emailResponse.json();
        if (!emailResponse.ok) {
          throw new Error(emailResult.error || 'Lỗi phản hồi và gửi email thông báo.');
        }

        // Cập nhật giao diện
        setSubmissions(prev => ({
          ...prev,
          [selectedTeacher.id]: {
            ...prev[selectedTeacher.id],
            leadStatus: status,
            leadNote: verificationNote,
          }
        }));

        showToast(`Đã phản hồi và gửi email thông báo thành công tới Thầy/Cô ${selectedTeacher.fullName}!`, 'success');
      } catch (err: any) {
        console.error('Lỗi duyệt báo cáo:', err);
        showToast(`Kiểm duyệt thất bại: ${err.message || 'Lỗi kết nối.'}`, 'error');
      } finally {
        setIsSubmitting(false);
        setSelectedTeacher(null);
      }
    } else {
      // Chế độ demo
      setTimeout(() => {
        const updatedSub: DemoSubmission = {
          ...sub,
          leadStatus: status,
          leadNote: verificationNote,
        };

        const newSubmissions = {
          ...submissions,
          [selectedTeacher.id]: updatedSub,
        };

        setSubmissions(newSubmissions);
        const gradeSuffix = user.grade || 'Khối 1';
        localStorage.setItem(`qms_lead_submissions_w${selectedWeek}_${gradeSuffix}`, JSON.stringify(newSubmissions));

        const titlePrefix = status === 'verified' ? '[QMS-EDU] Xác nhận' : '[QMS-EDU] Yêu cầu bổ sung';
        setSmtpLog(`
[SMTP Server] Connecting to smtp.gmail.com:587...
[SMTP Server] Authenticating as school.admin@school.edu.vn...
[SMTP Mail] Sending mail to: ${selectedTeacher.email}
[SMTP Mail] Subject: ${titlePrefix} hoàn thành nộp tài liệu tuần ${selectedWeek}
[SMTP Mail] Body HTML: Gửi giáo viên ${selectedTeacher.fullName}. Nhận xét: "${verificationNote || 'Không có'}"
[SMTP Server] Mail sent successfully! Message-ID: <${Math.random().toString(36).substring(7)}@gmail.com>
        `.trim());

        setTimeout(() => {
          setIsSubmitting(false);
          setSelectedTeacher(null);
          setSmtpLog(null);
          showToast(`Đã xác nhận trạng thái báo cáo tuần ${selectedWeek} cho giáo viên ${selectedTeacher.fullName}!`, 'success');
        }, 1500);

      }, 1000);
    }
  };

  const dateRange = getWeekDateRange(selectedWeek, schoolStartDate);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER - Brand OLM Style */}
      <header className="relative z-10 bg-brand-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
              Q
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-white leading-none">QMS-EDU</div>
            <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-0.5">Khối trưởng Workspace</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">Khối trưởng: {user.fullName}</div>
            <div className="text-[10px] text-indigo-100 font-bold bg-white/10 px-2.5 py-0.5 rounded-full inline-block mt-0.5 shadow-sm">
              Quản lý: {user.grade}
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('qms_view_mode', 'landing');
              window.location.href = '/dashboard';
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            🏠 Chọn khu vực
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            Đăng xuất
          </button>
        </div>
      </header>
      {/* 2. MAIN LAYOUT (Sidebar chọn Tuần + Main Content) */}
      <div className="flex-grow flex flex-col md:flex-row">
        
        {/* SIDEBAR BÊN TRÁI: Chọn Tuần dọc */}
        <aside className="w-full md:w-64 border-r border-slate-200 bg-white p-4 shrink-0 flex flex-col gap-3 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Tuần dạy học (Năm học 2026-2027)
          </div>
          
          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto max-h-[150px] md:max-h-[calc(100vh-180px)] pb-2 md:pb-0 pr-1 scrollbar-hidden">
            {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map((week) => {
              const isCurrent = week === currentWeek;
              const isSelected = week === selectedWeek;

              return (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all shrink-0 shadow-sm btn-interactive ${
                    isSelected
                      ? 'border-brand-accent bg-brand-accent-light/35 text-brand-accent font-bold'
                      : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📅</span>
                    <span>Tuần {week}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-black text-[9px] border border-blue-200">
                        HIỆN TẠI
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CỘT CHÍNH: Bảng theo dõi giáo viên */}
        <main className="flex-grow p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Lịch học tuần ở đầu main */}
          <div className="bg-white border border-slate-300 rounded-2xl p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center shadow-sm">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tuần dạy học hiện chọn</div>
              <h2 className="text-lg font-black text-slate-800">Báo cáo tuần {selectedWeek}</h2>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-lg shrink-0">
              Lịch dạy: <span className="text-brand-primary">{formatDate(dateRange.start)}</span> đến <span className="text-brand-primary">{formatDate(dateRange.end)}</span>
            </div>
          </div>

          {/* Banner Success */}
          {successMsg && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 font-bold animate-fade-in shadow-sm">
              ✅ {successMsg}
            </div>
          )}

        {/* TIẾN TRÌNH TỰ ĐỘNG QUÉT DRIVE NGẦM */}
        {isAutoScanning && (
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 text-xs text-indigo-800 font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-sm">🔄</span>
              <span>Hệ thống đang tự động quét ngầm dữ liệu Drive giáo viên...</span>
            </div>
            <div className="w-full sm:w-auto bg-slate-200 rounded-full h-2 overflow-hidden flex-grow max-w-[200px] mx-0 sm:mx-4">
              <div 
                className="bg-indigo-600 h-2 transition-all duration-300"
                style={{ width: `${(autoScanProgress.current / autoScanProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="shrink-0 text-slate-500">
              Đã quét: <strong className="text-indigo-700">{autoScanProgress.current}</strong>/{autoScanProgress.total} giáo viên
            </div>
          </div>
        )}

        {/* LOADING DATA INDICATOR */}
        {loadingTeachers && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-white text-center text-xs text-slate-500 shadow-sm animate-pulse">
            🔄 Đang tải danh sách giáo viên {user.grade} thực tế từ Cơ sở dữ liệu...
          </div>
        )}

        {/* DANH SÁCH GIÁO VIÊN VÀ BÁO CÁO CỦA HỌ */}
        {!loadingTeachers && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                📋 Theo dõi và Duyệt giáo án {user.grade} (Tuần {selectedWeek})
              </h2>
              <span className="text-[10px] text-slate-400 font-black uppercase bg-slate-100 px-2.5 py-1 rounded-md">
                Tổng số giáo viên: {teachers.length}
              </span>
            </div>

            {teachers.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-300 rounded-2xl bg-white text-center shadow-sm">
                <span className="text-4xl block mb-2">📋</span>
                <div className="text-xs font-bold text-slate-700 uppercase">Khối chưa có giáo viên nào hoạt động</div>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Chưa có giáo viên nào thuộc khối này đăng ký tài khoản hoặc tài khoản của họ đang ở hàng chờ phê duyệt.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {teachers.map((teacher) => {
                  const sub = submissions[teacher.id];
                  const isScanning = scanningId === teacher.id;

                  // Phân tích trạng thái nộp đủ 3 file học liệu
                  const files = sub?.files || [];
                  const types = files.map(f => f.fileType);
                  const hasKHBD = types.includes('KHBD');
                  const hasKHGD = types.includes('KHGD');
                  const hasDCTD = types.includes('DCTD');
                  
                  const khbdFile = files.find(f => f.fileType === 'KHBD');
                  const khgdFile = files.find(f => f.fileType === 'KHGD');
                  const dctdFile = files.find(f => f.fileType === 'DCTD');

                  const fileCount = (hasKHBD ? 1 : 0) + (hasKHGD ? 1 : 0) + (hasDCTD ? 1 : 0);
                  const isComplete = fileCount === 3;

                  // Xác định danh sách file còn thiếu để nhắc nhở
                  const missingTypes = [];
                  if (!hasKHBD) missingTypes.push('Giáo án (KHBD)');
                  if (!hasKHGD) missingTypes.push('Phân phối giảng dạy (KHGD)');
                  if (!hasDCTD) missingTypes.push('Điều chỉnh tiết dạy (DCTD)');

                  return (
                    <div 
                      key={teacher.id} 
                      className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white ${
                        isComplete 
                          ? 'border-emerald-300 hover:border-emerald-400 hover:shadow-emerald-50/20' 
                          : fileCount > 0 
                            ? 'border-orange-300 hover:border-orange-400' 
                            : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {/* Cột 1: Giáo viên & Thư mục Drive */}
                      <div className="space-y-1 md:w-1/4 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👩‍🏫</span>
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{teacher.fullName}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">{teacher.email}</span>
                          </div>
                        </div>
                        <div className="text-[10px] pl-7">
                          {teacher.driveFolderId ? (
                            <a 
                              href={`https://drive.google.com/drive/folders/${teacher.driveFolderId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary font-bold hover:underline inline-flex items-center gap-1 mt-1 bg-brand-primary-light/30 border border-brand-primary-light px-2 py-0.5 rounded-full"
                            >
                              📁 Mở Drive GV ↗
                            </a>
                          ) : (
                            <span className="text-red-500 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded-full inline-block mt-1">
                              ⚠️ Chưa liên kết Drive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cột 2: Danh sách 3 file Badge xếp ngang & Trạng thái nộp */}
                      <div className="flex-grow w-full md:max-w-md space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badge KHBD (Giáo án) */}
                          {hasKHBD && khbdFile ? (
                            <a 
                              href={khbdFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Xem file: ${khbdFile.fileName}`}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-all"
                            >
                              📄 KHBD (Giáo án)
                            </a>
                          ) : (
                            <span 
                              title="Giáo viên chưa nộp Kế hoạch bài dạy"
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-400 line-through select-none cursor-not-allowed"
                            >
                              ❌ KHBD
                            </span>
                          )}

                          {/* Badge KHGD (Kế hoạch tuần) */}
                          {hasKHGD && khgdFile ? (
                            <a 
                              href={khgdFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Xem file: ${khgdFile.fileName}`}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-all"
                            >
                              📄 KHGD (Kế hoạch)
                            </a>
                          ) : (
                            <span 
                              title="Giáo viên chưa nộp Kế hoạch giảng dạy"
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-400 line-through select-none cursor-not-allowed"
                            >
                              ❌ KHGD
                            </span>
                          )}

                          {/* Badge DCTD (Điều chỉnh sau tiết dạy) */}
                          {hasDCTD && dctdFile ? (
                            <a 
                              href={dctdFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Xem file: ${dctdFile.fileName}`}
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 transition-all"
                            >
                              📄 DCTD (Điều chỉnh)
                            </a>
                          ) : (
                            <span 
                              title="Giáo viên chưa nộp Điều chỉnh sau tiết dạy"
                              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-400 line-through select-none cursor-not-allowed"
                            >
                              ❌ DCTD
                            </span>
                          )}
                        </div>

                        {/* Text thông báo trạng thái nộp chuẩn hay thiếu */}
                        <div className="text-[11px] leading-tight">
                          {isComplete ? (
                            <div className="text-emerald-600 font-extrabold flex items-center gap-1">
                              <span>✓ Đã nộp đủ, vui lòng kiểm tra sơ bộ nội dung.</span>
                            </div>
                          ) : fileCount > 0 ? (
                            <div className="text-orange-600 font-bold">
                              ⚠️ Nộp thiếu: <span className="underline">{missingTypes.join(', ')}</span> (Mới có {fileCount}/3 file)
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">
                              ❌ Chưa tải tài liệu nào lên Drive cho Tuần này
                            </div>
                          )}
                          
                          {/* Ghi chú đính kèm của GV nếu có */}
                          {sub?.teacherNote && (
                            <div className="mt-1 text-[10px] text-slate-500 italic">
                              "Gửi kèm: {sub.teacherNote}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cột 3: Trạng thái & Tác vụ kiểm duyệt */}
                      <div className="flex flex-row md:flex-col lg:flex-row gap-3 md:w-auto items-center justify-between md:justify-end shrink-0 w-full pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        
                        {/* Badge trạng thái */}
                        <div className="text-right">
                          {!sub?.submittedAt ? (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-500 border border-slate-200">Chưa nộp bài</span>
                          ) : sub.leadStatus === 'incomplete' ? (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-orange-50 text-orange-600 border border-orange-200">Cần bổ sung</span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✓ Đã nộp bài</span>
                          )}
                        </div>

                        {/* Nút tác vụ */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleScanDrive(teacher.id, teacher.fullName)}
                            disabled={isScanning || isAutoScanning}
                            title="Quét lại Drive của giáo viên này"
                            className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm btn-interactive shrink-0"
                          >
                            {isScanning ? '🔄' : '🔍 Quét lại'}
                          </button>

                          <button
                            onClick={() => handleVerifyClick(teacher)}
                            disabled={!sub?.submittedAt && sub?.leadStatus === 'incomplete'}
                            className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm btn-interactive shrink-0"
                          >
                            ✉ Phản hồi
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      </div>

      {/* POPUP MODAL DUYỆT & NHẬN XÉT GỬI MAIL */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-accent"></div>

            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
              ✉ Phản hồi & Nhắc nhở Tuần {selectedWeek} - {selectedTeacher.fullName}
            </h3>

            <div className="space-y-4">
              {/* Box Info */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs space-y-1.5 text-slate-600">
                <div>• <strong>Người nhận mail thông báo:</strong> {selectedTeacher.fullName}</div>
                <div>• <strong>Địa chỉ Gmail gửi thật:</strong> {selectedTeacher.email}</div>
                <div>• <strong>Tuần học kiểm duyệt:</strong> Tuần {selectedWeek}</div>
              </div>

              {/* Nhận xét */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase">Nhận xét chuyên môn / Yêu cầu bổ sung</label>
                <textarea
                  rows={4}
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Nhập nhận xét (ví dụ: Giáo án soạn đúng chuẩn... hoặc Yêu cầu tải thêm file điều chỉnh sau tiết dạy...)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
                />
              </div>

              {/* SMTP Logs display */}
              {smtpLog && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                  {smtpLog}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-300">
                <button
                  onClick={() => setSelectedTeacher(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                >
                  Hủy bỏ
                </button>
                
                <button
                  onClick={() => submitVerification('incomplete')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Yêu cầu Bổ sung (Mail 🔴)'}
                </button>
                
                <button
                  onClick={() => submitVerification('verified')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-sm btn-interactive"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Xác nhận Nộp đủ (Mail 🟢)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
