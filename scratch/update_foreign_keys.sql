-- 1. Xóa ràng buộc khóa ngoại cũ của teacher_id (nếu có)
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_teacher_id_fkey;

-- 2. Tạo lại ràng buộc khóa ngoại với thuộc tính ON DELETE CASCADE
-- Khi xóa tài khoản giáo viên (profiles), toàn bộ bài nộp (submissions) của họ sẽ tự động bị xóa theo.
ALTER TABLE submissions
ADD CONSTRAINT submissions_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 3. Xóa ràng buộc khóa ngoại cũ của lead_id (nếu có)
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_lead_id_fkey;

-- 4. Tạo lại ràng buộc khóa ngoại của lead_id với thuộc tính ON DELETE SET NULL
-- Khi xóa tài khoản Khối trưởng (profiles), các bài nộp của giáo viên vẫn được giữ lại, thông tin người duyệt được set về NULL.
ALTER TABLE submissions
ADD CONSTRAINT submissions_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- 5. Xóa ràng buộc khóa ngoại cũ của bgh_id (nếu có)
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_bgh_id_fkey;

-- 6. Tạo lại ràng buộc khóa ngoại của bgh_id với thuộc tính ON DELETE SET NULL
-- Khi xóa tài khoản Ban giám hiệu (profiles), các bài nộp của giáo viên vẫn được giữ lại, thông tin người đánh giá được set về NULL.
ALTER TABLE submissions
ADD CONSTRAINT submissions_bgh_id_fkey 
FOREIGN KEY (bgh_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;
