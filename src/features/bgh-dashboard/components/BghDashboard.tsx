'use client';

import { useState, useEffect } from 'react';
import { EVALUATION_LEVELS, EVALUATION_COLORS, FILE_TYPES } from '@/constants/roles';
import { getCurrentWeek } from '@/utils/weekCalculator';

interface BghDashboardProps {
  user: {
    fullName: string;
    role: string;
    grade: string;
    status: string;
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

interface MockSubmissionDetail {
  teacherId: string;
  weekNumber: number;
  submittedAt: string | null;
  leadStatus: string;
  bghRating: string | null;
  bghFeedback: string | null;
  isElite: boolean;
  files: Array<{ name: string; url: string; type: string }>;
}

export default function BghDashboard({ user, onLogout }: BghDashboardProps) {
  const schoolStartDate = '2026-09-01';
  const currentWeek = getCurrentWeek(schoolStartDate);
  const totalWeeks = 35;
  
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [selectedGrade, setSelectedGrade] = useState<string>('Khối 1');
  const [randomTeacher, setRandomTeacher] = useState<TeacherMockData | null>(null);
  const [isSampling, setIsSampling] = useState(false);

  // Đánh giá chi tiết
  const [bghRating, setBghRating] = useState<string>(EVALUATION_LEVELS.DAT);
  const [bghFeedback, setBghFeedback] = useState('');
  const [isElite, setIsElite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dữ liệu đánh giá chi tiết theo tiêu chí (lấy từ Tiêu chí đánh giá.docx)
  const [criteriaRatings, setCriteriaRatings] = useState<{ [key: string]: string }>({
    'muc_tiêu': EVALUATION_LEVELS.DAT,
    'hoat_dong': EVALUATION_LEVELS.DAT,
    'phuong_phap': EVALUATION_LEVELS.DAT,
    'thiet_bi': EVALUATION_LEVELS.DAT,
    'danh_gia': EVALUATION_LEVELS.DAT,
    'trinh_bay': EVALUATION_LEVELS.DAT,
  });

  // Tải danh sách giáo viên toàn trường
  const allTeachers: TeacherMockData[] = [
    { id: 't1', fullName: 'Nguyễn Văn An', grade: 'Khối 1', email: 'an.nv@school.edu.vn', submittedCount: 3 },
    { id: 't2', fullName: 'Lê Thị Bình', grade: 'Khối 1', email: 'binh.lt@school.edu.vn', submittedCount: 3 },
    { id: 't3', fullName: 'Phạm Hồng Sơn', grade: 'Khối 1', email: 'son.ph@school.edu.vn', submittedCount: 1 },
    { id: 't4', fullName: 'Trần Thị Diệu', grade: 'Khối 1', email: 'dieu.tt@school.edu.vn', submittedCount: 3 },
    { id: 't5', fullName: 'Hoàng Văn Hùng', grade: 'Khối 2', email: 'hung.vh@school.edu.vn', submittedCount: 3 },
    { id: 't6', fullName: 'Vũ Thị Mai', grade: 'Khối 2', email: 'mai.vt@school.edu.vn', submittedCount: 2 },
    { id: 't7', fullName: 'Đỗ Tiến Đạt', grade: 'Khối 3', email: 'dat.td@school.edu.vn', submittedCount: 3 },
    { id: 't8', fullName: 'Nguyễn Minh Thư', grade: 'Bộ môn đặc thù', email: 'thu.nm@school.edu.vn', submittedCount: 3 },
  ];

  // Lọc giáo viên theo Khối đang chọn
  const filteredTeachers = allTeachers.filter(t => t.grade === selectedGrade);

  // Giả lập lấy mẫu ngẫu nhiên (Random Sampling)
  const handleRandomSampling = () => {
    setIsSampling(true);
    setRandomTeacher(null);
    setSaveSuccess(false);

    setTimeout(() => {
      if (filteredTeachers.length === 0) {
        alert('Khối này chưa có giáo viên nào nộp báo cáo!');
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
      setCriteriaRatings({
        'muc_tiêu': EVALUATION_LEVELS.DAT,
        'hoat_dong': EVALUATION_LEVELS.DAT,
        'phuong_phap': EVALUATION_LEVELS.DAT,
        'thiet_bi': EVALUATION_LEVELS.DAT,
        'danh_gia': EVALUATION_LEVELS.DAT,
        'trinh_bay': EVALUATION_LEVELS.DAT,
      });
    }, 1200);
  };

  // Lưu đánh giá của BGH
  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!randomTeacher) return;
    setIsSaving(true);

    setTimeout(() => {
      // 1. Lưu đánh giá vào localStorage (để mock DB)
      const evaluationDetail: MockSubmissionDetail = {
        teacherId: randomTeacher.id,
        weekNumber: selectedWeek,
        submittedAt: new Date().toISOString(),
        leadStatus: 'verified',
        bghRating: bghRating,
        bghFeedback: bghFeedback,
        isElite: isElite,
        files: [
          { name: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_${randomTeacher.fullName.replace(/\s+/g, '')}.docx`, url: '#', type: FILE_TYPES.KHBD }
        ]
      };

      localStorage.setItem(
        `qms_bgh_eval_${randomTeacher.id}_w${selectedWeek}`,
        JSON.stringify(evaluationDetail)
      );

      // Nếu được chọn vào Kho học liệu vàng, lưu thông tin vào danh sách kho học liệu vàng
      if (isElite) {
        const eliteListStr = localStorage.getItem('qms_elite_library') || '[]';
        const eliteList = JSON.parse(eliteListStr);
        // Tránh trùng lặp
        if (!eliteList.some((item: any) => item.teacherId === randomTeacher.id && item.weekNumber === selectedWeek)) {
          eliteList.push({
            id: `${randomTeacher.id}_w${selectedWeek}`,
            teacherId: randomTeacher.id,
            teacherName: randomTeacher.fullName,
            grade: randomTeacher.grade,
            weekNumber: selectedWeek,
            fileName: `KHBD_Tuan${String(selectedWeek).padStart(2, '0')}_${randomTeacher.fullName.replace(/\s+/g, '')}.docx`,
            url: '#',
            rating: bghRating,
            feedback: bghFeedback,
            selectedAt: new Date().toISOString()
          });
          localStorage.setItem('qms_elite_library', JSON.stringify(eliteList));
        }
      }

      setIsSaving(false);
      setSaveSuccess(true);
      
      // Thông báo realtime gửi thẳng cho giáo viên đó
      alert(`[Realtime Notification] Kết quả đánh giá đã được gửi trực tiếp đến Thầy/Cô ${randomTeacher.fullName}. Hệ thống bảo mật: Khối trưởng và giáo viên khác không thể xem.`);
    }, 1000);
  };

  const handleCriteriaChange = (key: string, value: string) => {
    setCriteriaRatings(prev => {
      const next = { ...prev, [key]: value };
      
      // Tự động tính toán mức đánh giá chung dựa vào điểm tiêu chí
      // Ví dụ: Nếu có >= 1 tiêu chí Chưa đạt -> Chưa đạt. Nếu có >= 4 tiêu chí Xuất sắc và ko có Đạt/Chưa đạt -> Xuất sắc.
      const values = Object.values(next);
      if (values.includes(EVALUATION_LEVELS.CHUA_DAT)) {
        setBghRating(EVALUATION_LEVELS.CHUA_DAT);
      } else if (values.filter(v => v === EVALUATION_LEVELS.XUAT_SAC).length >= 4 && !values.includes(EVALUATION_LEVELS.DAT)) {
        setBghRating(EVALUATION_LEVELS.XUAT_SAC);
      } else if (values.filter(v => v === EVALUATION_LEVELS.TOT || v === EVALUATION_LEVELS.XUAT_SAC).length >= 4) {
        setBghRating(EVALUATION_LEVELS.TOT);
      } else {
        setBghRating(EVALUATION_LEVELS.DAT);
      }

      return next;
    });
  };

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
            <div className="text-xs font-bold text-slate-200">Đăng nhập: {user.fullName}</div>
            <div className="text-[10px] text-orange-500 font-semibold font-black tracking-wider uppercase">BAN GIÁM HIỆU</div>
          </div>
          
          <button
            onClick={() => window.location.href = '/dashboard/library'}
            className="px-3.5 py-2 border border-orange-500/30 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            🏆 Kho Học Liệu Vàng
          </button>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <div className="flex-grow flex flex-col lg:flex-row">
        
        {/* PANEL TRÁI: Thống kê & chọn khối nộp báo cáo */}
        <aside className="w-full lg:w-80 border-r border-slate-900 bg-slate-950/40 p-6 shrink-0 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chọn Tuần đánh giá
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(Number(e.target.value));
                setRandomTeacher(null);
                setSaveSuccess(false);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3 text-xs text-slate-200 focus:outline-none"
            >
              {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map(w => (
                <option key={w} value={w}>Tuần học số {w}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bộ lọc Khối giảng dạy
            </div>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {['Khối 1', 'Khối 2', 'Khối 3', 'Khối 4', 'Khối 5', 'Bộ môn đặc thù'].map((grade) => (
                <button
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade);
                    setRandomTeacher(null);
                    setSaveSuccess(false);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                    selectedGrade === grade
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-slate-900/60 bg-slate-900/10 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{grade}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-500">
                    {allTeachers.filter(t => t.grade === grade).length} GV
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* NHẶT MẪU NGẪU NHIÊN BUTTON */}
          <div className="pt-4 border-t border-slate-900 space-y-3">
            <div className="text-[10px] text-slate-500 leading-normal">
              BGH có thể chọn một khối bất kỳ, sau đó click "Nhặt ngẫu nhiên" để hệ thống tự động bốc thăm ngẫu nhiên 1 giáo viên trong khối đó để BGH duyệt, kiểm tra chất lượng giảng dạy.
            </div>
            
            <button
              onClick={handleRandomSampling}
              disabled={isSampling}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-xl py-3.5 font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-orange-500/10 text-xs flex items-center justify-center gap-2"
            >
              {isSampling ? '⏳ Đang bốc thăm...' : '🎲 Nhặt mẫu ngẫu nhiên'}
            </button>
          </div>
        </aside>

        {/* PANEL PHẢI: Khung kiểm duyệt & Đánh giá chi tiết */}
        <main className="flex-grow p-6 lg:p-10 space-y-6">
          
          {!randomTeacher ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-900 rounded-2xl bg-slate-900/5 min-h-[400px]">
              <div className="text-6xl mb-4">🎲</div>
              <h3 className="text-base font-bold text-slate-300">Chưa chọn mẫu giáo viên</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                Vui lòng chọn Khối ở thanh bên trái và bấm <strong>"Nhặt mẫu ngẫu nhiên"</strong> để bắt đầu quy trình bốc thăm kiểm tra chất lượng giáo án của nhà trường.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in max-w-4xl">
              
              {/* THÔNG TIN MẪU ĐƯỢC CHỌN */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Mẫu kiểm tra ngẫu nhiên</div>
                  <h2 className="text-xl font-black">{randomTeacher.fullName}</h2>
                  <p className="text-xs text-slate-400">
                    Phân công giảng dạy: <strong>{randomTeacher.grade}</strong> | Tuần kiểm tra: <strong>Tuần {selectedWeek}</strong>
                  </p>
                </div>
                
                {/* File Link giả định */}
                <div className="flex gap-2">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Đang mở file Word trực tiếp từ Google Drive của giáo viên...'); }}
                    className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    📎 Xem file Giáo án (KHBD)
                  </a>
                </div>
              </div>

              {saveSuccess ? (
                <div className="p-6 rounded-2xl border border-green-500/20 bg-green-500/5 space-y-4 text-center">
                  <div className="text-4xl">✓</div>
                  <h3 className="text-lg font-bold text-green-400">Lưu đánh giá thành công!</h3>
                  <p className="text-xs text-slate-400">
                    Nhận xét của BGH đã được mã hóa riêng tư và chuyển thẳng đến hòm thư thông báo của giáo viên <strong>{randomTeacher.fullName}</strong>.
                  </p>
                  <button
                    onClick={handleRandomSampling}
                    className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all"
                  >
                    Tiếp tục nhặt ngẫu nhiên giáo viên khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveEvaluation} className="space-y-6">
                  
                  {/* BẢNG ĐÁNH GIÁ CHI TIẾT THEO TIÊU CHÍ (TỪ FILE WORD) */}
                  <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      📝 Tiêu chí đánh giá chất lượng Kế hoạch bài dạy
                    </h3>
                    
                    <div className="space-y-3.5 pt-2">
                      
                      {/* Tiêu chí 1 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 gap-4">
                        <div className="max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">1. Xác định Mục tiêu bài học</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Đúng yêu cầu chương trình, rõ năng lực, phẩm chất, có thể đo lường được.</p>
                        </div>
                        <div className="flex gap-1">
                          {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleCriteriaChange('muc_tiêu', level)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                criteriaRatings['muc_tiêu'] === level
                                  ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-800 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tiêu chí 2 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 gap-4">
                        <div className="max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">2. Thiết kế Hoạt động học</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Chuỗi hoạt động logic, đa dạng, sáng tạo, phát huy tính tích cực của học sinh.</p>
                        </div>
                        <div className="flex gap-1">
                          {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleCriteriaChange('hoat_dong', level)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                criteriaRatings['hoat_dong'] === level
                                  ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-800 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tiêu chí 3 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 gap-4">
                        <div className="max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">3. Phương pháp, Kỹ thuật dạy học</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Đổi mới phương pháp, vận dụng hiệu quả các kỹ thuật tích cực.</p>
                        </div>
                        <div className="flex gap-1">
                          {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleCriteriaChange('phuong_phap', level)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                criteriaRatings['phuong_phap'] === level
                                  ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-800 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tiêu chí 4 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 gap-4">
                        <div className="max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">4. Thiết bị & Học liệu</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Khai thác hiệu quả CNTT, học liệu số, đồ dùng dạy học tự làm sáng tạo.</p>
                        </div>
                        <div className="flex gap-1">
                          {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleCriteriaChange('thiet_bi', level)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                criteriaRatings['thiet_bi'] === level
                                  ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-800 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tiêu chí 5 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl border border-slate-900 bg-slate-950/40 gap-4">
                        <div className="max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">5. Kiểm tra, Đánh giá</h4>
                          <p className="text-[10px] text-slate-500 mt-1">Hình thức đánh giá đa dạng, có phản hồi kịp thời giúp học sinh tiến bộ.</p>
                        </div>
                        <div className="flex gap-1">
                          {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleCriteriaChange('danh_gia', level)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                criteriaRatings['danh_gia'] === level
                                  ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                  : 'border-slate-800 bg-slate-900 text-slate-500'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* FORM ĐÁNH GIÁ CHUNG */}
                  <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                      🎯 Đánh giá và nhận xét chung
                    </h3>

                    {/* Mức xếp loại tự động */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 gap-3">
                      <div>
                        <div className="text-xs font-bold text-orange-400">Xếp loại chung đề xuất (Auto-Calculated):</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Xác định tự động dựa trên tổng điểm các tiêu chí thành phần</div>
                      </div>
                      <div className="flex gap-1.5">
                        {[EVALUATION_LEVELS.CHUA_DAT, EVALUATION_LEVELS.DAT, EVALUATION_LEVELS.TOT, EVALUATION_LEVELS.XUAT_SAC].map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setBghRating(level)}
                            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              bghRating === level
                                ? EVALUATION_COLORS[level as keyof typeof EVALUATION_COLORS]
                                : 'border-slate-800 bg-slate-900 text-slate-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nhận xét chi tiết */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Ý kiến nhận xét, góp ý chi tiết của BGH (Riêng tư)
                      </label>
                      <textarea
                        value={bghFeedback}
                        onChange={(e) => setBghFeedback(e.target.value)}
                        placeholder="Nhập góp ý, nhận xét chuyên môn gửi trực tiếp cho giáo viên..."
                        required
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-slate-200 focus:border-orange-500/50 focus:outline-none transition-all h-28"
                      />
                    </div>

                    {/* Checkbox Đưa vào Kho học liệu vàng */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <input
                        type="checkbox"
                        id="isElite"
                        checked={isElite}
                        onChange={(e) => setIsElite(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-800 text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="isElite" className="text-xs font-bold text-blue-400 cursor-pointer">
                        🏆 Đóng góp bài soạn này vào "Kho Học Liệu Vàng" của nhà trường để chia sẻ tham khảo
                      </label>
                    </div>

                    {/* Submit buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => setRandomTeacher(null)}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-400"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 hover:opacity-90 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-orange-500/10 disabled:opacity-50"
                      >
                        {isSaving ? 'Đang lưu đánh giá...' : '✓ Lưu đánh giá riêng tư'}
                      </button>
                    </div>

                  </div>
                </form>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
