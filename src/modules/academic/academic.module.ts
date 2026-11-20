import { Module } from '@nestjs/common';
import { AcademicYearModule } from './academic-year/academic-year.module';
import { ClassModule } from './class/class.module';
import { SectionModule } from './section/section.module';
import { AcademicGroupModule } from './academic-group/academic-group.module';
import { StudentModule } from './student/student.module';
import { ParentModule } from './parent/parent.module';
import { SubjectModule } from './subject/subject.module';
import { ClassSubjectModule } from './class-subject/class-subject.module';
import { BookModule } from './book/book.module';
import { PromotionModule } from './promotion/promotion.module';
import { TransferCertificateModule } from './transfer-certificate/transfer-certificate.module';
import { TeacherAssignmentModule } from './teacher-assignment/teacher-assignment.module';

@Module({
  imports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
    StudentModule,
    ParentModule,
    SubjectModule,
    ClassSubjectModule,
    BookModule,
    PromotionModule,
    TransferCertificateModule,
    TeacherAssignmentModule,
  ],
  exports: [
    AcademicYearModule,
    ClassModule,
    SectionModule,
    AcademicGroupModule,
    StudentModule,
    ParentModule,
    SubjectModule,
    ClassSubjectModule,
    BookModule,
    PromotionModule,
    TransferCertificateModule,
    TeacherAssignmentModule,
  ],
})
export class AcademicModule {}
