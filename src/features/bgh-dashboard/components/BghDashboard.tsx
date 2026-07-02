'use client';

import { useState, useEffect } from 'react';
import { EVALUATION_LEVELS, EVALUATION_COLORS, FILE_TYPES } from '@/constants/roles';
import { getCurrentWeek } from '@/utils/weekCalculator';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/components/common/Toast';

interface BghDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
    id?: string;
  };
  onLogout: () => void;
}

interface TeacherMockData {
  id: string;
  fullName: string;
  grade: string;
  email: string;
  submittedCount: number;
}

interface TeacherFile {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface EvaluationHistoryItem {
  weekNumber: number;
  rating: string;
  feedback: string;
  updatedAt: string;
  teacherName: string;
  teacherGrade: string;
  teacherEmail: string;
  teacherNote: string;
  eliteFileName?: string | null;
  eliteFileUrl?: string | null;
}

export default function BghDashboard({ user, onLogout }: BghDashboardProps) {
  const { showToast } = useToast();
  const schoolStartDate = '2026-09-01';
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;
  
  const [activeTab, setActiveTab] = useState<'evaluate' | 'history'>('evaluate');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(currentWeek);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [randomTeacher, setRandomTeacher] = useState<TeacherMockData | null>(null);
  const [isSampling, setIsSampling] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<TeacherFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Đánh giá chi tiết
  const [bghRating, setBghRating] = useState<string>(EVALUATION_LEVELS.DAT);
  const [bghFeedback, setBghFeedback] = useState('');
  const [isElite, setIsElite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedEliteFiles, setSelectedEliteFiles] = useState<TeacherFile[]>([]);

  // Dữ liệu đánh giá chi tiết theo tiêu chí
  const [criteriaRatings, setCriteriaRatings] = useState<{ [key: string]: string }>({
    'muc_tiêu': EVALUATION_LEVELS.DAT,
    'hoat_dong': EVALUATION_LEVELS.DAT,
    'phuong_phap': EVALUATION_LEVELS.DAT,
    'thiet_bi': EVALUATION_LEVELS.DAT,
    'danh_gia': EVALUATION_LEVELS.DAT,
    'trinh_bay': EVALUATION_LEVELS.DAT,
  });

  const [teachersList, setTeachersList] = useState<TeacherMockData[]>([]);
  
  // States dành cho Lịch sử Đánh giá của BGH
  const [evaluationHistoryList, setEvaluationHistoryList] = useState<EvaluationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyGradeFilter, setHistoryGradeFilter] = useState('all');
  const [historyRatingFilter, setHistoryRatingFilter] = useState('all');

  const isReal = !!user.id;

