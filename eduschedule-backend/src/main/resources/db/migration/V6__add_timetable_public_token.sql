ALTER TABLE timetables ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS public_token varchar(64);
ALTER TABLE timetables ADD CONSTRAINT timetables_public_token_key UNIQUE (public_token);
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
