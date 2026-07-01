'use client';

import { useState, useEffect } from 'react';
import { FILE_TYPES, FILE_TYPE_LABELS, EVALUATION_LEVELS, EVALUATION_COLORS } from '@/constants/roles';
import { getCurrentWeek, getWeekDateRange, formatDate } from '@/utils/weekCalculator';

interface LeadDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
  };
  onLogout: () => void;
}

interface TeacherData {
  id: string;
  fullName: string;
  email: string;
  driveFolder: string;
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

export default function LeadDashboard({ user, onLogout }: LeadDashboardProps) {
  const schoolStartDate = '2026-09-01';
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;

  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // SMTP Log để hiển thị quá trình giả lập gửi Gmail
  const [smtpLog, setSmtpLog] = useState<string | null>(null);

  // Danh sách Giáo viên giả lập thuộc Khối (Grade) của Khối Trưởng
  const [teachers, setTeachers] = useState<TeacherData[]>([]);

  // Dữ liệu báo cáo của các giáo viên
  const [submissions, setSubmissions] = useState<{ [key: string]: DemoSubmission }>({});

  useEffect(() => {
    // 1. Khởi tạo danh sách giáo viên thuộc khối
    const gradeSuffix = user.grade || 'Khối 1';
    const mockTeachers: TeacherData[] = [
      { id: 't1', fullName: 'Nguyễn Văn An', email: 'an.nv@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/NguyenVanAn` },
      { id: 't2', fullName: 'Lê Thị Bình', email: 'binh.lt@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/LeThiBinh` },
      { id: 't3', fullName: 'Phạm Hồng Sơn', email: 'son.ph@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/PhamHongSon` },
      { id: 't4', fullName: 'Trần Thị Diệu', email: 'dieu.tt@school.edu.vn', driveFolder: `Drive/QMS-EDU/${gradeSuffix}/TranThiDieu` },
    ];
    setTeachers(mockTeachers);

    // 2. Khởi tạo dữ liệu nộp bài demo của các giáo viên trong khối ở tuần đã chọn
    // (Lưu vào localStorage để khi test thay đổi trạng thái sẽ lưu trữ lại)
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
          ] // Thiếu DCTD
        },
        't2': {
          teacherId: 't2',
          submittedAt: '2026-09-11T16:45:00Z',
          teacherNote: 'Nộp đủ 3 file',
          leadStatus: 'verified',
          leadNote: 'Đã duyệt nộp đủ.',
          bghRating: EVALUATION_LEVELS.TOT,
          bghFeedback: 'Đạt yêu cầu tốt.',
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
          files: [] // Chưa nộp
        },
        't4': {
          teacherId: 't4',
          submittedAt: '2026-09-12T10:00:00Z',
          teacherNote: 'Nộp báo cáo tuần mới',
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
  }, [selectedWeek, user.grade]);

  // Quét tự động Google Drive (Auto-Scan) giả lập
  const handleAutoScan = (teacherId: string, teacherName: string) => {
    setScanningId(teacherId);
    
    // Giả lập backend gọi Google Drive API v3 để quét danh sách file trong folder
    setTimeout(() => {
      setScanningId(null);
      
      const cleanName = teacherName.replace(/\s+/g, '');
      const currentSub = submissions[teacherId];
      
      // Giả lập quét phát hiện các file thực tế trên Drive
      // Ví dụ: Giáo viên t1 nộp thiếu file DCTD, quét Drive phát hiện họ vừa tải lên thêm 1 file
      let updatedFiles = [...(currentSub?.files || [])];
      
      // Nếu là An (t1), giả định quét Drive phát hiện họ vừa bổ sung đủ DCTD
      if (teacherId === 't1' && !updatedFiles.some(f => f.fileType === FILE_TYPES.DCTD)) {
        updatedFiles.push({
          fileName: `DCTD_Tuan${String(selectedWeek).padStart(2, '0')}_${cleanName}.docx`,
          fileType: FILE_TYPES.DCTD,
          uploadedAt: new Date().toISOString().split('T')[0],
          url: '#',
        });
      }
      // Nếu là Sơn (t3) chưa nộp gì, giả định quét Drive vẫn thấy 0 file
      
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
      
      alert(`[Drive API] Quét thành công thư mục giáo viên ${teacherName}. Phát hiện: ${updatedFiles.length} file.`);
    }, 1500);
  };

  const handleVerifyClick = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    const sub = submissions[teacher.id];
    setVerificationNote(sub?.leadNote || '');
  };

  // Xác nhận nộp đủ và gửi email SMTP
  const submitVerification = (status: 'verified' | 'incomplete') => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setSmtpLog(null);

    const sub = submissions[selectedTeacher.id];
    
    setTimeout(() => {
      // 1. Cập nhật trạng thái database giả lập
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

      // 2. Giả lập gửi SMTP mail qua tài khoản của trường
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
        setSuccessMsg(`Đã xác nhận trạng thái báo cáo tuần ${selectedWeek} cho giáo viên ${selectedTeacher.fullName}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      }, 1500);

    }, 1000);
  };

  const dateRange = getWeekDateRange(selectedWeek, schoolStartDate);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* HEADER */}
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
            <div className="text-xs font-bold text-slate-200">Khối trưởng: {user.fullName}</div>
            <div className="text-[10px] text-orange-500 font-semibold">Phụ trách: {user.grade}</div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* BODY CONTAINER */}
      <div className="flex-grow flex flex-col md:flex-row">
        
        {/* SIDEBAR CHỌN TUẦN */}
        <aside className="w-full md:w-64 border-r border-slate-900 bg-slate-950/40 p-4 shrink-0 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Tuần kiểm duyệt
          </div>
          
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto max-h-[150px] md:max-h-[calc(100vh-200px)] pb-2 md:pb-0 pr-1">
            {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map((week) => {
              const isCurrent = week === currentWeek;
              const isSelected = week === selectedWeek;
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
                    <span>📅</span>
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

        {/* MAIN PANEL */}
        <main className="flex-grow p-6 lg:p-10 space-y-6">
          
          {successMsg && (
            <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-sm text-green-400 font-medium animate-fade-in">
              ✅ {successMsg}
            </div>
          )}

          {/* TIÊU ĐỀ DASHBOARD */}
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="text-xs text-orange-400 font-bold uppercase tracking-wider">Quản lý duyệt báo cáo</div>
              <h2 className="text-xl font-black">{user.grade} — Báo cáo Tuần {selectedWeek}</h2>
              <p className="text-xs text-slate-400">
                Lịch dạy: <strong>{formatDate(dateRange.start)}</strong> đến <strong>{formatDate(dateRange.end)}</strong>
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="flex gap-4 text-xs font-bold">
              <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-center">
                <div>Đã duyệt</div>
                <div className="text-lg mt-0.5">{Object.values(submissions).filter(s => s.leadStatus === 'verified').length}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-center">
                <div>Chờ duyệt</div>
                <div className="text-lg mt-0.5">{Object.values(submissions).filter(s => s.submittedAt && s.leadStatus === 'pending').length}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                <div>Chưa nộp</div>
                <div className="text-lg mt-0.5">{Object.values(submissions).filter(s => !s.submittedAt).length}</div>
              </div>
            </div>
          </div>

          {/* BẢNG GIÁO VIÊN & TÌNH TRẠNG NỘP FILE */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Giáo viên</th>
                    <th className="p-4">Tài liệu đã nộp trên Drive (Auto-Scan)</th>
                    <th className="p-4">Ghi chú của GV</th>
                    <th className="p-4 text-center">Trạng thái duyệt</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {teachers.map((teacher) => {
                    const sub = submissions[teacher.id];
                    const hasSubmitted = !!sub?.submittedAt;
                    
                    // Kiểm tra xem đã đủ 3 file chưa
                    const hasKHBD = sub?.files.some(f => f.fileType === FILE_TYPES.KHBD);
                    const hasKHGD = sub?.files.some(f => f.fileType === FILE_TYPES.KHGD);
                    const hasDCTD = sub?.files.some(f => f.fileType === FILE_TYPES.DCTD);
                    const fileCount = sub?.files.length || 0;

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-900/20 transition-colors">
                        {/* 1. Giáo viên */}
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{teacher.fullName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{teacher.email}</div>
                        </td>
                        
                        {/* 2. Tài liệu quét trên Drive */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${hasKHBD ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              KHBD {hasKHBD ? '✓' : '✖'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${hasKHGD ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              KHGD {hasKHGD ? '✓' : '✖'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${hasDCTD ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              DCTD {hasDCTD ? '✓' : '✖'}
                            </span>
                          </div>
                          {fileCount > 0 && (
                            <div className="text-[9px] text-slate-500 mt-1.5 italic">
                              Tổng cộng: {fileCount} file trong folder
                            </div>
                          )}
                        </td>

                        {/* 3. Ghi chú giáo viên */}
                        <td className="p-4 max-w-xs truncate text-slate-400">
                          {sub?.teacherNote || <span className="text-slate-600 font-medium">Không có ghi chú</span>}
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="p-4 text-center">
                          {!hasSubmitted ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                              Chưa nộp
                            </span>
                          ) : sub.leadStatus === 'pending' ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold">
                              Chờ duyệt
                            </span>
                          ) : sub.leadStatus === 'incomplete' ? (
                            <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
                              Nộp thiếu/Sửa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
                              Đã xác nhận
                            </span>
                          )}
                        </td>

                        {/* 5. Hành động */}
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Button Quét Drive */}
                          <button
                            onClick={() => handleAutoScan(teacher.id, teacher.fullName)}
                            disabled={scanningId !== null}
                            className="px-2.5 py-1.5 border border-slate-800 bg-slate-950 text-[10px] font-bold rounded-lg hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {scanningId === teacher.id ? '⏳ Đang quét...' : '🔍 Quét Drive'}
                          </button>
                          
                          {/* Button Duyệt */}
                          <button
                            onClick={() => handleVerifyClick(teacher)}
                            disabled={!hasSubmitted}
                            className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-900 disabled:text-slate-700 text-[10px] font-bold rounded-lg text-white transition-all cursor-pointer disabled:border-transparent border border-orange-600"
                          >
                            Duyệt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL DUYỆT TÀI LIỆU (GLASSMORPHISM POPUP) */}
          {selectedTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-orange-500"></div>
                
                <div>
                  <h3 className="text-base font-bold text-slate-200">
                    Kiểm duyệt tài liệu — {selectedTeacher.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Trạng thái thực tế: nộp {submissions[selectedTeacher.id]?.files.length || 0}/3 file yêu cầu.
                  </p>
                </div>

                {/* Form nhập nhận xét */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    Ghi chú / Nhận xét của Khối trưởng
                  </label>
                  <textarea
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="Nhập nhận xét hoặc chỉ ra file còn thiếu cần bổ sung..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-200 focus:border-orange-500/50 focus:outline-none transition-all h-24"
                  />
                </div>

                {/* Bảng log giả lập gửi SMTP */}
                {smtpLog && (
                  <div className="p-3 bg-black rounded-lg border border-slate-800 font-mono text-[9px] text-green-400 overflow-x-auto whitespace-pre">
                    {smtpLog}
                  </div>
                )}

                {/* Buttons hành động */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedTeacher(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>

                  <div className="flex gap-2">
                    {/* Báo thiếu bài */}
                    <button
                      onClick={() => submitVerification('incomplete')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-950/40 hover:bg-red-950/80 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Báo thiếu bài
                    </button>
                    {/* Xác nhận nộp đủ */}
                    <button
                      onClick={() => submitVerification('verified')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {isSubmitting ? 'Đang gửi mail...' : 'Xác nhận nộp đủ'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