  // Tải danh sách giáo viên thật từ database Supabase
  const loadRealTeachers = async () => {
    if (!user.id) return;
    try {
      const { data: dbTeachers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade')
        .eq('role', 'teacher')
        .eq('status', 'approved');

      if (error) throw error;

      const formatted = (dbTeachers || []).map(t => ({
        id: t.id,
        fullName: t.full_name || '',
        grade: t.grade || 'Khối 1',
        email: t.email,
        submittedCount: 0
      }));

      setTeachersList(formatted);
    } catch (err) {
      console.error('Lỗi tải danh sách giáo viên BGH:', err);
    }
  };

  // Tải lịch sử đánh giá đã diễn ra của BGH
  const loadEvaluationHistory = async () => {
    setLoadingHistory(true);
    try {
      if (isReal) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const token = session.access_token;

        const response = await fetch('/api/bgh/history', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể tải lịch sử đánh giá.');
        }

        const dbData = result.data || [];
        const formatted: EvaluationHistoryItem[] = dbData.map((d: any) => ({
          weekNumber: d.week_number,
          rating: d.bgh_rating || '',
          feedback: d.bgh_feedback || '',
          updatedAt: d.submitted_at || new Date().toISOString(),
          teacherName: d.profiles?.full_name || 'Giáo viên ẩn',
          teacherGrade: d.profiles?.grade || 'Khối 1',
          teacherEmail: d.profiles?.email || '',
          teacherNote: d.teacher_note || '',
          eliteFileName: d.elite_file_name || null,
          eliteFileUrl: d.elite_file_url || null,
        }));
        setEvaluationHistoryList(formatted);
      } else {
        // Chế độ demo
        setTimeout(() => {
          const mockHistory: EvaluationHistoryItem[] = [
            { weekNumber: 1, rating: EVALUATION_LEVELS.TOT, feedback: 'Giáo án soạn rất bám sát thực tế, tiến trình dạy học logic.', updatedAt: '2026-09-05T17:00:00Z', teacherName: 'Nguyễn Văn An', teacherGrade: 'Khối 1', teacherEmail: 'an.nv@school.edu.vn', teacherNote: 'Đã nộp đủ' },
            { weekNumber: 2, rating: EVALUATION_LEVELS.XUAT_SAC, feedback: 'Giáo án xuất sắc, các hoạt động trải nghiệm thiết kế sáng tạo.', updatedAt: '2026-09-12T08:30:00Z', teacherName: 'Lê Thị Bình', teacherGrade: 'Khối 1', teacherEmail: 'binh.lt@school.edu.vn', teacherNote: 'Đã nộp đủ', eliteFileName: 'KHBD_Tuan02_LeThiBinh.docx', eliteFileUrl: '#' },
            { weekNumber: 1, rating: EVALUATION_LEVELS.DAT, feedback: 'Đạt yêu cầu, cần đa dạng thêm hoạt động nhóm học sinh.', updatedAt: '2026-09-06T09:15:00Z', teacherName: 'Vũ Thị Mai', teacherGrade: 'Khối 2', teacherEmail: 'mai.vt@school.edu.vn', teacherNote: 'Gửi tổ chuyên môn' },
          ];
          setEvaluationHistoryList(mockHistory);
        }, 850);
      }
    } catch (err) {
      console.error('Lỗi load evaluation history:', err);
      showToast('Không thể tải lịch sử đánh giá thi đua.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isReal) {
      loadRealTeachers();
      loadEvaluationHistory();
    } else {
      const allTeachers: TeacherMockData[] = [
        { id: 't1', fullName: 'Nguyễn Văn An', grade: 'Khối 1', email: 'ledinhphuonglanltv@gmail.com', submittedCount: 3 },
        { id: 't2', fullName: 'Lê Thị Bình', grade: 'Khối 1', email: 'binh.lt@school.edu.vn', submittedCount: 3 },
        { id: 't3', fullName: 'Phạm Hồng Sơn', grade: 'Khối 1', email: 'son.ph@school.edu.vn', submittedCount: 1 },
        { id: 't4', fullName: 'Trần Thị Diệu', grade: 'Khối 1', email: 'dieu.tt@school.edu.vn', submittedCount: 3 },
        { id: 't5', fullName: 'Hoàng Văn Hùng', grade: 'Khối 2', email: 'hung.vh@school.edu.vn', submittedCount: 3 },
        { id: 't6', fullName: 'Vũ Thị Mai', grade: 'Khối 2', email: 'mai.vt@school.edu.vn', submittedCount: 2 },
        { id: 't7', fullName: 'Đỗ Tiến Đạt', grade: 'Khối 3', email: 'dat.td@school.edu.vn', submittedCount: 3 },
        { id: 't8', fullName: 'Nguyễn Minh Thư', grade: 'Bộ môn đặc thù', email: 'thu.nm@school.edu.vn', submittedCount: 3 },
      ];
      setTeachersList(allTeachers);
      loadEvaluationHistory();
    }
  }, [user.id, isReal]);

  const filteredTeachers = selectedGrade === 'all'
    ? teachersList
    : teachersList.filter(t => t.grade === selectedGrade);

