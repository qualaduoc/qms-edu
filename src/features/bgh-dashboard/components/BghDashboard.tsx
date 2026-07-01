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

export default function BghDashboard({ user, onLogout }: BghDashboardProps) {
  const { showToast } = useToast();
  const schoolStartDate = '2026-09-01';
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;
  
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

  useEffect(() => {
    if (isReal) {
      loadRealTeachers();
    } else {
      // Mock teachers list cho demo mode
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

      // Nếu chạy thật -> quét Drive của giáo viên được bốc trúng
      if (isReal) {
        await loadTeacherRealFiles(chosenTeacher.id);
      } else {
        // Mock files của giáo viên bốc thăm trúng ở demo mode
        setScannedFiles([
          { name: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_${chosenTeacher.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHBD, url: '#', uploadedAt: '2026-09-12' },
          { name: `KHGD_Tuan${String(selectedWeek).padStart(2, '0')}_${chosenTeacher.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHGD, url: '#', uploadedAt: '2026-09-12' },
        ]);
      }
    }, 1200);
  };

  // Bấm chọn thủ công giáo viên từ danh sách
  const handleSelectTeacherManual = async (teacher: TeacherMockData) => {
    setRandomTeacher(teacher);
    setSaveSuccess(false);
    setScannedFiles([]);
    
    // Reset form đánh giá về trạng thái mặc định
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

    // Nếu chạy thật -> quét Drive của giáo viên được chọn
    if (isReal) {
      await loadTeacherRealFiles(teacher.id);
    } else {
      const weekLabel = selectedWeek === 'all' ? currentWeek : selectedWeek;
      const weekStr = String(weekLabel).padStart(2, '0');
      setScannedFiles([
        { name: `KHBD_Tuan${weekStr}_${teacher.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHBD, url: '#', uploadedAt: '2026-09-12' },
        { name: `KHGD_Tuan${weekStr}_${teacher.fullName.replace(/\s+/g, '')}.docx`, type: FILE_TYPES.KHGD, url: '#', uploadedAt: '2026-09-12' },
      ]);
    }
    
    const weekDisplay = selectedWeek === 'all' ? `Tất cả các tuần (đánh giá tuần ${currentWeek})` : `Tuần ${selectedWeek}`;
    showToast(`Đã chọn Thầy/Cô ${teacher.fullName} để đánh giá chất lượng ${weekDisplay}.`, 'info');
  };
  const handleToggleEliteFile = (file: TeacherFile) => {
    setSelectedEliteFiles(prev => {
      const exists = prev.some(f => f.name === file.name);
      let updated: TeacherFile[] = [];
      if (exists) {
        updated = prev.filter(f => f.name !== file.name);
        showToast(`Đã hủy chọn tệp tin: ${file.name}`, 'info');
      } else {
        updated = [...prev, file];
        showToast(`Đã chọn vinh danh tệp tin: ${file.name}`, 'success');
      }
      
      // Tự động tích chọn checkbox Bài học mẫu mực khi có ít nhất 1 file được chọn vinh danh
      setIsElite(updated.length > 0);
      return updated;
    });
  };
  // Lưu nhận xét thi đua thật vào database
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!randomTeacher) return;

    setIsSaving(true);
    const evaluationWeek = selectedWeek === 'all' ? currentWeek : selectedWeek;
    
    if (isReal && user.id) {
      try {
        // Tên file và link Drive được ghép cách nhau bằng ký tự " | " để lưu nhiều file
        let eliteFileName = null;
        let eliteFileUrl = null;

        if (selectedEliteFiles.length > 0) {
          eliteFileName = selectedEliteFiles.map(f => f.name).join(' | ');
          eliteFileUrl = selectedEliteFiles.map(f => f.url).join(' | ');
        } else if (isElite) {
          // Fallback nếu BGH check checkbox mà quên click nút chọn cụ thể ở trên
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

        // Nếu được tích xanh "Bài học mẫu mực" -> vinh danh vào Kho học liệu vàng
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
      }, 1000);
    }
  };

  // Danh sách các tiêu chí đánh giá
  const CRITERIA = [
    { key: 'muc_tiêu', label: '1. Mục tiêu bài dạy (Kiến thức, năng lực, phẩm chất)' },
    { key: 'hoat_dong', label: '2. Tiến trình và chuỗi hoạt động học của học sinh' },
    { key: 'phuong_phap', label: '3. Phương pháp, kĩ thuật dạy học tích cực áp dụng' },
    { key: 'thiet_bi', label: '4. Thiết bị dạy học và học liệu sử dụng phù hợp' },
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
                        : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-primary/45 hover:shadow-sm'
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
                Vui lòng click vào nút **"🎰 Chọn Ngẫu Nhiên Giáo Viên"** ở cột bên trái để chọn ra một hồ sơ ngẫu nhiên và tiến hành đánh giá chuyên môn.
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
                  <h3 className="text-lg font-black text-slate-800">{randomTeacher.fullName}</h3>
                  <div className="text-xs text-slate-500 font-medium">Khối dạy: {randomTeacher.grade} | Email: {randomTeacher.email}</div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tuần thanh tra</div>
                  <div className="text-base font-black text-brand-primary">Tuần học {selectedWeek === 'all' ? `${currentWeek} (Hiện tại)` : selectedWeek}</div>
                </div>
              </div>

              {/* Danh sách các file nộp thật quét từ Drive */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Học liệu thật trên Drive của giáo viên
                </h4>
                {loadingFiles ? (
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-500 text-center animate-pulse">
                    🔄 Đang quét trực tiếp Google Drive của giáo viên...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Banner thông báo trạng thái nộp bài của Giáo viên */}
                    {(() => {
                      const khbdCount = scannedFiles.filter(f => f.type === FILE_TYPES.KHBD).length;
                      const dctdCount = scannedFiles.filter(f => f.type === FILE_TYPES.DCTD).length;
                      const khgdCount = scannedFiles.filter(f => f.type === FILE_TYPES.KHGD).length;

                      if (scannedFiles.length === 0) {
                        return (
                          <div className="p-4 rounded-2xl border border-red-205 bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-pulse">
                            <span className="text-base">🚨</span>
                            <div>
                              <div className="font-black uppercase">Giáo viên chưa nộp học liệu nào!</div>
                              <div className="text-[10px] text-red-500 font-medium mt-0.5">Không tìm thấy bất kỳ file nào trong thư mục tuần trên Google Drive.</div>
                            </div>
                          </div>
                        );
                      }

                      // Cảnh báo nộp thiếu file (Quy chuẩn tối thiểu: 2 file KHBD, 1 file DCTD)
                      const isMissing = khbdCount < 2 || dctdCount < 1;
                      if (isMissing) {
                        return (
                          <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50 text-orange-850 text-xs font-bold flex items-center gap-2.5 shadow-sm">
                            <span className="text-base">⚠️</span>
                            <div>
                              <div className="font-black uppercase">Cảnh báo: Giáo viên nộp thiếu học liệu!</div>
                              <div className="text-[10px] text-orange-600 font-medium mt-0.5">
                                Đã nộp: <strong className="text-orange-800">{khbdCount}/2 KHBD</strong> (Giáo án) và <strong className="text-orange-800">{dctdCount}/1 DCTD</strong> (Điều chỉnh).
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-emerald-850 text-xs font-bold flex items-center gap-2.5 shadow-sm">
                          <span className="text-base">✓</span>
                          <div>
                            <div className="font-black uppercase text-emerald-800">Đã nộp đủ học liệu quy định</div>
                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Đồng bộ đầy đủ: {khbdCount}/2 KHBD, {dctdCount}/1 DCTD, {khgdCount} KHGD.</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Danh sách các file thật nếu có */}
                    {scannedFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {scannedFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs hover:border-brand-primary/30 transition-all">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary hover:underline font-bold truncate max-w-[200px]"
                            >
                              📄 {file.name}
                            </a>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-bold text-brand-primary bg-brand-primary-light/40 border border-brand-primary-light px-1.5 py-0.5 rounded uppercase shrink-0">
                                {file.type}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleEliteFile(file)}
                                className={`px-2 py-1 rounded text-[9px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                                  selectedEliteFiles.some(f => f.name === file.name)
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                    : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                                }`}
                              >
                                🏆 {selectedEliteFiles.some(f => f.name === file.name) ? 'Học liệu vàng' : 'Vinh danh'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form đánh giá các tiêu chí */}
              <form onSubmit={handleSaveEvaluation} className="space-y-6">
                
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Đánh giá chi tiết theo 6 tiêu chí quy định
                  </h4>
                  
                  <div className="space-y-2.5">
                    {CRITERIA.map(item => (
                      <div key={item.key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                        <span className="font-bold text-slate-700 max-w-md leading-relaxed">{item.label}</span>
                        <div className="flex gap-1 shrink-0">
                          {Object.values(EVALUATION_LEVELS).map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setCriteriaRatings(prev => ({ ...prev, [item.key]: lvl }))}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer btn-interactive ${
                                criteriaRatings[item.key] === lvl
                                  ? EVALUATION_COLORS[lvl as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Xếp Loại Tổng Hợp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
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
                   <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
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
                           // Tự động tìm file KHBD đầu tiên làm mặc định nếu Khầy tick mà chưa chọn ở trên
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
                    placeholder="Nhập ghi chú nhận xét chi tiết (ví dụ: cần tăng tính sáng tạo ở hoạt động nhóm, cấu trúc bài dạy chuẩn chỉ...)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
                  />
                </div>

                {/* Nút lưu đánh giá */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
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

    </div>
  );
}
