-- 1. Ensure only ONE ACTIVE RFID card per student
CREATE UNIQUE INDEX IF NOT EXISTS "StudentRFIDcard_studentId_active_unique"
ON "StudentRFIDcard" ("studentId")
WHERE "status" = 'ACTIVE';

-- 2. Ensure only ONE ACTIVE AcademicYear across the entire system at any time
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_single_active_unique"
ON "AcademicYear" ("isActive")
WHERE "isActive" = true;

-- 3. Ensure ClassSubject unique constraint prevents duplicate subjects even when groupId is NULL
DROP INDEX IF EXISTS "ClassSubject_academicYearId_classId_subjectId_groupId_key";
CREATE UNIQUE INDEX "ClassSubject_academicYearId_classId_subjectId_groupId_key"
ON "ClassSubject" ("academicYearId", "classId", "subjectId", "groupId")
NULLS NOT DISTINCT;