  // Gọi API quét file thật của Giáo viên được rút thăm ngẫu nhiên hoặc chọn thủ công
  const loadTeacherRealFiles = async (teacherId: string) => {
    setLoadingFiles(true);
    setScannedFiles([]);
    try {
      const queryWeek = selectedWeek === 'all' ? currentWeek : selectedWeek;
      const res = await fetch(`/api/submissions/scan?teacherId=${teacherId}&weekNumber=${queryWeek}`);
      const result = await res.json();
      if (res.ok) {
        setScannedFiles(result.files.map((f: any) => ({
          name: f.name,
          url: f.url,
          type: f.type,
          uploadedAt: f.uploadedAt || ''
        })));
      }
    } catch (e) {
      console.error('Lỗi quét file khi đánh giá:', e);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Giả lập/Thực tế lấy mẫu ngẫu nhiên (Random Sampling)
  const handleRandomSampling = () => {
    setIsSampling(true);
    setRandomTeacher(null);
    setSaveSuccess(false);
    setScannedFiles([]);

    setTimeout(async () => {
      if (filteredTeachers.length === 0) {
        showToast('Khối này chưa có giáo viên nào hoạt động!', 'warning');
        setIsSampling(false);
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * filteredTeachers.length);
      const chosenTeacher = filteredTeachers[randomIndex];
      
      setRandomTeacher(chosenTeacher);
      setIsSampling(false);

      // Reset form đánh giá
      setBghRating(EVALUATION_LEVELS.DAT);
      setBghFeedback('');
      setIsElite(false);
      setSelectedEliteFiles([]);
      setCriteriaRatings({
        'muc_tiêu': EVALUATION_LEVELS.DAT,
        'hoat_dong': EVALUATION_LEVELS.DAT,
        'phuong_phap': EVALUATION_LEVELS.DAT,
        'thiet_bi': EVALUATION_LEVELS.DAT,
        'danh_gia': EVALUATION_LEVELS.DAT,
        'trinh_bay': EVALUATION_LEVELS.DAT,
      });

      if (isReal) {
        await loadTeacherRealFiles(chosenTeacher.id);
      } else {
        setScannedFiles([
          { name: `KHBD_Tuan${String(selectedWeek === 'all' ? currentWeek : selectedWeek).padStart(2, '0')}_NguyenVanAn.docx`, url: '#', type: FILE_TYPES.KHBD, uploadedAt: '2026-09-12' },
          { name: `KHGD_Tuan${String(selectedWeek === 'all' ? currentWeek : selectedWeek).padStart(2, '0')}_NguyenVanAn.docx`, url: '#', type: FILE_TYPES.KHGD, uploadedAt: '2026-09-12' }
        ]);
      }
    }, 1500);
  };

  // Chọn giáo viên thủ công từ danh sách bên trái
  const handleSelectTeacherManual = async (teacher: TeacherMockData) => {
    setSaveSuccess(false);
    setRandomTeacher(teacher);
    
    // Reset form đánh giá
    setBghRating(EVALUATION_LEVELS.DAT);
    setBghFeedback('');
    setIsElite(false);
    setSelectedEliteFiles([]);
    setCriteriaRatings({
      'muc_tiêu': EVALUATION_LEVELS.DAT,
      'hoat_dong': EVALUATION_LEVELS.DAT,
      'phuong_phap': EVALUATION_LEVELS.DAT,
      'thiet_bi': EVALUATION_LEVELS.DAT,
      'danh_gia': EVALUATION_LEVELS.DAT,
      'trinh_bay': EVALUATION_LEVELS.DAT,
    });

    if (isReal) {
      await loadTeacherRealFiles(teacher.id);
    } else {
      setScannedFiles([
        { name: `KHBD_Tuan${String(selectedWeek === 'all' ? currentWeek : selectedWeek).padStart(2, '0')}_${teacher.fullName.replace(/\s+/g, '')}.docx`, url: '#', type: FILE_TYPES.KHBD, uploadedAt: '2026-09-12' },
        { name: `KHGD_Tuan${String(selectedWeek === 'all' ? currentWeek : selectedWeek).padStart(2, '0')}_${teacher.fullName.replace(/\s+/g, '')}.docx`, url: '#', type: FILE_TYPES.KHGD, uploadedAt: '2026-09-12' }
      ]);
    }
  };

  // Bấm chọn file vinh danh từ danh sách tài liệu quét được
  const handleToggleEliteFile = (file: TeacherFile) => {
    setSelectedEliteFiles(prev => {
      const exists = prev.some(f => f.name === file.name);
      if (exists) {
        const filtered = prev.filter(f => f.name !== file.name);
        if (filtered.length === 0) setIsElite(false);
        return filtered;
      } else {
        setIsElite(true);
        return [...prev, file];
      }
    });
  };

  // Nộp form Đánh giá chất lượng sư phạm lên database Supabase
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!randomTeacher) return;

    setIsSaving(true);
    const evaluationWeek = selectedWeek === 'all' ? currentWeek : selectedWeek;
    
    if (isReal && user.id) {
      try {
        let eliteFileName = null;
        let eliteFileUrl = null;

        if (selectedEliteFiles.length > 0) {
          eliteFileName = selectedEliteFiles.map(f => f.name).join(' | ');
          eliteFileUrl = selectedEliteFiles.map(f => f.url).join(' | ');
        } else if (isElite) {
          const fallbackFile = scannedFiles.find(f => f.type === FILE_TYPES.KHBD);
          eliteFileName = fallbackFile?.name || null;
          eliteFileUrl = fallbackFile?.url || null;
        }

        const response = await fetch('/api/bgh/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherId: randomTeacher.id,
            weekNumber: evaluationWeek,
            schoolYear: '2026-2027',
            bghRating: bghRating,
            bghFeedback: bghFeedback,
            bghId: user.id,
            isElite: isElite,
            criteriaRatings: criteriaRatings,
            eliteFileName: eliteFileName,
            eliteFileUrl: eliteFileUrl
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Lỗi khi lưu kết quả đánh giá.');
        }

        if (isElite) {
          const storedElites = localStorage.getItem('qms_elite_lessons') || '[]';
          const elites = JSON.parse(storedElites);
          const newElite = {
            id: `${randomTeacher.id}_w${evaluationWeek}`,
            teacherName: randomTeacher.fullName,
            grade: randomTeacher.grade,
            weekNumber: evaluationWeek,
            title: `Kế hoạch bài dạy Tuần ${evaluationWeek} - môn Toán/Tiếng Việt`,
            fileUrl: scannedFiles.find(f => f.type === FILE_TYPES.KHBD)?.url || '#',
            rating: bghRating,
            feedback: bghFeedback
          };
          if (!elites.some((e: any) => e.id === newElite.id)) {
            elites.push(newElite);
            localStorage.setItem('qms_elite_lessons', JSON.stringify(elites));
          }
        }

        setSaveSuccess(true);
        showToast(`Đã lưu kết quả thanh tra chất lượng và đánh giá thi đua cho Thầy/Cô ${randomTeacher.fullName} thành công! (Tuần ${evaluationWeek})`, 'success');
        setRandomTeacher(null);
        await loadEvaluationHistory(); // Cập nhật lại lịch sử
      } catch (err: any) {
        console.error('Lỗi lưu đánh giá BGH:', err);
        showToast(`Lưu đánh giá thất bại: ${err.message}`, 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Demo Mode
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        
        if (isElite) {
          const storedElites = localStorage.getItem('qms_elite_lessons') || '[]';
          const elites = JSON.parse(storedElites);
          const newElite = {
            id: `${randomTeacher.id}_w${evaluationWeek}`,
            teacherName: randomTeacher.fullName,
            grade: randomTeacher.grade,
            weekNumber: evaluationWeek,
            title: `Kế hoạch bài dạy Tuần ${evaluationWeek} - môn học mẫu mực`,
            fileUrl: '#',
            rating: bghRating,
            feedback: bghFeedback
          };
          if (!elites.some((e: any) => e.id === newElite.id)) {
            elites.push(newElite);
            localStorage.setItem('qms_elite_lessons', JSON.stringify(elites));
          }
        }
        
        showToast(`Đã lưu kết quả kiểm duyệt và đánh giá thi đua cho giáo viên ${randomTeacher.fullName} thành công! (Tuần ${evaluationWeek})`, 'success');
        setRandomTeacher(null);
        
        // Cập nhật demo history
        const newHistoryItem: EvaluationHistoryItem = {
          weekNumber: evaluationWeek,
          rating: bghRating,
          feedback: bghFeedback,
          updatedAt: new Date().toISOString(),
          teacherName: randomTeacher.fullName,
          teacherGrade: randomTeacher.grade,
          teacherEmail: randomTeacher.email,
          teacherNote: 'Đã hoàn thành nộp bài',
          eliteFileName: isElite ? (selectedEliteFiles[0]?.name || 'KHBD.docx') : null,
          eliteFileUrl: isElite ? '#' : null,
        };
        setEvaluationHistoryList(prev => [newHistoryItem, ...prev]);
      }, 1000);
    }
  };

