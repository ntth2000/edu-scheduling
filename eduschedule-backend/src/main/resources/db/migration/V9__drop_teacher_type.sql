-- "Loại giáo viên" không còn là khái niệm nghiệp vụ: vai trò chủ nhiệm được xác
-- định qua classes.homeroom_teacher_id, còn mọi bản ghi teachers đều mang giá trị
-- 'BO_MON' do được gán cứng khi tạo. Cột này không được đọc ở bất kỳ đâu nên bị loại bỏ.
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_type_check;
ALTER TABLE teachers DROP COLUMN IF EXISTS type;
