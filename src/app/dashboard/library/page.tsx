'use client';

import { useState, useEffect } from 'react';
import { GRADES, EVALUATION_LEVELS } from '@/constants/roles';

interface EliteDocument {
  id: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  weekNumber: number;
  fileName: string;
  url: string;
  rating: string;
  feedback: string;
  selectedAt: string;
}

export default function EliteLibraryPage() {
  const [library, setLibrary] = useState<EliteDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  useEffect(() => {
    // 1. Dữ liệu mẫu ban đầu cho Kho Học Liệu Vàng (Elite Library)
    const initialLibrary: EliteDocument[] = [
      {
        id: 'mock_1',
        teacherId: 't2',
        teacherName: 'Lê Thị Bình',
        grade: 'Khối 1',
        weekNumber: 2,
        fileName: 'KHBD_Tuan02_LeThiBinh_PhepCongTrongPhamVi10.docx',
        url: '#',
        rating: EVALUATION_LEVELS.XUAT_SAC,
        feedback: 'Thiết kế các hoạt động học cực kỳ sáng tạo, kích thích tư duy toán học cho học sinh tiểu học thông qua trò chơi.',
        selectedAt: '2026-09-15T09:00:00Z',
      },
      {
        id: 'mock_2',
        teacherId: 't5',
        teacherName: 'Hoàng Văn Hùng',
        grade: 'Khối 2',
        weekNumber: 1,
        fileName: 'KHBD_Tuan01_HoangVanHung_TuVungTiengAnhChuDeGiaDinh.docx',
        url: '#',
        rating: EVALUATION_LEVELS.TOT,
        feedback: 'Khai thác xuất sắc công nghệ thông tin và học liệu số thông qua slide bài giảng đẹp mắt.',
        selectedAt: '2026-09-16T14:30:00Z',
      },
    ];

    // 2. Đọc thêm từ localStorage các bài BGH đã chọn
    const stored = localStorage.getItem('qms_elite_library');
    if (stored) {
      setLibrary([...initialLibrary, ...JSON.parse(stored)]);
    } else {
      setLibrary(initialLibrary);
      localStorage.setItem('qms_elite_library', JSON.stringify(initialLibrary));
    }
  }, []);

  const handleBackToDashboard = () => {
    const role = localStorage.getItem('qms_demo_role');
    if (role) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/';
    }
  };

  // Lọc tài liệu theo tìm kiếm và bộ lọc Khối
  const filteredDocs = library.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || doc.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

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

        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-orange-500 tracking-wider uppercase bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            🏆 Kho Học Liệu Vàng
          </span>
          
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Quay lại Dashboard
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="flex-grow p-6 lg:p-12 max-w-6xl mx-auto w-full space-y-8">
        
        {/* BANNER THƯ VIỆN */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-orange-950/20 border border-slate-800/80 relative overflow-hidden text-center sm:text-left space-y-3">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35"></div>
          <h2 className="text-3xl font-black tracking-tight relative z-10">
            Thư Viện Số Tinh Hoa <span className="text-orange-500">QMS Elite</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-xl relative z-10 leading-relaxed">
            Nơi tập hợp các Kế hoạch bài dạy, giáo án chất lượng cao và sáng tạo nhất toàn trường do Ban Giám Hiệu tuyển chọn, giúp cán bộ giáo viên tham khảo và nâng cao nghiệp vụ.
          </p>
        </div>

        {/* BỘ LỌC VÀ TÌM KIẾM */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-2xl border border-slate-900 bg-slate-900/20">
          {/* Ô Tìm kiếm */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm giáo viên, tên giáo án..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-4 pr-10 py-3 text-xs text-slate-200 focus:outline-none focus:border-orange-500/50"
            />
            <span className="absolute right-3.5 top-3.5 text-xs text-slate-500">🔍</span>
          </div>

          {/* Lọc Khối */}
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedGrade('all')}
              className={`px-3.5 py-2.5 rounded-xl border text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedGrade === 'all'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-slate-900/60 bg-slate-900/10 hover:border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả các Khối
            </button>
            {GRADES.map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3.5 py-2.5 rounded-xl border text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedGrade === grade
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-slate-900/60 bg-slate-900/10 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        {/* DANH SÁCH CARD HỌC LIỆU */}
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-900 rounded-2xl bg-slate-900/5">
            <div className="text-5xl mb-3">📚</div>
            <h4 className="text-sm font-bold text-slate-400">Không tìm thấy tài liệu phù hợp</h4>
            <p className="text-xs text-slate-600 mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc khối.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 hover:bg-slate-900/30 transition-all flex flex-col justify-between gap-6 relative group overflow-hidden shadow-md"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-orange-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      {doc.grade}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tuần {doc.weekNumber}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors" title={doc.fileName}>
                    📄 {doc.fileName}
                  </h3>

                  <p className="text-xs text-slate-400 italic bg-slate-950/40 p-3 rounded-xl border border-slate-900/40">
                    "{doc.feedback}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-900/60 mt-2">
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-slate-400">Tác giả: {doc.teacherName}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Xếp loại: <strong className="text-orange-400">{doc.rating}</strong></div>
                  </div>
                  
                  <button
                    onClick={() => alert('Đang tải tài liệu hoặc xem nhanh bản PDF/Word trực tiếp từ Google Drive...')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    📥 Tải về tham khảo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