  // Hàm in báo cáo kết quả đánh giá thi đua chuyên môn của BGH
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Vui lòng cho phép trình duyệt mở tab mới để thực hiện in!', 'warning');
      return;
    }

    const dataToPrint = filteredHistoryList;
    if (dataToPrint.length === 0) {
      showToast('Không có dữ liệu phù hợp để in báo cáo!', 'warning');
      return;
    }

    const gradeText = historyGradeFilter === 'all' ? 'TẤT CẢ CÁC KHỐI' : historyGradeFilter.toUpperCase();
    const ratingText = historyRatingFilter === 'all' ? 'TẤT CẢ CÁC MỨC XẾP LOẠI' : historyRatingFilter.toUpperCase();
    const searchText = historySearchTerm ? ` - Từ khóa: "${historySearchTerm}"` : '';

    const htmlContent = `
      <html>
        <head>
          <title>Báo cáo đánh giá thi đua chuyên môn giáo viên</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm 15mm 20mm; }
            body { font-family: "Times New Roman", Times, serif; font-size: 13px; line-height: 1.4; color: #000; margin: 0; padding: 0; }
            .header-table { width: 100%; border: none; margin-bottom: 25px; border-collapse: collapse; }
            .header-table td { border: none; padding: 0; vertical-align: top; }
            .left-header { text-align: center; width: 45%; font-size: 12px; }
            .right-header { text-align: center; width: 55%; font-size: 12px; }
            .title { text-align: center; font-weight: bold; font-size: 15px; margin: 25px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { text-align: center; font-style: italic; margin-bottom: 20px; font-size: 12px; }
            .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .report-table th, .report-table td { border: 1px solid #000; padding: 7px 5px; text-align: left; vertical-align: top; }
            .report-table th { text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 12px; text-transform: uppercase; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .signature-section { width: 100%; margin-top: 40px; border: none; border-collapse: collapse; page-break-inside: avoid; }
            .signature-section td { border: none; padding: 0; text-align: center; width: 50%; vertical-align: top; }
            .signature-title { font-weight: bold; margin-bottom: 70px; text-transform: uppercase; font-size: 12px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="left-header">
                <div style="font-weight: bold; text-transform: uppercase;">TRƯỜNG TIỂU HỌC QUẢ LÀ ĐƯỢC</div>
                <div style="font-weight: bold; text-transform: uppercase; text-decoration: underline;">BAN GIÁM HIỆU</div>
              </td>
              <td class="right-header">
                <div style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style="font-weight: bold; text-decoration: underline; text-underline-offset: 4px;">Độc lập - Tự do - Hạnh phúc</div>
                <div style="margin-top: 6px; font-style: italic;">Lâm Đồng, Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
              </td>
            </tr>
          </table>

          <div class="title">
            BÁO CÁO KẾT QUẢ ĐÁNH GIÁ THI ĐUA CHUYÊN MÔN GIÁO VIÊN
          </div>
          <div class="subtitle">
            (Thời điểm lập báo cáo: Tuần ${getCurrentWeek(schoolStartDate)} | Khối: ${gradeText} | Đánh giá: ${ratingText}${searchText})
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 8%;" class="text-center">Tuần</th>
                <th style="width: 22%;">Họ và Tên Giáo viên</th>
                <th style="width: 12%;" class="text-center">Khối lớp</th>
                <th style="width: 14%;" class="text-center">Xếp loại</th>
                <th>Nội dung nhận xét chi tiết của BGH</th>
                <th style="width: 22%;">Học liệu mẫu mực (Vinh danh)</th>
              </tr>
            </thead>
            <tbody>
              ${dataToPrint.map(item => `
                <tr>
                  <td class="text-center font-bold">Tuần ${item.weekNumber}</td>
                  <td class="font-bold">${item.teacherName}</td>
                  <td class="text-center">${item.teacherGrade}</td>
                  <td class="text-center font-bold">${item.rating}</td>
                  <td>${item.feedback || '<i>Không có nhận xét chi tiết</i>'}</td>
                  <td>${item.eliteFileName ? item.eliteFileName.split(' | ').map(f => `• ${f}`).join('<br>') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="signature-section">
            <tr>
              <td style="text-align: left; padding-left: 20px;">
                <div style="font-style: italic; font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Nơi nhận:</div>
                <div style="font-size: 11px; line-height: 1.5;">
                  - Chi bộ, BGH (để b/c);<br>
                  - Hội đồng Thi đua Khen thưởng;<br>
                  - Lưu VT, Hồ sơ chuyên môn.
                </div>
              </td>
              <td>
                <div class="signature-title">TM. BAN GIÁM HIỆU</div>
                <div style="font-style: italic; font-size: 11px; margin-top: -65px; margin-bottom: 50px;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">${user.fullName}</div>
              </td>
            </tr>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Lọc lịch sử nhận xét đánh giá của BGH
  const filteredHistoryList = evaluationHistoryList.filter(item => {
    const searchMatch = 
      item.teacherName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      item.teacherEmail.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      (item.feedback || '').toLowerCase().includes(historySearchTerm.toLowerCase());

    const gradeMatch = historyGradeFilter === 'all' ? true : item.teacherGrade === historyGradeFilter;
    const ratingMatch = historyRatingFilter === 'all' ? true : item.rating === historyRatingFilter;

    return searchMatch && gradeMatch && ratingMatch;
  });

  const criteriaDetails = [
    { key: 'muc_tiêu', label: '1. Xây dựng mục tiêu bài học (Kiến thức, năng lực, phẩm chất)' },
    { key: 'hoat_dong', label: '2. Chuỗi các hoạt động học tập của học sinh' },
    { key: 'phuong_phap', label: '3. Phương pháp giảng dạy chuyên môn của giáo viên' },
    { key: 'thiet_bi', label: '4. Thiết bị dạy học và học liệu sư phạm sử dụng' },
    { key: 'danh_gia', label: '5. Phương án kiểm tra, đánh giá kết quả hoạt động' },
    { key: 'trinh_bay', label: '6. Trình bày khoa học, phần điều chỉnh thực tế sâu sắc' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER - OLM Style */}
      <header className="relative z-10 bg-brand-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
              Q
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-white leading-none">QMS-EDU</div>
            <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-0.5">Ban Giám Hiệu Workspace</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">Thành viên BGH: {user.fullName}</div>
            <div className="text-[10px] text-indigo-100 font-bold bg-white/10 px-2.5 py-0.5 rounded-full inline-block mt-0.5 shadow-sm">
              Đặc quyền: Tổng thanh tra toàn trường
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('qms_view_mode', 'landing');
              window.location.href = '/dashboard';
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            🏠 Quay lại trang chủ
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white cursor-pointer btn-interactive"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* TABS NAVIGATION BAR (Style Wow Design) */}
      <nav className="bg-white border-b border-slate-200 px-6 py-2.5 flex gap-2 shadow-sm">
        <button
          onClick={() => setActiveTab('evaluate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'evaluate'
              ? 'bg-brand-primary-light/50 text-brand-primary'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          🔍 Đánh giá & Khảo sát ngẫu nhiên
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            loadEvaluationHistory();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-brand-primary-light/50 text-brand-primary'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          📜 Nhật ký Đánh giá Thi đua
        </button>
      </nav>

      {/* TAB 1: EVALUATION (ĐÁNH GIÁ CHẤT LƯỢNG) */}
      {activeTab === 'evaluate' && (
        <>
          {/* SUB HEADER - WEEK & GRADE FILTER */}
          <div className="bg-white border-b border-slate-200/80 px-6 py-3 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Chọn Tuần học:</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedWeek(val === 'all' ? 'all' : Number(val));
                    setRandomTeacher(null);
                    setSaveSuccess(false);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-brand-primary cursor-pointer shadow-sm"
                >
                  <option value="all">Tất cả các tuần</option>
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>Tuần {w}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Chọn Khối khảo sát:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setRandomTeacher(null);
                    setSaveSuccess(false);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-brand-primary cursor-pointer shadow-sm"
                >
                  <option value="all">Tất cả các khối</option>
                  <option value="Khối 1">Khối 1</option>
                  <option value="Khối 2">Khối 2</option>
                  <option value="Khối 3">Khối 3</option>
                  <option value="Khối 4">Khối 4</option>
                  <option value="Khối 5">Khối 5</option>
                  <option value="Bộ môn đặc thù">Bộ môn đặc thù</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/dashboard/library'}
              className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold shadow transition-all active:scale-[0.98] cursor-pointer btn-interactive"
            >
              🏆 Kho Học Liệu Vàng toàn trường
            </button>
          </div>

          {/* MAIN CONTENT */}
          <main className="flex-grow p-4 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* CỘT TRÁI (Lg: 5/12): Dashboard Thống kê và Nút rút ngẫu nhiên */}
            <section className="lg:col-span-5 space-y-6">
              
              {/* Card Lấy Mẫu Ngẫu Nhiên */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-4">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  🎯 Cơ Chế Chọn Mẫu Ngẫu Nhiên
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  BGH không duyệt tuần tự. Hệ thống tự động chọn ngẫu nhiên một giáo viên thuộc Khối đã nộp đầy đủ hồ sơ ở Tuần {selectedWeek === 'all' ? currentWeek : selectedWeek} để thanh tra chất lượng.
                </p>

                <button
                  onClick={handleRandomSampling}
                  disabled={isSampling}
                  className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] shadow shadow-indigo-600/5 cursor-pointer btn-interactive"
                >
                  {isSampling ? '🔄 Đang bốc thăm ngẫu nhiên...' : '🎰 Chọn Ngẫu Nhiên Giáo Viên'}
                </button>
              </div>

              {/* Bảng Danh Sách Giáo Viên Trong Khối */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-4">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                  📋 Danh sách Giáo viên {selectedGrade === 'all' ? 'Tất cả các khối' : selectedGrade}
                </h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredTeachers.map(t => {
                    const isSelected = randomTeacher?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTeacherManual(t)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.99] group ${
                          isSelected
                            ? 'border-brand-primary bg-brand-primary-light/10 shadow-sm ring-1 ring-brand-primary'
                            : 'border-slate-300 bg-slate-50/50 hover:bg-white hover:border-brand-primary/45 hover:shadow-sm'
                        }`}
                      >
                        <div>
                          <div className={`font-bold transition-colors ${isSelected ? 'text-brand-primary' : 'text-slate-800 group-hover:text-brand-primary'}`}>{t.fullName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{t.email}</div>
                        </div>
                        {isSelected ? (
                          <span className="px-2.5 py-0.5 bg-brand-primary text-white rounded-full font-black text-[9px] uppercase tracking-wider animate-pulse">
                            👉 Đang chọn
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-bold text-[9px] uppercase tracking-wider group-hover:bg-brand-primary-light group-hover:text-brand-primary group-hover:border-brand-primary-light transition-colors">
                            Chọn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>

            {/* CỘT PHẢI (Lg: 7/12): Form Đánh Giá Chi Tiết Theo Tiêu Chí */}
            <section className="lg:col-span-7">
              
              {!randomTeacher ? (
                <div className="h-full min-h-[320px] border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-white shadow-sm space-y-4">
                  <div className="text-6xl animate-pulse">🎰</div>
                  <h3 className="text-slate-800 font-black text-xs sm:text-sm uppercase">Chưa chọn mẫu giáo viên khảo sát</h3>
                  <p className="text-slate-500 text-xs max-w-sm font-medium">
                    Vui lòng click vào nút **"🎰 Chọn Ngẫu Nhiên Giáo Viên"** ở cột bên trái hoặc nhấp chọn một giáo viên trực tiếp từ danh sách để tiến hành đánh giá chuyên môn.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200/80 bg-white rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 animate-fade-in">
                  
                  {/* Header profile giáo viên được chọn */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-brand-primary bg-brand-primary-light/40 border border-brand-primary-light px-2 py-0.5 rounded-full uppercase">
                        Hồ sơ được chọn
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-base leading-tight mt-1">{randomTeacher.fullName}</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Email: {randomTeacher.email} | Khối: {randomTeacher.grade}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Tuần khảo sát</div>
                      <div className="text-xl font-black text-brand-primary">Tuần {selectedWeek === 'all' ? currentWeek : selectedWeek}</div>
                    </div>
                  </div>

                  {/* DANH SÁCH FILE NỘP ĐỂ ĐỌC TRỰC TUYẾN */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      📄 Học liệu quét được trên Drive của Giáo viên:
                    </h4>

                    {loadingFiles ? (
                      <div className="text-center py-6 text-slate-400 text-xs font-medium">
                        <span className="animate-spin inline-block mr-1">🔄</span> Đang tìm kiếm tệp tin từ Drive trường...
                      </div>
                    ) : scannedFiles.length === 0 ? (
                      <div className="p-5 text-center bg-rose-50/40 border border-rose-100 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1.5">
                          🚨 Giáo viên chưa nộp học liệu nào!
                        </div>
                        <p className="text-[10px] text-slate-450">Thư mục Drive của giáo viên này tuần hiện tại đang trống hoàn toàn.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Banner Cảnh báo Nộp thiếu học liệu nếu thiếu file */}
                        {scannedFiles.length < 4 && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-[10px] text-orange-650 font-bold flex items-center gap-1.5 animate-pulse">
                            ⚠️ Cảnh báo: Giáo viên nộp thiếu học liệu! (Chỉ quét thấy {scannedFiles.length} tệp tin, tối thiểu cần 4 tệp).
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                          {scannedFiles.map((file, idx) => {
                            const isVinhDanh = selectedEliteFiles.some(f => f.name === file.name);
                            return (
                              <div key={idx} className="flex justify-between items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-350 hover:bg-white transition-all shadow-sm">
                                <div className="truncate flex-grow font-semibold">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline truncate block"
                                    title={file.name}
                                  >
                                    📄 {file.name}
                                  </a>
                                  <span className="text-[8px] text-slate-400 block mt-0.5 uppercase tracking-wider">{file.type} • {file.uploadedAt}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleEliteFile(file)}
                                  className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all shrink-0 shadow-sm active:scale-90 ${
                                    isVinhDanh
                                      ? 'bg-amber-500 border-amber-600 text-white font-black'
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-650'
                                  }`}
                                  title={isVinhDanh ? "Bỏ vinh danh" : "Vinh danh Học liệu vàng"}
                                >
                                  🏆 {isVinhDanh ? 'Vinh danh!' : 'Vinh danh'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FORM ĐÁNH GIÁ CHẤT LƯỢNG */}
                  <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-4 border-t border-slate-200/80">
                    
                    {/* Các tiêu chí đánh giá giáo án */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-black text-slate-550 uppercase tracking-wider">
                        📊 Đánh giá chất lượng giáo án theo tiêu chí chuyên môn:
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {criteriaDetails.map(c => {
                          const currentVal = criteriaRatings[c.key] || EVALUATION_LEVELS.DAT;
                          return (
                            <div key={c.key} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                              <label className="text-[10px] font-bold text-slate-650 leading-normal block">
                                {c.label}
                              </label>
                              <div className="flex gap-1">
                                {Object.values(EVALUATION_LEVELS).map(lvl => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setCriteriaRatings(prev => ({ ...prev, [c.key]: lvl }))}
                                    className={`flex-grow py-1 rounded-lg text-[9px] font-black border transition-all cursor-pointer active:scale-95 ${
                                      currentVal === lvl
                                        ? EVALUATION_COLORS[lvl as keyof typeof EVALUATION_COLORS]
                                        : 'border-slate-200 bg-white text-slate-450 hover:border-slate-350'
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-3 border-t border-slate-100">
                      
                      {/* Xếp loại chất lượng chung */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-500 uppercase">
                          Xếp loại chất lượng giáo án
                        </label>
                        <div className="flex gap-1">
                          {Object.values(EVALUATION_LEVELS).map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setBghRating(lvl)}
                              className={`flex-grow py-2 rounded-xl text-xs font-black border transition-all cursor-pointer btn-interactive ${
                                bghRating === lvl
                                  ? EVALUATION_COLORS[lvl as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                       {/* Vinh danh học liệu vàng (Tích xanh) */}
                       <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-between">
                         <div>
                           <h5 className="text-xs font-bold text-slate-800">Bài học mẫu mực</h5>
                           <p className="text-[10px] text-slate-400 mt-0.5">
                             {selectedEliteFiles.length > 0
                               ? `Đang vinh danh: ${selectedEliteFiles.length} tệp tin đã chọn`
                               : 'Tích chọn các nút 🏆 Vinh danh ở danh sách tệp bên trên'}
                           </p>
                         </div>
                         <input
                           type="checkbox"
                           checked={isElite}
                           onChange={e => {
                             setIsElite(e.target.checked);
                             if (!e.target.checked) {
                               setSelectedEliteFiles([]);
                             } else if (selectedEliteFiles.length === 0 && scannedFiles.length > 0) {
                               const firstKhbd = scannedFiles.find(f => f.type === FILE_TYPES.KHBD);
                               if (firstKhbd) setSelectedEliteFiles([firstKhbd]);
                             }
                           }}
                           className="h-5 w-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                         />
                       </div>
                    </div>

                    {/* Ý kiến nhận xét / Đóng góp ý kiến */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-500 uppercase">
                        Góp ý / Nhận xét của Ban Giám Hiệu gửi riêng
                      </label>
                      <textarea
                        rows={4}
                        value={bghFeedback}
                        onChange={e => setBghFeedback(e.target.value)}
                        placeholder="Nhập ghi chú nhận xét chi tiết (không bắt buộc, có thể để trống)..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
                      />
                    </div>

                    {/* Nút lưu đánh giá */}
                    <div className="pt-4 border-t border-slate-300 flex justify-end gap-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-black cursor-pointer transition-all active:scale-[0.98] shadow shadow-indigo-600/5 btn-interactive"
                      >
                        {isSaving ? 'Đang lưu đánh giá...' : 'Lưu kết quả đánh giá'}
                      </button>
                    </div>

                  </form>

                </div>
              )}

            </section>

          </main>
        </>
      )}

      {/* TAB 2: HISTORY (NHẬT KÝ ĐÁNH GIÁ THI ĐUA) */}
      {activeTab === 'history' && (
        <main className="flex-grow p-6 max-w-6xl w-full mx-auto space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
            
            {/* Header tab history */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  📜 Nhật Ký Đánh Giá Thi Đua (Ban Giám Hiệu)
                </h2>
                <p className="text-[10px] text-slate-450">
                  Lịch sử ghi nhận toàn bộ kết quả thanh tra chất lượng giáo án và nhận xét thi đua sư phạm đã diễn ra.
                </p>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Tìm tên giáo viên, nhận xét..."
                  value={historySearchTerm}
                  onChange={e => setHistorySearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors w-full sm:w-48 shadow-sm"
                />

                {/* Grade filter */}
                <select
                  value={historyGradeFilter}
                  onChange={e => setHistoryGradeFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary shadow-sm"
                >
                  <option value="all">Tất cả các khối</option>
                  <option value="Khối 1">Khối 1</option>
                  <option value="Khối 2">Khối 2</option>
                  <option value="Khối 3">Khối 3</option>
                  <option value="Khối 4">Khối 4</option>
                  <option value="Khối 5">Khối 5</option>
                  <option value="Bộ môn đặc thù">Bộ môn đặc thù</option>
                </select>

                {/* Rating filter */}
                <select
                  value={historyRatingFilter}
                  onChange={e => setHistoryRatingFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary shadow-sm"
                >
                  <option value="all">Tất cả mức đánh giá</option>
                  {Object.values(EVALUATION_LEVELS).map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>

                <button
                  onClick={loadEvaluationHistory}
                  disabled={loadingHistory}
                  className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg active:scale-95 transition-all shadow-sm cursor-pointer text-xs"
                  title="Tải lại lịch sử"
                >
                  🔄 Tải lại
                </button>

                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold active:scale-[0.97] transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  title="In báo cáo chi tiết theo bộ lọc hiện tại"
                >
                  🖨️ In Báo Cáo
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-4">Tuần</th>
                    <th className="p-4">Giáo viên / Khối</th>
                    <th className="p-4">Đánh giá thi đua</th>
                    <th className="p-4">Ý kiến nhận xét chi tiết</th>
                    <th className="p-4">Học liệu mẫu mực</th>
                    <th className="p-4 text-right">Ngày đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                        <span className="inline-block animate-spin mr-2">🔄</span> Đang tải nhật ký đánh giá chất lượng...
                      </td>
                    </tr>
                  ) : filteredHistoryList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 font-medium bg-slate-50/50">
                        📭 Không có dữ liệu lịch sử đánh giá nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryList.map((item, idx) => {
                      const formattedDate = new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-black text-brand-primary text-sm">Tuần {item.weekNumber}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{item.teacherName}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">{item.teacherGrade}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${EVALUATION_COLORS[item.rating as keyof typeof EVALUATION_COLORS]}`}>
                              {item.rating}
                            </span>
                          </td>
                          <td className="p-4 max-w-xs truncate font-medium text-slate-650" title={item.feedback}>
                            {item.feedback || <span className="text-slate-400 italic">Không có nhận xét chi tiết</span>}
                          </td>
                          <td className="p-4">
                            {item.eliteFileName ? (
                              <div className="space-y-1">
                                {item.eliteFileName.split(' | ').map((name, fIdx) => {
                                  const urls = item.eliteFileUrl?.split(' | ') || [];
                                  const url = urls[fIdx] || '#';
                                  return (
                                    <a
                                      key={fIdx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-amber-600 font-bold hover:underline block truncate max-w-[150px] bg-amber-50/60 border border-amber-200 px-2 py-0.5 rounded text-[9px]"
                                      title={name}
                                    >
                                      🏆 {name}
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right text-[10px] text-slate-450 font-bold">{formattedDate}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </main>
      )}

    </div>
  );
}
