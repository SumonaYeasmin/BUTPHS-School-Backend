-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('TEACHER', 'OFFICER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'FORMER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'TRANSFERRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PROMOTED', 'RETAINED', 'DOUBLE_PROMOTED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AcademicDocumentType" AS ENUM ('CURRICULUM', 'STUDENT_RULES', 'PARENT_GUIDELINES', 'DRESS_CODE');

-- CreateEnum
CREATE TYPE "AcademicEventType" AS ENUM ('HOLIDAY', 'EVENT', 'ADMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('HALF_YEARLY', 'ANNUAL', 'MODEL_TEST', 'SELECTION');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExamRoutineStatus" AS ENUM ('SCHEDULED', 'POSTPONED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ResultPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHHELD');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PASS', 'FAIL', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InstitutionContentType" AS ENUM ('HISTORY', 'TRADITION', 'INFRASTRUCTURE', 'INTRODUCTION');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('LAB', 'LIBRARY', 'PLAYGROUND', 'MULTIMEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('SMART_CLASS_VIDEO', 'ONLINE_CLASS_LINK', 'EDUCATIONAL_VIDEO', 'MULTIMEDIA_CONTENT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "LeadershipType" AS ENUM ('PRINCIPAL', 'CHAIRMAN');

-- CreateEnum
CREATE TYPE "EventCategoryType" AS ENUM ('SPORTS', 'DEBATE', 'SCIENCE_FAIR', 'CULTURAL', 'SCOUTS', 'GIRL_GUIDES', 'TREE_PLANTATION', 'NATIONAL_DAY', 'OTHER');

-- CreateEnum
CREATE TYPE "LibraryDistributionType" AS ENUM ('BOOK_DISTRIBUTION', 'TEXTBOOK_DISTRIBUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'RFID', 'BIOMETRIC');

-- CreateEnum
CREATE TYPE "AttendanceSmsType" AS ENUM ('ENTRY', 'EXIT', 'ABSENT');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('SCHOOL_MAGAZINE', 'WALL_MAGAZINE', 'JOURNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AdmissionApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('INSTITUTION_ACHIEVEMENT', 'STUDENT_STAR', 'NOTABLE_ALUMNI');

-- CreateEnum
CREATE TYPE "BookType" AS ENUM ('TEXTBOOK', 'SUPPLEMENTARY', 'GRAMMAR', 'REFERENCE');

-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('GENERAL', 'LANGUAGE', 'MATHEMATICS', 'SCIENCE', 'SOCIAL_SCIENCE', 'RELIGION', 'COMMERCE', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('ISLAM', 'HINDUISM', 'BUDDHISM', 'CHRISTIANITY', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'LOST', 'DAMAGED', 'BLOCKED');

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" UUID NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGroup" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "numericValue" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "officialCode" VARCHAR(30),
    "category" "SubjectCategory" NOT NULL DEFAULT 'GENERAL',
    "paperNumber" INTEGER,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "combinedSubjectId" UUID,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "bookCode" VARCHAR(50),
    "type" "BookType" NOT NULL DEFAULT 'TEXTBOOK',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "groupId" UUID,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "studentId" VARCHAR(50) NOT NULL,
    "birthCertificateNo" VARCHAR(20),
    "boardRegistrationNo" VARCHAR(30),
    "nameEn" VARCHAR(150) NOT NULL,
    "nameBn" VARCHAR(150),
    "photo" TEXT,
    "dateOfBirth" DATE,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup",
    "religion" "Religion",
    "presentAddress" TEXT,
    "permanentAddress" TEXT,
    "admissionDate" DATE NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRFIDcard" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "cardNumber" VARCHAR(50) NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRFIDcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "groupId" UUID,
    "optionalSubjectId" UUID,
    "roll" INTEGER NOT NULL,
    "enrollmentDate" DATE NOT NULL,
    "isRepeater" BOOLEAN NOT NULL DEFAULT false,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPromotion" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "fromEnrollmentId" UUID NOT NULL,
    "toEnrollmentId" UUID NOT NULL,
    "resultSummaryId" UUID,
    "promotionType" "PromotionType" NOT NULL DEFAULT 'PROMOTED',
    "promotionDate" DATE NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "nid" VARCHAR(20),
    "occupation" VARCHAR(100),
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "isSmsReceiver" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "classSubjectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionClassTeacher" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "assignedDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionClassTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicDocument" (
    "id" UUID NOT NULL,
    "type" "AcademicDocumentType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicEvent" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "eventType" "AcademicEventType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,

    CONSTRAINT "AcademicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoutine" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "teacherAssignmentId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "day" "WeekDay" NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "room" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" UUID NOT NULL,
    "applicationNo" VARCHAR(50) NOT NULL,
    "academicYearId" UUID NOT NULL,
    "appliedClassId" UUID NOT NULL,
    "appliedGroupId" UUID,
    "enrolledStudentId" UUID,
    "studentName" VARCHAR(150) NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup",
    "religion" "Religion",
    "birthCertificate" VARCHAR(50),
    "fatherName" VARCHAR(150) NOT NULL,
    "motherName" VARCHAR(150) NOT NULL,
    "guardianPhone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "presentAddress" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "previousSchool" VARCHAR(200),
    "previousGrade" VARCHAR(50),
    "photo" TEXT,
    "documentsUrl" TEXT,
    "status" "AdmissionApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "studentEnrollmentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "inTime" TIMESTAMP(3),
    "outTime" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,
    "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "remarks" TEXT,
    "markedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSmsLog" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "smsType" "AttendanceSmsType" NOT NULL DEFAULT 'ABSENT',
    "phone" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "ipAddress" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalClassroom" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(150),
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalClassroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalResource" (
    "id" UUID NOT NULL,
    "academicYearId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "resourceType" "ResourceType" NOT NULL,
    "subjectId" UUID,
    "classId" UUID,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "maxGpa" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeRange" (
    "id" UUID NOT NULL,
    "gradingScaleId" UUID NOT NULL,
    "minPercentage" DECIMAL(5,2) NOT NULL,
    "maxPercentage" DECIMAL(5,2) NOT NULL,
    "letterGrade" VARCHAR(5) NOT NULL,
    "gradePoint" DECIMAL(3,2) NOT NULL,
    "remarks" VARCHAR(50),
    "isFailGrade" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GradeRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "gradingScaleId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "examType" "ExamType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'UPCOMING',
    "marksEntryDeadline" TIMESTAMP(3),
    "allowCombinedPass" BOOLEAN NOT NULL DEFAULT true,
    "weightagePercentage" DECIMAL(5,2),
    "resultStatus" "ResultPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "groupId" UUID,
    "fullMarks" DECIMAL(7,2) NOT NULL,
    "passMarks" DECIMAL(7,2) NOT NULL,
    "hasWritten" BOOLEAN NOT NULL DEFAULT true,
    "writtenFullMarks" DECIMAL(7,2),
    "writtenPassMarks" DECIMAL(7,2),
    "hasMcq" BOOLEAN NOT NULL DEFAULT false,
    "mcqFullMarks" DECIMAL(7,2),
    "mcqPassMarks" DECIMAL(7,2),
    "hasPractical" BOOLEAN NOT NULL DEFAULT false,
    "practicalFullMarks" DECIMAL(7,2),
    "practicalPassMarks" DECIMAL(7,2),
    "hasContinuousAssessment" BOOLEAN NOT NULL DEFAULT false,
    "continuousAssessmentFullMarks" DECIMAL(7,2),
    "continuousAssessmentPassMarks" DECIMAL(7,2),

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRoutine" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "examSubjectId" UUID NOT NULL,
    "sectionId" UUID,
    "examDate" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "roomNo" VARCHAR(50),
    "status" "ExamRoutineStatus" NOT NULL DEFAULT 'SCHEDULED',
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" UUID NOT NULL,
    "studentEnrollmentId" UUID NOT NULL,
    "examSubjectId" UUID NOT NULL,
    "writtenMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "mcqMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "practicalMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "continuousAssessmentMarks" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "totalMarks" DECIMAL(7,2) NOT NULL,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "enteredBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubjectResult" (
    "id" UUID NOT NULL,
    "studentEnrollmentId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "examSubjectId" UUID NOT NULL,
    "totalMarks" DECIMAL(7,2) NOT NULL,
    "letterGrade" VARCHAR(5),
    "gradePoint" DECIMAL(3,2),
    "isPassed" BOOLEAN NOT NULL,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSubjectResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultSummary" (
    "id" UUID NOT NULL,
    "studentEnrollmentId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "totalFullMarks" DECIMAL(9,2) NOT NULL,
    "totalMarks" DECIMAL(9,2) NOT NULL,
    "gpa" DECIMAL(3,2),
    "letterGrade" VARCHAR(5),
    "meritPosition" INTEGER,
    "sectionMeritPosition" INTEGER,
    "failedSubjectCount" INTEGER NOT NULL DEFAULT 0,
    "resultStatus" "ResultStatus" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "eiin" VARCHAR(20),
    "schoolCode" VARCHAR(50),
    "logo" TEXT,
    "establishedYear" INTEGER,
    "address" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "website" VARCHAR(255),
    "description" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionContent" (
    "id" UUID NOT NULL,
    "type" "InstitutionContentType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolFacility" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "FacilityType" NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrator" (
    "id" UUID NOT NULL,
    "staffId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "photo" TEXT,
    "message" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagingCommitteeMember" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "photo" TEXT,
    "phone" VARCHAR(20),
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagingCommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickLink" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "isButton" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryProfile" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryBook" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "author" VARCHAR(150),
    "publisher" VARCHAR(150),
    "category" VARCHAR(100),
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryDistributionInfo" (
    "id" UUID NOT NULL,
    "type" "LibraryDistributionType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "distributionDate" DATE,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryDistributionInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "attachment" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "EventCategoryType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "photo" TEXT,
    "designation" VARCHAR(100) NOT NULL,
    "qualification" VARCHAR(150),
    "staffType" "StaffType" NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "joiningDate" DATE,
    "leavingDate" DATE,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffStructure" (
    "id" UUID NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "staffType" "StaffType" NOT NULL,
    "totalPositions" INTEGER NOT NULL,
    "filledPositions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteBanner" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200),
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipMessage" (
    "id" UUID NOT NULL,
    "personName" VARCHAR(150) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "photo" TEXT,
    "message" TEXT NOT NULL,
    "type" "LeadershipType" NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadershipMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryMedia" (
    "id" UUID NOT NULL,
    "galleryId" UUID NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionContent" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "admissionInfo" TEXT,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInformation" (
    "id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "mapUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePublicSummary" (
    "id" UUID NOT NULL,
    "summaryDate" DATE NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "presentCount" INTEGER,
    "absentCount" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePublicSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "PublicationType" NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "fileUrl" TEXT,
    "publishYear" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "AchievementType" NOT NULL,
    "personName" VARCHAR(150),
    "batch" VARCHAR(50),
    "description" TEXT,
    "image" TEXT,
    "achievedAt" DATE,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE INDEX "AcademicYear_isActive_idx" ON "AcademicYear"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicGroup_name_key" ON "AcademicGroup"("name");

-- CreateIndex
CREATE INDEX "AcademicGroup_isActive_idx" ON "AcademicGroup"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_name_key" ON "SchoolClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_numericValue_key" ON "SchoolClass"("numericValue");

-- CreateIndex
CREATE INDEX "SchoolClass_isActive_idx" ON "SchoolClass"("isActive");

-- CreateIndex
CREATE INDEX "SchoolClass_numericValue_idx" ON "SchoolClass"("numericValue");

-- CreateIndex
CREATE INDEX "Section_classId_isActive_idx" ON "Section"("classId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Section_classId_name_key" ON "Section"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_id_classId_key" ON "Section"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_officialCode_key" ON "Subject"("officialCode");

-- CreateIndex
CREATE INDEX "Subject_isActive_displayOrder_idx" ON "Subject"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "Subject_category_idx" ON "Subject"("category");

-- CreateIndex
CREATE INDEX "Subject_combinedSubjectId_idx" ON "Subject"("combinedSubjectId");

-- CreateIndex
CREATE INDEX "Book_classId_subjectId_idx" ON "Book"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "Book_isActive_idx" ON "Book"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Book_classId_subjectId_name_key" ON "Book"("classId", "subjectId", "name");

-- CreateIndex
CREATE INDEX "ClassSubject_classId_academicYearId_idx" ON "ClassSubject"("classId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_academicYearId_classId_subjectId_groupId_key" ON "ClassSubject"("academicYearId", "classId", "subjectId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_id_academicYearId_classId_key" ON "ClassSubject"("id", "academicYearId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_birthCertificateNo_key" ON "Student"("birthCertificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_boardRegistrationNo_key" ON "Student"("boardRegistrationNo");

-- CreateIndex
CREATE INDEX "Student_status_nameEn_idx" ON "Student"("status", "nameEn");

-- CreateIndex
CREATE INDEX "Student_nameBn_idx" ON "Student"("nameBn");

-- CreateIndex
CREATE INDEX "Student_boardRegistrationNo_idx" ON "Student"("boardRegistrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRFIDcard_cardNumber_key" ON "StudentRFIDcard"("cardNumber");

-- CreateIndex
CREATE INDEX "StudentRFIDcard_cardNumber_status_idx" ON "StudentRFIDcard"("cardNumber", "status");

-- CreateIndex
CREATE INDEX "StudentRFIDcard_studentId_status_idx" ON "StudentRFIDcard"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classId_sectionId_academicYearId_idx" ON "StudentEnrollment"("classId", "sectionId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicYearId_status_idx" ON "StudentEnrollment"("academicYearId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_academicYearId_key" ON "StudentEnrollment"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_academicYearId_classId_sectionId_roll_key" ON "StudentEnrollment"("academicYearId", "classId", "sectionId", "roll");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_id_studentId_key" ON "StudentEnrollment"("id", "studentId");

-- CreateIndex
CREATE INDEX "StudentPromotion_studentId_promotionDate_idx" ON "StudentPromotion"("studentId", "promotionDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPromotion_fromEnrollmentId_key" ON "StudentPromotion"("fromEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPromotion_toEnrollmentId_key" ON "StudentPromotion"("toEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "Parent_phone_idx" ON "Parent"("phone");

-- CreateIndex
CREATE INDEX "Parent_name_idx" ON "Parent"("name");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_staffId_academicYearId_idx" ON "TeacherAssignment"("staffId", "academicYearId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_classId_sectionId_academicYearId_idx" ON "TeacherAssignment"("classId", "sectionId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_academicYearId_sectionId_classSubjectId_s_key" ON "TeacherAssignment"("academicYearId", "sectionId", "classSubjectId", "staffId");

-- CreateIndex
CREATE INDEX "SectionClassTeacher_staffId_idx" ON "SectionClassTeacher"("staffId");

-- CreateIndex
CREATE INDEX "SectionClassTeacher_academicYearId_sectionId_idx" ON "SectionClassTeacher"("academicYearId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionClassTeacher_academicYearId_sectionId_key" ON "SectionClassTeacher"("academicYearId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionClassTeacher_academicYearId_staffId_key" ON "SectionClassTeacher"("academicYearId", "staffId");

-- CreateIndex
CREATE INDEX "AcademicDocument_type_isPublished_idx" ON "AcademicDocument"("type", "isPublished");

-- CreateIndex
CREATE INDEX "AcademicEvent_academicYearId_startDate_idx" ON "AcademicEvent"("academicYearId", "startDate");

-- CreateIndex
CREATE INDEX "ClassRoutine_academicYearId_room_day_periodNumber_idx" ON "ClassRoutine"("academicYearId", "room", "day", "periodNumber");

-- CreateIndex
CREATE INDEX "ClassRoutine_staffId_day_idx" ON "ClassRoutine"("staffId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoutine_academicYearId_sectionId_day_periodNumber_key" ON "ClassRoutine"("academicYearId", "sectionId", "day", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoutine_academicYearId_staffId_day_periodNumber_key" ON "ClassRoutine"("academicYearId", "staffId", "day", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_applicationNo_key" ON "AdmissionApplication"("applicationNo");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_enrolledStudentId_key" ON "AdmissionApplication"("enrolledStudentId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_academicYearId_appliedClassId_status_idx" ON "AdmissionApplication"("academicYearId", "appliedClassId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_appliedGroupId_idx" ON "AdmissionApplication"("appliedGroupId");

-- CreateIndex
CREATE INDEX "Attendance_date_status_idx" ON "Attendance"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentEnrollmentId_date_key" ON "Attendance"("studentEnrollmentId", "date");

-- CreateIndex
CREATE INDEX "AttendanceSmsLog_status_createdAt_idx" ON "AttendanceSmsLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_action_idx" ON "AuditLog"("module", "action");

-- CreateIndex
CREATE INDEX "DigitalResource_resourceType_isPublished_idx" ON "DigitalResource"("resourceType", "isPublished");

-- CreateIndex
CREATE INDEX "DigitalResource_classId_subjectId_idx" ON "DigitalResource"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingScale_name_key" ON "GradingScale"("name");

-- CreateIndex
CREATE INDEX "GradeRange_gradingScaleId_minPercentage_maxPercentage_idx" ON "GradeRange"("gradingScaleId", "minPercentage", "maxPercentage");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRange_gradingScaleId_letterGrade_key" ON "GradeRange"("gradingScaleId", "letterGrade");

-- CreateIndex
CREATE INDEX "Exam_academicYearId_classId_idx" ON "Exam"("academicYearId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_academicYearId_classId_name_key" ON "Exam"("academicYearId", "classId", "name");

-- CreateIndex
CREATE INDEX "ExamSubject_examId_groupId_idx" ON "ExamSubject"("examId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "ExamRoutine_examId_examDate_idx" ON "ExamRoutine"("examId", "examDate");

-- CreateIndex
CREATE INDEX "ExamRoutine_examDate_roomNo_idx" ON "ExamRoutine"("examDate", "roomNo");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRoutine_examId_examSubjectId_sectionId_key" ON "ExamRoutine"("examId", "examSubjectId", "sectionId");

-- CreateIndex
CREATE INDEX "Mark_examSubjectId_idx" ON "Mark"("examSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_studentEnrollmentId_examSubjectId_key" ON "Mark"("studentEnrollmentId", "examSubjectId");

-- CreateIndex
CREATE INDEX "StudentSubjectResult_examId_studentEnrollmentId_idx" ON "StudentSubjectResult"("examId", "studentEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubjectResult_studentEnrollmentId_examSubjectId_key" ON "StudentSubjectResult"("studentEnrollmentId", "examSubjectId");

-- CreateIndex
CREATE INDEX "ResultSummary_examId_meritPosition_idx" ON "ResultSummary"("examId", "meritPosition");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSummary_studentEnrollmentId_examId_key" ON "ResultSummary"("studentEnrollmentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProfile_eiin_key" ON "SchoolProfile"("eiin");

-- CreateIndex
CREATE INDEX "InstitutionContent_type_isPublished_idx" ON "InstitutionContent"("type", "isPublished");

-- CreateIndex
CREATE INDEX "SchoolFacility_type_isActive_idx" ON "SchoolFacility"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_staffId_key" ON "Administrator"("staffId");

-- CreateIndex
CREATE INDEX "QuickLink_isActive_sortOrder_idx" ON "QuickLink"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LibraryBook_title_idx" ON "LibraryBook"("title");

-- CreateIndex
CREATE INDEX "Notice_status_publishedAt_idx" ON "Notice"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "News_isPublished_publishedAt_idx" ON "News"("isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_name_key" ON "EventCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_type_key" ON "EventCategory"("type");

-- CreateIndex
CREATE INDEX "Event_startDate_isPublished_idx" ON "Event"("startDate", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_staffType_status_idx" ON "Staff"("staffType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffStructure_designation_staffType_key" ON "StaffStructure"("designation", "staffType");

-- CreateIndex
CREATE INDEX "WebsiteBanner_isActive_sortOrder_idx" ON "WebsiteBanner"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LeadershipMessage_type_isPublished_idx" ON "LeadershipMessage"("type", "isPublished");

-- CreateIndex
CREATE INDEX "GalleryMedia_galleryId_sortOrder_idx" ON "GalleryMedia"("galleryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePublicSummary_summaryDate_key" ON "AttendancePublicSummary"("summaryDate");

-- CreateIndex
CREATE INDEX "Publication_type_isPublished_idx" ON "Publication"("type", "isPublished");

-- CreateIndex
CREATE INDEX "Achievement_type_isPublished_idx" ON "Achievement"("type", "isPublished");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_combinedSubjectId_fkey" FOREIGN KEY ("combinedSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRFIDcard" ADD CONSTRAINT "StudentRFIDcard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_classId_fkey" FOREIGN KEY ("sectionId", "classId") REFERENCES "Section"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_optionalSubjectId_fkey" FOREIGN KEY ("optionalSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_fromEnrollmentId_studentId_fkey" FOREIGN KEY ("fromEnrollmentId", "studentId") REFERENCES "StudentEnrollment"("id", "studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_toEnrollmentId_studentId_fkey" FOREIGN KEY ("toEnrollmentId", "studentId") REFERENCES "StudentEnrollment"("id", "studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPromotion" ADD CONSTRAINT "StudentPromotion_resultSummaryId_fkey" FOREIGN KEY ("resultSummaryId") REFERENCES "ResultSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_classId_fkey" FOREIGN KEY ("sectionId", "classId") REFERENCES "Section"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classSubjectId_academicYearId_classId_fkey" FOREIGN KEY ("classSubjectId", "academicYearId", "classId") REFERENCES "ClassSubject"("id", "academicYearId", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionClassTeacher" ADD CONSTRAINT "SectionClassTeacher_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionClassTeacher" ADD CONSTRAINT "SectionClassTeacher_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionClassTeacher" ADD CONSTRAINT "SectionClassTeacher_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicEvent" ADD CONSTRAINT "AcademicEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoutine" ADD CONSTRAINT "ClassRoutine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_appliedClassId_fkey" FOREIGN KEY ("appliedClassId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_appliedGroupId_fkey" FOREIGN KEY ("appliedGroupId") REFERENCES "AcademicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_enrolledStudentId_fkey" FOREIGN KEY ("enrolledStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSmsLog" ADD CONSTRAINT "AttendanceSmsLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSmsLog" ADD CONSTRAINT "AttendanceSmsLog_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalResource" ADD CONSTRAINT "DigitalResource_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalResource" ADD CONSTRAINT "DigitalResource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalResource" ADD CONSTRAINT "DigitalResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRange" ADD CONSTRAINT "GradeRange_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "GradingScale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "GradingScale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoutine" ADD CONSTRAINT "ExamRoutine_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoutine" ADD CONSTRAINT "ExamRoutine_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRoutine" ADD CONSTRAINT "ExamRoutine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectResult" ADD CONSTRAINT "StudentSubjectResult_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectResult" ADD CONSTRAINT "StudentSubjectResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectResult" ADD CONSTRAINT "StudentSubjectResult_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSummary" ADD CONSTRAINT "ResultSummary_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSummary" ADD CONSTRAINT "ResultSummary_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administrator" ADD CONSTRAINT "Administrator_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryMedia" ADD CONSTRAINT "GalleryMedia_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
