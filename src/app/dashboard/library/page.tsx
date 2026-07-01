'use client';

import { useState, useEffect } from 'react';
import { GRADES, EVALUATION_LEVELS, EVALUATION_COLORS } from '@/constants/roles';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/components/common/Toast';

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
  const { showToast } = useToast();
  const [library, setLibrary] = useState<EliteDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Tải học liệu vàng thật từ database
  const loadEliteLessons = async () => {
    setLoading(true);
    try {
      // 1. Thử truy vấn đầy đủ các cột mới
      let dbElites: any[] | null = null;
      
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          teacher_id,
          week_number,
          bgh_rating,
          bgh_feedback,
          bgh_rated_at,
          elite_file_name,
          elite_file_url,
          profiles:teacher_id (
            full_name,
            grade
          )
        `)
        .eq('is_elite', true);

      if (error) {
        console.warn('[Library] Thiếu cột mới hoặc lỗi query, tự động chạy chế độ dự phòng (fallback)...', error.message);
        
        // 2. Chế độ dự phòng (fallback): Query không có các cột elite_file_name/url mới để tránh sập trang
        const fallbackRes = await supabase
          .from('submissions')
          .select(`
            id,
            teacher_id,
            week_number,
            bgh_rating,
            bgh_feedback,
            bgh_rated_at,
            profiles:teacher_id (
              full_name,
              grade
            )
          `)
          .eq('is_elite', true);

        if (fallbackRes.error) throw fallbackRes.error;
        dbElites = fallbackRes.data;
      } else {
        dbElites = data;
      }

      // Hàm hỗ trợ trích xuất dữ liệu profiles an toàn (hỗ trợ cả dạng đối tượng đơn lẻ lẫn mảng)
      const getProfileData = (profiles: any) => {
        if (!profiles) return null;
        if (Array.isArray(profiles)) return profiles[0] || null;
        return profiles;
      };

      // Map dữ liệu database sang cấu trúc EliteDocument
      const dbFormattedElites: EliteDocument[] = (dbElites || []).map((sub: any) => {
        const prof = getProfileData(sub.profiles);
        return {
          id: sub.id,
          teacherId: sub.teacher_id,
          teacherName: prof?.full_name || 'Giáo viên',
          grade: prof?.grade || 'Khối 1',
          weekNumber: sub.week_number,
          fileName: sub.elite_file_name || `KHBD_Tuan${String(sub.week_number).padStart(2, '0')}_${(prof?.full_name || '').replace(/\s+/g, '')}.docx`,
          url: sub.elite_file_url || '#',
          rating: sub.bgh_rating || EVALUATION_LEVELS.TOT,
          feedback: sub.bgh_feedback || 'Không có nhận xét.',
          selectedAt: sub.bgh_rated_at || new Date().toISOString()
        };
      });

      setLibrary(dbFormattedElites);
    } catch (err: any) {
      console.error('Lỗi tải kho học liệu vàng:', err);
      showToast(`Không thể tải dữ liệu học liệu vàng: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEliteLessons();
  }, []);

  const parseEliteFiles = (fileNameStr: string | null, urlStr: string | null) => {
    if (!fileNameStr) return [];
    const names = fileNameStr.split(' | ');
    const urls = urlStr ? urlStr.split(' | ') : [];
    return names.map((name, index) => ({
      name,
      url: urls[index] || '#'
    }));
  };

  const handleBackToDashboard = () => {
    window.location.href = '/dashboard';
  };

  // Lọc tài liệu theo tìm kiếm và bộ lọc Khối
  const filteredDocs = library.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || doc.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER: OLM Style */}
      <header className="relative z-10 bg-brand-primary px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-gradient-to-tr from-brand-primary to-brand-accent text-xs font-black text-white">
              Q
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">QMS-EDU</h1>
            <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-0.5">Kho Học Liệu Vàng</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-white tracking-wider uppercase bg-brand-accent px-3 py-1 rounded-full shadow-sm">
            🏆 Mẫu Mực Sư Phạm
          </span>
        </div>
      </header>

      {/* SEARCH BAR & BACK ACTION */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Tìm kiếm và Lọc */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-2xl">
          <input
            type="text"
            placeholder="Tìm tài liệu, giáo án, tên giáo viên..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-sm"
          />

          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-brand-primary shadow-sm"
          >
            <option value="all">Tất cả Khối lớp</option>
            {GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleBackToDashboard}
          className="w-full md:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.98] shadow-sm text-center btn-interactive"
        >
          ← Quay lại Dashboard
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-grow p-6 max-w-7xl w-full mx-auto space-y-6">
        
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800">DANH SÁCH GIÁO ÁN MẪU MỰC</h2>
          <p className="text-xs text-slate-500 font-medium">Kho học liệu được Ban Giám Hiệu bình xét và vinh danh qua các tuần học.</p>
        </div>

        {loading && (
          <div className="py-20 text-center text-xs text-slate-500">
            <span className="animate-spin inline-block mr-2">🔄</span> Đang tải các bài học mẫu mực từ Cơ sở dữ liệu...
          </div>
        )}

        {!loading && filteredDocs.length === 0 ? (
          <div className="py-20 border border-dashed border-slate-300 rounded-2xl bg-white text-center shadow-sm space-y-3">
            <div className="text-5xl">📚</div>
            <h3 className="text-sm font-bold text-slate-700 uppercase">Kho học liệu trống</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">Không tìm thấy tài liệu mẫu mực nào khớp với từ khóa tìm kiếm của Khầy.</p>
          </div>
        ) : !loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-6 rounded-2xl border border-slate-300 bg-white hover:border-brand-primary shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-brand-primary bg-brand-primary-light/40 border border-brand-primary-light px-2 py-0.5 rounded-full uppercase">
                      {doc.grade} • Tuần {doc.weekNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${EVALUATION_COLORS[doc.rating as keyof typeof EVALUATION_COLORS] || 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {doc.rating}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Tác giả: <strong className="text-slate-700">{doc.teacherName}</strong>
                  </div>

                  {/* Danh sách các file học liệu mẫu mực vinh danh thật */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh sách học liệu vinh danh:</div>
                    {parseEliteFiles(doc.fileName, doc.url).map((file, idx) => {
                      const hasRealUrl = file.url && file.url !== '#';
                      const fileUrl = hasRealUrl 
                        ? file.url 
                        : `https://drive.google.com/drive/search?q=${encodeURIComponent(file.name)}`;

                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs">
                          <div className="truncate max-w-[240px] font-bold text-slate-700">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary hover:underline"
                            >
                              📄 {file.name}
                            </a>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black cursor-pointer transition-colors"
                          >
                            {hasRealUrl ? '📥 Tải về' : '🔍 Tìm Drive'}
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Góp ý nhận xét của BGH */}
                  {doc.feedback && doc.feedback !== 'Không có nhận xét.' && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-650 leading-relaxed italic mt-2">
                      "Góp ý vinh danh của BGH: {doc.feedback}"
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400 font-medium">
                  <span>Bình chọn vào: {new Date(doc.selectedAt).toLocaleDateString('vi-VN')}</span>
                  <span className="font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-250">
                    {parseEliteFiles(doc.fileName, doc.url).length} Học liệu vinh danh
                  </span>
                </div>

              </div>
            ))}
          </div>
        ) : null}

      </main>

    </div>
  );
}
