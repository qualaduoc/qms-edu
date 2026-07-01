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
  
  // SMTP Log để hiển thị quá trình gửi Gmail
  const [smtpLog, setSmtpLog] = useState<string | null>(null);

  // Danh sách Giáo viên giảng dạy thuộc Khối quản lý của Khối Trưởng
  const [teachers, setTeachers] = useState<TeacherData[]>([]);

  // Dữ liệu báo cáo của các giáo viên
  const [submissions, setSubmissions] = useState<{ [key: string]: DemoSubmission }>({});

  const isReal = !!user.id;

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
            files: [] // Cột file sẽ được quét realtime khi bấm "Quét Drive"
          };
        });

        setSubmissions(subMap);
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
        // 1. Gọi API gửi mail SMTP thật ở server-side
        console.log(`[SMTP] Gửi email thông báo trạng thái ${status} tới ${selectedTeacher.email}...`);
        const emailResponse = await fetch('/api/mail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          throw new Error(emailResult.error || 'Lỗi gửi email qua máy chủ SMTP.');
        }

        // 2. Cập nhật trạng thái duyệt vào submissions table trong Supabase
        const { error } = await supabase
          .from('submissions')
          .upsert({
            teacher_id: selectedTeacher.id,
            week_number: selectedWeek,
            school_year: '2026-2027',
            lead_status: status,
            lead_note: verificationNote,
            lead_verified_at: new Date().toISOString(),
            lead_id: user.id,
          });

        if (error) throw error;

        // Cập nhật giao diện
        setSubmissions(prev => ({
          ...prev,
          [selectedTeacher.id]: {
            ...prev[selectedTeacher.id],
            leadStatus: status,
            leadNote: verificationNote,
          }
        }));

        showToast(`Đã duyệt báo cáo và gửi email thông báo thành công tới Thầy/Cô ${selectedTeacher.fullName}!`, 'success');
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
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-50 hover:text-white cursor-pointer btn-interactive"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* SUB HEADER - TAB / WEEK SELECTOR */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Chọn Tuần kiểm duyệt:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-brand-primary cursor-pointer shadow-sm"
          >
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Tuần {w}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Lịch học tuần {selectedWeek}: <span className="text-brand-primary">{formatDate(dateRange.start)}</span> đến <span className="text-brand-primary">{formatDate(dateRange.end)}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-grow p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Banner Success */}
        {successMsg && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 font-bold animate-fade-in shadow-sm">
            ✅ {successMsg}
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
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">
                Theo dõi và Duyệt giáo án {user.grade} (Tuần {selectedWeek})
              </h2>
              <span className="text-[10px] text-slate-400 font-bold">Tổng số giáo viên: {teachers.length}</span>
            </div>

            {teachers.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-300 rounded-2xl bg-white text-center shadow-sm">
                <span className="text-4xl block mb-2">📋</span>
                <div className="text-xs font-bold text-slate-700 uppercase">Khối chưa có giáo viên nào hoạt động</div>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Chưa có giáo viên nào thuộc khối này đăng ký tài khoản hoặc tài khoản của họ đang ở hàng chờ phê duyệt.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {teachers.map((teacher) => {
                  const sub = submissions[teacher.id];
                  const isScanning = scanningId === teacher.id;

                  return (
                    <div key={teacher.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 shadow-sm transition-all flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">
                      
                      {/* Cột 1: Thông tin giáo viên & Ghi chú nộp */}
                      <div className="space-y-2 lg:max-w-sm w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👩‍🏫</span>
                          <div>
                            <h3 className="font-bold text-slate-800 leading-tight">{teacher.fullName}</h3>
                            <span className="text-[10px] text-slate-400 font-medium">{teacher.email}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 pl-7 space-y-1">
                          <div className="break-all">📁 <strong>Thư mục Drive:</strong> <code className="text-brand-primary text-[10px]">{teacher.driveFolder}</code></div>
                          {sub?.submittedAt ? (
                            <div className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 italic">
                              "Gửi kèm: {sub.teacherNote || 'Không ghi chú'}"
                            </div>
                          ) : (
                            <div className="text-slate-400 italic mt-1">Chưa bấm xác nhận đã nộp trên App</div>
                          )}
                        </div>
                      </div>

                      {/* Cột 2: Các file hiện có (Được quét từ Google Drive) */}
                      <div className="flex-grow w-full lg:max-w-md">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tài liệu đã quét trên Drive</div>
                        
                        {!sub || sub.files.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Thư mục Drive trống. Click "Quét Drive" để kiểm tra học liệu thực tế.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {sub.files.map((file, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50 text-[11px]">
                                {file.url ? (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline font-bold truncate max-w-[200px] sm:max-w-[280px]"
                                  >
                                    📄 {file.fileName}
                                  </a>
                                ) : (
                                  <span className="text-slate-700 font-medium truncate max-w-[200px] sm:max-w-[280px]">📄 {file.fileName}</span>
                                )}
                                <span className="text-[9px] font-bold text-brand-primary bg-brand-primary-light/40 border border-brand-primary-light px-1.5 py-0.5 rounded uppercase shrink-0">{file.fileType}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cột 3: Trạng thái & Tác vụ kiểm duyệt */}
                      <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-auto items-center lg:items-end justify-between self-stretch pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        
                        {/* Badge trạng thái */}
                        <div className="text-right">
                          {!sub?.submittedAt ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200">Chưa nộp bài</span>
                          ) : sub.leadStatus === 'incomplete' ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-orange-50 text-orange-600 border border-orange-200">Cần bổ sung</span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✓ Đã nộp bài</span>
                          )}
                        </div>

                        {/* Nút tác vụ */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleScanDrive(teacher.id, teacher.fullName)}
                            disabled={isScanning}
                            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm btn-interactive"
                          >
                            {isScanning ? '🔄 Đang quét...' : '🔍 Quét Drive'}
                          </button>

                          <button
                            onClick={() => handleVerifyClick(teacher)}
                            disabled={!sub?.submittedAt && sub?.leadStatus === 'incomplete'}
                            className="px-3 py-2 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm btn-interactive"
                          >
                            ✉ Phản hồi & Nhắc nhở
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

      {/* POPUP MODAL DUYỆT & NHẬN XÉT GỬI MAIL */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-primary to-brand-accent"></div>

            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
              ✉ Phản hồi & Nhắc nhở Tuần {selectedWeek} - {selectedTeacher.fullName}
            </h3>

            <div className="space-y-4">
              {/* Box Info */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 text-slate-600">
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
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
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
