/**
 * Tính toán số tuần hiện tại từ ngày bắt đầu năm học
 * @param startDateStr Ngày bắt đầu năm học (Định dạng YYYY-MM-DD hoặc Date object)
 * @param currentDate Date object hiện tại (mặc định là ngày hôm nay)
 * @param totalWeeks Tổng số tuần học (mặc định là 35 tuần)
 * @returns Số tuần hiện tại (1 - totalWeeks), hoặc null nếu nằm ngoài năm học
 */
export function getCurrentWeek(
  startDateStr: string | Date,
  currentDate: Date = new Date(),
  totalWeeks: number = 35
): number {
  const start = new Date(startDateStr);
  
  // Đưa cả 2 ngày về 00:00:00 để tính toán khoảng cách ngày chính xác
  start.setHours(0, 0, 0, 0);
  
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  // Nếu ngày hiện tại trước ngày bắt đầu năm học, trả về tuần 1
  if (current < start) {
    return 1;
  }

  const timeDiff = current.getTime() - start.getTime();
  const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  // Tính số tuần: dayDiff = 0..6 => tuần 1, dayDiff = 7..13 => tuần 2, ...
  const weekNum = Math.floor(dayDiff / 7) + 1;

  // Giới hạn tuần nằm trong khoảng từ 1 đến totalWeeks
  if (weekNum > totalWeeks) {
    return totalWeeks;
  }

  return weekNum;
}

/**
 * Lấy khoảng thời gian (từ ngày... đến ngày...) của một tuần cụ thể
 * @param weekNumber Số tuần cần lấy (1-indexed)
 * @param startDateStr Ngày bắt đầu năm học
 * @returns Đối tượng chứa ngày bắt đầu và kết thúc của tuần đó
 */
export function getWeekDateRange(
  weekNumber: number,
  startDateStr: string | Date
): { start: Date; end: Date } {
  const startYearDate = new Date(startDateStr);
  startYearDate.setHours(0, 0, 0, 0);

  // Ngày bắt đầu của tuần X = Ngày bắt đầu năm học + (X - 1) * 7 ngày
  const startOfWeek = new Date(startYearDate);
  startOfWeek.setDate(startYearDate.getDate() + (weekNumber - 1) * 7);

  // Ngày kết thúc của tuần X = Ngày bắt đầu của tuần X + 6 ngày
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek,
    end: endOfWeek,
  };
}

/**
 * Định dạng ngày hiển thị dạng dd/mm/yyyy
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
