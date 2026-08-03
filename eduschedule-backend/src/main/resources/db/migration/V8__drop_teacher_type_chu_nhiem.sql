-- CHU_NHIEM is no longer a valid TeacherType — homeroom status is now derived
-- from SchoolClass.homeroomTeacherId, not stored on the teacher itself.
UPDATE teachers SET type = 'BO_MON' WHERE type = 'CHU_NHIEM';

ALTER TABLE teachers DROP CONSTRAINT teachers_type_check;
ALTER TABLE teachers ADD CONSTRAINT teachers_type_check
    CHECK (((type)::text = ANY ((ARRAY['BO_MON'::character varying, 'KHAC'::character varying])::text[])));
