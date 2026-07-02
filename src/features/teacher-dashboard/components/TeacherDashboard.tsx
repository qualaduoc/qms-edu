'use client';

import { useState, useEffect } from 'react';
import { FILE_TYPES, FILE_TYPE_LABELS, EVALUATION_LEVELS, EVALUATION_COLORS } from '@/constants/roles';
import { getCurrentWeek, getWeekDateRange, formatDate } from '@/utils/weekCalculator';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/components/common/Toast';

interface TeacherDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
    id?: string;
  };
  onLogout: () => void;
}

interface DemoFile {
  id?: string; // ID file trên Google Drive (nếu có)
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  url?: string;
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
  const { showToast } = useToast();
  const schoolStartDate = '2026-09-01'; // Ngày khai giảng giả định
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;

  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [teacherNote, setTeacherNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Trạng thái đang tải lên của từng ô tài liệu (ví dụ: { KHBD: true })
  const [uploadingTypes, setUploadingTypes] = useState<{ [key: string]: boolean }>({
    [FILE_TYPES.KHBD]: false,
    [FILE_TYPES.KHGD]: false,
    [FILE_TYPES.DCTD]: false,
  });

  // File states cho 3 loại tài liệu (lưu dạng mảng để hỗ trợ nộp nhiều file cùng loại)
  const [files, setFiles] = useState<{ [key: string]: DemoFile[] }>({
    [FILE_TYPES.KHBD]: [],
    [FILE_TYPES.KHGD]: [],
    [FILE_TYPES.DCTD]: [],
  });

  // Lưu trữ các bản nộp tuần của giáo viên này
  const [submissions, setSubmissions] = useState<{ [key: number]: DemoSubmission }>({});
  const [deadlineConfig, setDeadlineConfig] = useState<any>(null);

  const isReal = !!user.id;

  // Tải dữ liệu nộp bài thật từ Supabase và quét Google Drive
  const loadRealSubmission = async (week: number) => {
    if (!user.id) return;
    setLoadingData(true);
    try {
      // 1. Tải trạng thái nộp bài từ Supabase submissions table
      const { data: dbSub, error: dbErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('week_number', week)
        .maybeSingle();

      if (dbErr) throw dbErr;

      // 2. Gọi API quét file thật trực tiếp trên Google Drive
      const scanRes = await fetch(`/api/submissions/scan?teacherId=${user.id}&weekNumber=${week}`);
      const scanResult = await scanRes.json();
      const driveFiles = scanRes.ok ? scanResult.files : [];

      const subData: DemoSubmission = {
        weekNumber: week,
        submittedAt: dbSub?.submittedAt || (driveFiles.length > 0 ? (dbSub?.created_at || new Date().toISOString()) : null),
        teacherNote: dbSub?.teacher_note || '',
        leadStatus: dbSub?.lead_status || 'pending',
        leadNote: dbSub?.lead_note || null,
        bghRating: dbSub?.bgh_rating || null,
        bghFeedback: dbSub?.bgh_feedback || null,
        files: driveFiles.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: 'Đã quét trên Drive',
          uploadedAt: f.uploadedAt || '',
          url: f.url
        }))
      };

      setSubmissions(prev => ({
        ...prev,
        [week]: subData
      }));

      // Nếu đang chọn chính tuần này thì cập nhật form
      if (week === selectedWeek) {
        setTeacherNote(subData.teacherNote);
        const fileMap = {
          [FILE_TYPES.KHBD]: subData.files.filter(f => f.type === FILE_TYPES.KHBD),
          [FILE_TYPES.KHGD]: subData.files.filter(f => f.type === FILE_TYPES.KHGD),
          [FILE_TYPES.DCTD]: subData.files.filter(f => f.type === FILE_TYPES.DCTD),
        };
        setFiles(fileMap);
      }

    } catch (err) {
      console.error('Lỗi tải dữ liệu nộp bài từ database:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isReal) {
      loadRealSubmission(selectedWeek);
    } else {
      // Dữ liệu giả lập cho phiên Demo
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

      const stored = localStorage.getItem(`qms_submissions_${user.fullName}`);
      if (stored) {
        setSubmissions(JSON.parse(stored));
      } else {
        setSubmissions(initialSubmissions);
      }
    }
  }, [user.fullName, user.id]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
          const result = await res.json();
          setDeadlineConfig(result.data);
        }
      } catch (e) {
        console.error('Không thể load cấu hình hạn nộp:', e);
      }
    };
    loadConfig();
  }, []);

  // Đồng bộ form khi đổi tuần ở chế độ demo
  useEffect(() => {
    if (!isReal) {
      const sub = submissions[selectedWeek];
      if (sub) {
        setTeacherNote(sub.teacherNote || '');
        const fileMap = {
          [FILE_TYPES.KHBD]: sub.files.filter(f => f.type === FILE_TYPES.KHBD),
          [FILE_TYPES.KHGD]: sub.files.filter(f => f.type === FILE_TYPES.KHGD),
          [FILE_TYPES.DCTD]: sub.files.filter(f => f.type === FILE_TYPES.DCTD),
        };
        setFiles(fileMap);
      } else {
        setTeacherNote('');
        setFiles({
          [FILE_TYPES.KHBD]: [],
          [FILE_TYPES.KHGD]: [],
          [FILE_TYPES.DCTD]: [],
        });
      }
    } else {
      loadRealSubmission(selectedWeek);
    }
  }, [selectedWeek, submissions, isReal]);

  // Xử lý nộp file thực tế lên Google Drive API
  const handleFileUpload = async (type: string, e: React.ChangeEvent<HTMLInputElement>, fileIndex: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validate định dạng Word
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'docx' && fileExtension !== 'doc') {
      showToast('Vui lòng chỉ nộp tài liệu định dạng Word (.doc hoặc .docx) theo đúng quy định!', 'warning');
      return;
    }

    if (isReal) {
      // Bật trạng thái loading của ô tải lên tương ứng
      setUploadingTypes(prev => ({ ...prev, [type]: true }));
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', type);
        formData.append('weekNumber', String(selectedWeek));
        formData.append('teacherId', user.id || '');
        formData.append('teacherName', user.fullName);
        formData.append('grade', user.grade);
        formData.append('teacherNote', teacherNote);
        formData.append('fileIndex', String(fileIndex));

        const res = await fetch('/api/submissions/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();
        if (res.ok) {
          showToast(`Đã tải lên tệp tin ${type} thành công lên Google Drive!`, 'success');
          
          // Tải lại dữ liệu tuần để cập nhật file thật từ Drive
          await loadRealSubmission(selectedWeek);
        } else {
          showToast(`Tải file lên thất bại: ${result.error}`, 'error');
        }
      } catch (err: any) {
        console.error('Lỗi khi upload file:', err);
        showToast(`Lỗi kết nối khi upload file: ${err.message}`, 'error');
      } finally {
        setUploadingTypes(prev => ({ ...prev, [type]: false }));
      }
    } else {
      // Chế độ demo
      const cleanName = user.fullName.replace(/\s+/g, '');
      const weekStr = String(selectedWeek).padStart(2, '0');
      const originalNameClean = file.name
        .replace(/\.[^/.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
      let standardName = `${type}_Tuan${weekStr}_${cleanName}_${originalNameClean}_${fileIndex}.docx`;

      setFiles(prev => ({
        ...prev,
        [type]: [
          ...(prev[type] || []),
          {
            id: Math.random().toString(36).substring(7),
            name: standardName,
            type: type,
            size: `${Math.round(file.size / 1024)} KB`,
            uploadedAt: new Date().toISOString().split('T')[0]
          }
        ]
      }));
    }
  };

  // Bấm nút xóa file đã chọn (và xóa trên Drive nếu là real)
  const handleRemoveFile = async (type: string, fileId: string) => {
    if (isReal && fileId) {
      if (!confirm('Thầy/Cô có chắc chắn muốn xóa file này trên Google Drive của nhà trường?')) return;
      
      setUploadingTypes(prev => ({ ...prev, [type]: true }));
      try {
        const res = await fetch('/api/submissions/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: fileId,
            teacherId: user.id,
            weekNumber: selectedWeek,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          showToast(`Đã xóa file thành công trên Google Drive!`, 'success');
          
          // Tải lại dữ liệu tuần
          await loadRealSubmission(selectedWeek);
        } else {
          showToast(`Xóa file thất bại: ${result.error}`, 'error');
        }
      } catch (err: any) {
        console.error('Lỗi khi xóa file:', err);
        showToast(`Lỗi kết nối khi xóa file: ${err.message}`, 'error');
      } finally {
        setUploadingTypes(prev => ({ ...prev, [type]: false }));
      }
    } else {
      // Chế độ demo
      setFiles(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter(f => f.id !== fileId)
      }));
    }
  };

  // Xác nhận nộp giáo án tuần và lưu ý kiến giáo viên
  const handleSendSubmission = async () => {
    const activeFiles = Object.values(files).flat();
    if (activeFiles.length === 0) {
      showToast('Thầy/Cô vui lòng tải lên ít nhất một tài liệu giảng dạy trước khi xác nhận gửi!', 'warning');
      return;
    }

    setIsSubmitting(true);

    if (isReal && user.id) {
      try {
        // Ghi nhận ghi chú của giáo viên vào database
        const { error } = await supabase
          .from('submissions')
          .upsert({
            teacher_id: user.id,
            week_number: selectedWeek,
            school_year: '2026-2027',
            teacher_note: teacherNote,
            submitted_at: new Date().toISOString(),
            lead_status: 'pending' // Chờ duyệt
          }, {
            onConflict: 'teacher_id,week_number,school_year'
          });

        if (error) throw error;

        showToast(`Đã cập nhật ý kiến và xác nhận nộp báo cáo Tuần ${selectedWeek} thành công tới Khối trưởng!`, 'success');
        await loadRealSubmission(selectedWeek);
      } catch (err: any) {
        console.error('Lỗi khi gửi báo cáo:', err);
        showToast(`Gửi báo cáo thất bại: ${err.message}`, 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Chế độ demo
      setTimeout(() => {
        const uploadedFiles = Object.values(files).flat();
        
        const newSubmission: DemoSubmission = {
          weekNumber: selectedWeek,
          submittedAt: new Date().toISOString(),
          teacherNote: teacherNote,
          leadStatus: 'pending',
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
        
        setTimeout(() => setNotification(null), 5000);
      }, 1200);
    }
  };

  const selectedWeekSubmission = submissions[selectedWeek];
  
  const getSubmissionStatus = () => {
    const driveFiles = selectedWeekSubmission?.files || [];
    
    // Đếm file thực tế quét được từ Drive của tuần này
    const khbdCount = driveFiles.filter(f => f.type === FILE_TYPES.KHBD).length;
    const khgdCount = driveFiles.filter(f => f.type === FILE_TYPES.KHGD).length;
    const dctdCount = driveFiles.filter(f => f.type === FILE_TYPES.DCTD).length;

    // Đọc số lượng file yêu cầu từ cấu hình hệ thống
    const reqKHBD = deadlineConfig?.khbd_required_files !== null && deadlineConfig?.khbd_required_files !== undefined ? Number(deadlineConfig.khbd_required_files) : 2;
    const reqKHGD = deadlineConfig?.khgd_required_files !== null && deadlineConfig?.khgd_required_files !== undefined ? Number(deadlineConfig.khgd_required_files) : 1;
    const reqDCTD = deadlineConfig?.dctd_required_files !== null && deadlineConfig?.dctd_required_files !== undefined ? Number(deadlineConfig.dctd_required_files) : 1;

    const totalUploaded = khbdCount + khgdCount + dctdCount;
    const totalRequired = reqKHBD + reqKHGD + reqDCTD;
    
    const isComplete = khbdCount >= reqKHBD && khgdCount >= reqKHGD && dctdCount >= reqDCTD;
    const hasAny = totalUploaded > 0;

    return {
      isComplete,
      hasAny,
      totalUploaded,
      totalRequired,
      khbdCount,
      reqKHBD,
      khgdCount,
      reqKHGD,
      dctdCount,
      reqDCTD
    };
  };

  const dateRange = getWeekDateRange(selectedWeek, schoolStartDate);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* 1. TOP HEADER - Brand Token Style */}
      <header className="relative z-10 bg-brand-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
              Q
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">QMS-EDU</h1>
            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-0.5">Giáo viên Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">Thầy/Cô: {user.fullName}</div>
            <div className="text-[10px] text-indigo-100 font-bold bg-white/10 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
              {user.grade}
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
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
        
        {/* SIDEBAR BÊN TRÁI: Chọn Tuần (dễ dùng, khoa học giống OLM) */}
        <aside className="w-full md:w-64 border-r border-slate-200 bg-white p-4 shrink-0 flex flex-col gap-3 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Tuần dạy học (Năm học 2026-2027)
          </div>
          
          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto max-h-[150px] md:max-h-[calc(100vh-180px)] pb-2 md:pb-0 pr-1 scrollbar-hidden">
            {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map((week) => {
              const sub = submissions[week];
              const isCurrent = week === currentWeek;
              const isSelected = week === selectedWeek;
              
              let statusBadge = '🔴'; // Chưa nộp
              if (sub) {
                if (sub.leadStatus === 'verified') statusBadge = '🟢'; // Đã duyệt
                else if (sub.submittedAt) statusBadge = '⏳'; // Đang chờ duyệt
                else if (sub.leadStatus === 'incomplete') statusBadge = '🟠'; // Cần bổ dung
              }

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
                    <span>{statusBadge}</span>
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

        {/* CỘT CHÍNH: Form nộp & xem trạng thái duyệt của Tuần đã chọn */}
        <main className="flex-grow p-6 lg:p-10 max-w-4xl space-y-6">
          
          {/* Banner thông báo trạng thái nộp thành công */}
          {notification && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 font-medium animate-fade-in flex items-center gap-2 shadow-sm animate-pulse">
              <span>✅</span> {notification}
            </div>
          )}

          {/* LOADING INDICATOR */}
          {loadingData && (
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 text-xs text-indigo-700 font-bold flex items-center gap-2 shadow-sm">
              <span className="animate-spin">🔄</span> Đang quét dữ liệu Google Drive thực tế của Tuần {selectedWeek}...
            </div>
          )}

          {/* 2.1 TRẠNG THÁI TUẦN CHỌN */}
          <div className="p-6 rounded-2xl border border-slate-300 bg-white shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trạng thái báo cáo</div>
              <h2 className="text-2xl font-black text-slate-800">Tuần {selectedWeek}</h2>
              <p className="text-xs text-slate-500">
                Khoảng thời gian học: <strong>{formatDate(dateRange.start)}</strong> đến <strong>{formatDate(dateRange.end)}</strong>
              </p>
            </div>

            {/* Trạng thái nộp học liệu */}
            <div className="flex flex-col gap-1 items-start md:items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Trạng thái nộp bài</span>
              {(() => {
                const subStatus = getSubmissionStatus();
                if (!subStatus.hasAny) {
                  return (
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-red-50 text-red-650 shadow-sm">
                      ❌ Chưa nộp báo cáo
                    </span>
                  );
                }
                if (!subStatus.isComplete) {
                  return (
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm animate-pulse">
                      ⚠️ Nộp thiếu học liệu (Mới nộp {subStatus.totalUploaded}/{subStatus.totalRequired} file)
                    </span>
                  );
                }
                if (selectedWeekSubmission?.leadStatus === 'incomplete') {
                  return (
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg border border-orange-200 bg-orange-50 text-orange-600 shadow-sm">
                      ⚠️ Khối trưởng yêu cầu bổ sung
                    </span>
                  );
                }
                return (
                  <span className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm">
                    ✓ Đã hoàn thành nộp
                  </span>
                );
              })()}
            </div>
          </div>

          {/* 2.2 NHẬN XÉT CỦA BGH (RIÊNG TƯ TUYỆT ĐỐI) */}
          {selectedWeekSubmission?.bghRating && (
            <div className="p-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 relative overflow-hidden space-y-3.5 shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  🛡️ Nhận xét riêng tư từ Ban Giám Hiệu
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${EVALUATION_COLORS[selectedWeekSubmission.bghRating as keyof typeof EVALUATION_COLORS]}`}>
                  Đánh giá: {selectedWeekSubmission.bghRating}
                </span>
              </div>
              <p className="text-slate-700 text-sm italic leading-relaxed bg-white/50 p-3 rounded-lg border border-indigo-100/40">
                "{selectedWeekSubmission.bghFeedback || 'Không có nhận xét chi tiết.'}"
              </p>
              <div className="text-[10px] text-slate-400">
                Chỉ Thầy/Cô và Ban Giám Hiệu có thể xem kết quả đánh giá thi đua này.
              </div>
            </div>
          )}

          {/* 2.3 PHẢN HỒI YÊU CẦU BỔ SUNG CỦA KHỐI TRƯỞNG */}
          {selectedWeekSubmission?.leadStatus === 'incomplete' && selectedWeekSubmission.leadNote && (
            <div className="p-6 rounded-2xl border border-orange-200 bg-orange-50/40 relative overflow-hidden space-y-2 shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1 bg-orange-500"></div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                💬 Ghi chú từ Khối Trưởng (Yêu cầu bổ sung):
              </span>
              <p className="text-slate-700 text-sm font-medium bg-white/60 p-3 rounded-lg border border-orange-100/50">
                "{selectedWeekSubmission.leadNote}"
              </p>
            </div>
          )}

          {/* 2.4 CỔNG TẢI LÊN TÀI LIỆU WORD */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Học liệu & Báo cáo Tuần nộp
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(FILE_TYPE_LABELS).map((type) => {
                const typeFiles = files[type] || [];
                const isUploading = uploadingTypes[type];
                
                const reqCount = type === FILE_TYPES.KHBD 
                  ? (deadlineConfig?.khbd_required_files !== null && deadlineConfig?.khbd_required_files !== undefined ? Number(deadlineConfig.khbd_required_files) : 2) 
                  : type === FILE_TYPES.KHGD 
                    ? (deadlineConfig?.khgd_required_files !== null && deadlineConfig?.khgd_required_files !== undefined ? Number(deadlineConfig.khgd_required_files) : 1) 
                    : (deadlineConfig?.dctd_required_files !== null && deadlineConfig?.dctd_required_files !== undefined ? Number(deadlineConfig.dctd_required_files) : 1);

                return (
                  <div key={type} className="p-5 rounded-2xl border border-slate-300 bg-white hover:border-brand-primary transition-all flex flex-col justify-between min-h-[220px] shadow-sm relative group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-brand-primary bg-brand-primary-light/50 border border-brand-primary-light px-2 py-0.5 rounded-full uppercase">
                          {type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          Yêu cầu: {typeFiles.length}/{reqCount} file
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-black text-slate-800 leading-tight">
                        {FILE_TYPE_LABELS[type as keyof typeof FILE_TYPE_LABELS]}
                      </h4>
                      
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-[10px] text-brand-primary font-bold mt-3">
                          <span className="animate-spin">🔄</span> Đang xử lý...
                        </div>
                      ) : typeFiles.length > 0 ? (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {typeFiles.map((file) => (
                            <div 
                              key={file.id || file.name} 
                              className="flex justify-between items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-xl text-[10px] text-slate-650 leading-snug shadow-sm"
                            >
                              <div className="truncate flex-grow font-bold">
                                {file.url ? (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline truncate block"
                                  >
                                    📄 {file.name}
                                  </a>
                                ) : (
                                  <span className="truncate block text-slate-700">📄 {file.name}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleRemoveFile(type, file.id || '')}
                                className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-1.5 transition-all cursor-pointer shadow-sm shrink-0 active:scale-90"
                                title="Xóa tệp tin"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Chưa tải tài liệu lên. Quy chuẩn tên file: <code className="text-brand-primary block mt-1">{type}_Tuan{String(selectedWeek).padStart(2, '0')}_{[user.fullName.replace(/\s+/g, '')]}_TenFile.docx</code>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-300">
                      {typeFiles.length < reqCount ? (
                        <label className="w-full block text-center py-2 bg-brand-primary-light/40 hover:bg-brand-primary-light/60 text-brand-primary border border-brand-primary-light rounded-xl text-[10px] font-bold cursor-pointer transition-colors btn-interactive shadow-sm">
                          Tải file Word lên ({typeFiles.length}/{reqCount})
                          <input
                            type="file"
                            accept=".doc,.docx"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(type, e, typeFiles.length + 1)}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="w-full text-center py-2 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded-xl text-[10px] font-bold select-none shadow-sm">
                          ✓ Đã nộp đủ ({typeFiles.length}/{reqCount})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2.5 GHI CHÚ BÁO CÁO CỦA GIÁO VIÊN */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Ý kiến / Ghi chú của Giáo viên gửi kèm
            </label>
            <textarea
              rows={3}
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="Nhập ghi chú gửi kèm báo cáo tuần (ví dụ: xin bổ sung tiết 2 do đi công tác, gửi kèm điều chỉnh...)"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
            />
          </div>

          {/* NÚT GỬI BÁO CÁO CHÍNH THỨC */}
          <div className="pt-4 border-t border-slate-300 flex justify-end">
            <button
              onClick={handleSendSubmission}
              disabled={isSubmitting || loadingData}
              className="px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/5 btn-interactive"
            >
              {isSubmitting ? 'Đang gửi...' : `Báo cáo nộp chính thức Tuần ${selectedWeek}`}
            </button>
          </div>

        </main>
      </div>

    </div>
  );
}
