-- AlterEnum
ALTER TYPE "ExamType" ADD VALUE 'CONSOLIDATED';

-- CreateTable
CREATE TABLE "ConsolidatedExamConfig" (
    "id" UUID NOT NULL,
    "consolidatedExamId" UUID NOT NULL,
    "sourceExamId" UUID NOT NULL,
    "weightagePercentage" DECIMAL(5,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidatedExamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsolidatedExamConfig_sourceExamId_idx" ON "ConsolidatedExamConfig"("sourceExamId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidatedExamConfig_consolidatedExamId_sourceExamId_key" ON "ConsolidatedExamConfig"("consolidatedExamId", "sourceExamId");

-- AddForeignKey
ALTER TABLE "ConsolidatedExamConfig" ADD CONSTRAINT "ConsolidatedExamConfig_consolidatedExamId_fkey" FOREIGN KEY ("consolidatedExamId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidatedExamConfig" ADD CONSTRAINT "ConsolidatedExamConfig_sourceExamId_fkey" FOREIGN KEY ("sourceExamId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
