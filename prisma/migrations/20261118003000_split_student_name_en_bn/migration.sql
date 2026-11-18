-- AlterTable: Add nameEn and nameBn to Student table
ALTER TABLE "Student"
ADD COLUMN IF NOT EXISTS "nameEn" VARCHAR(150),
ADD COLUMN IF NOT EXISTS "nameBn" VARCHAR(150);

-- Migrate existing data if "name" column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Student' AND column_name = 'name'
  ) THEN
    UPDATE "Student" SET "nameEn" = "name" WHERE "nameEn" IS NULL;
    ALTER TABLE "Student" DROP COLUMN "name";
  END IF;
END $$;

-- Enforce NOT NULL on nameEn
ALTER TABLE "Student" ALTER COLUMN "nameEn" SET NOT NULL;

-- Create Indexes for fast lookups in English and Bengali
DROP INDEX IF EXISTS "Student_status_name_idx";
CREATE INDEX IF NOT EXISTS "Student_status_nameEn_idx" ON "Student"("status", "nameEn");
CREATE INDEX IF NOT EXISTS "Student_nameBn_idx" ON "Student"("nameBn");
