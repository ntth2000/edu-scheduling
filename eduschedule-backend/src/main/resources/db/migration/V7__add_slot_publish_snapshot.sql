ALTER TABLE slots ADD COLUMN IF NOT EXISTS teacher_id_snapshot bigint;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS teacher_name_snapshot varchar(255);
ALTER TABLE slots ADD COLUMN IF NOT EXISTS subject_name_snapshot varchar(255);
