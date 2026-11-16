import { PrismaClient, SubjectCategory, BookType } from '../generated/client';

export async function seedCurriculum(prisma: PrismaClient) {
  console.log('Seeding NCTB Academic Curriculum (Classes, Groups, Subjects, Books)...');

  // ----------------------------------------------------
  // 1. Classes (Class 6 - 10)
  // ----------------------------------------------------
  const classesData = [
    { name: 'Class 6', numericValue: 6 },
    { name: 'Class 7', numericValue: 7 },
    { name: 'Class 8', numericValue: 8 },
    { name: 'Class 9', numericValue: 9 },
    { name: 'Class 10', numericValue: 10 },
  ];

  const classMap = new Map<number, string>();
  for (const c of classesData) {
    const schoolClass = await prisma.schoolClass.upsert({
      where: { numericValue: c.numericValue },
      update: { name: c.name },
      create: { name: c.name, numericValue: c.numericValue },
    });
    classMap.set(c.numericValue, schoolClass.id);
  }

  // ----------------------------------------------------
  // 2. Academic Groups (Class 9-10)
  // ----------------------------------------------------
  const groupsData = [
    { name: 'Science', description: 'বিজ্ঞান বিভাগ' },
    { name: 'Business Studies', description: 'ব্যবসায় শিক্ষা বিভাগ' },
    { name: 'Humanities', description: 'মানবিক বিভাগ' },
  ];

  for (const g of groupsData) {
    await prisma.academicGroup.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description },
    });
  }

  // ----------------------------------------------------
  // 3. Subjects (NCTB Default Subjects with Board Codes)
  // ----------------------------------------------------
  const subjectsData = [
    // Languages
    { name: 'বাংলা ১ম পত্র', officialCode: '101', category: SubjectCategory.LANGUAGE, displayOrder: 1 },
    { name: 'বাংলা ২য় পত্র', officialCode: '102', category: SubjectCategory.LANGUAGE, displayOrder: 2 },
    { name: 'English 1st Paper', officialCode: '107', category: SubjectCategory.LANGUAGE, displayOrder: 3 },
    { name: 'English 2nd Paper', officialCode: '108', category: SubjectCategory.LANGUAGE, displayOrder: 4 },

    // Mathematics
    { name: 'গণিত', officialCode: '109', category: SubjectCategory.MATHEMATICS, displayOrder: 5 },
    { name: 'উচ্চতর গণিত', officialCode: '126', category: SubjectCategory.MATHEMATICS, displayOrder: 6 },

    // Science
    { name: 'বিজ্ঞান', officialCode: '127', category: SubjectCategory.SCIENCE, displayOrder: 7 },
    { name: 'পদার্থবিজ্ঞান', officialCode: '136', category: SubjectCategory.SCIENCE, displayOrder: 8 },
    { name: 'রসায়ন', officialCode: '137', category: SubjectCategory.SCIENCE, displayOrder: 9 },
    { name: 'জীববিজ্ঞান', officialCode: '138', category: SubjectCategory.SCIENCE, displayOrder: 10 },

    // Social Science
    { name: 'বাংলাদেশ ও বিশ্বপরিচয়', officialCode: '150', category: SubjectCategory.SOCIAL_SCIENCE, displayOrder: 11 },
    { name: 'ইতিহাস ও সামাজিক বিজ্ঞান', officialCode: '153', category: SubjectCategory.SOCIAL_SCIENCE, displayOrder: 12 },

    // Religions
    { name: 'ইসলাম ও নৈতিক শিক্ষা', officialCode: '111', category: SubjectCategory.RELIGION, displayOrder: 13 },
    { name: 'হিন্দুধর্ম ও নৈতিক শিক্ষা', officialCode: '112', category: SubjectCategory.RELIGION, displayOrder: 14 },
    { name: 'বৌদ্ধধর্ম ও নৈতিক শিক্ষা', officialCode: '113', category: SubjectCategory.RELIGION, displayOrder: 15 },
    { name: 'খ্রিস্টধর্ম ও নৈতিক শিক্ষা', officialCode: '114', category: SubjectCategory.RELIGION, displayOrder: 16 },

    // Business Studies / Commerce
    { name: 'হিসাববিজ্ঞান', officialCode: '146', category: SubjectCategory.COMMERCE, displayOrder: 17 },
    { name: 'ফিন্যান্স ও ব্যাংকিং', officialCode: '152', category: SubjectCategory.COMMERCE, displayOrder: 18 },
    { name: 'ব্যবসায় উদ্যোগ', officialCode: '143', category: SubjectCategory.COMMERCE, displayOrder: 19 },

    // Technical / Vocational / ICT
    { name: 'তথ্য ও যোগাযোগ প্রযুক্তি', officialCode: '154', category: SubjectCategory.TECHNICAL, displayOrder: 20 },
    { name: 'কৃষিশিক্ষা', officialCode: '134', category: SubjectCategory.TECHNICAL, displayOrder: 21 },
    { name: 'গার্হস্থ্য বিজ্ঞান', officialCode: '151', category: SubjectCategory.TECHNICAL, displayOrder: 22 },

    // General / Co-curricular
    { name: 'শারীরিক শিক্ষা ও স্বাস্থ্য', officialCode: '147', category: SubjectCategory.GENERAL, displayOrder: 23 },
    { name: 'চারু ও কারুকলা', officialCode: '148', category: SubjectCategory.GENERAL, displayOrder: 24 },
  ];

  const subjectMap = new Map<string, string>();
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { name: s.name },
      update: {
        officialCode: s.officialCode,
        category: s.category,
        displayOrder: s.displayOrder,
        isSystemDefault: true,
        isActive: true,
      },
      create: {
        name: s.name,
        officialCode: s.officialCode,
        category: s.category,
        displayOrder: s.displayOrder,
        isSystemDefault: true,
        isActive: true,
      },
    });
    subjectMap.set(s.name, subject.id);
  }

  // ----------------------------------------------------
  // 4. Books Mapping (Prescribed NCTB Books per Class & Subject)
  // ----------------------------------------------------
  interface BookSeedItem {
    classNumeric: number;
    subjectName: string;
    bookName: string;
    type: BookType;
    displayOrder: number;
  }

  const booksData: BookSeedItem[] = [
    // Class 6 Books
    { classNumeric: 6, subjectName: 'বাংলা ১ম পত্র', bookName: 'চারুপাঠ', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'বাংলা ১ম পত্র', bookName: 'আনন্দপাঠ', type: BookType.SUPPLEMENTARY, displayOrder: 2 },
    { classNumeric: 6, subjectName: 'বাংলা ২য় পত্র', bookName: 'বাংলা ভাষার ব্যাকরণ ও নির্মিতি (৬ষ্ঠ)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'English 1st Paper', bookName: 'English For Today (Class 6)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'English 2nd Paper', bookName: 'English Grammar and Composition (Class 6)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'গণিত', bookName: 'গণিত (৬ষ্ঠ শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'বিজ্ঞান', bookName: 'বিজ্ঞান (৬ষ্ঠ শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'বাংলাদেশ ও বিশ্বপরিচয়', bookName: 'বাংলাদেশ ও বিশ্বপরিচয় (৬ষ্ঠ)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'ইসলাম ও নৈতিক শিক্ষা', bookName: 'ইসলাম ও নৈতিক শিক্ষা (৬ষ্ঠ)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 6, subjectName: 'তথ্য ও যোগাযোগ প্রযুক্তি', bookName: 'তথ্য ও যোগাযোগ প্রযুক্তি (৬ষ্ঠ)', type: BookType.TEXTBOOK, displayOrder: 1 },

    // Class 7 Books
    { classNumeric: 7, subjectName: 'বাংলা ১ম পত্র', bookName: 'সপ্তবর্ণা', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'বাংলা ১ম পত্র', bookName: 'আনন্দপাঠ', type: BookType.SUPPLEMENTARY, displayOrder: 2 },
    { classNumeric: 7, subjectName: 'বাংলা ২য় পত্র', bookName: 'বাংলা ভাষার ব্যাকরণ ও নির্মিতি (৭ম)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'English 1st Paper', bookName: 'English For Today (Class 7)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'গণিত', bookName: 'গণিত (৭ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'বিজ্ঞান', bookName: 'বিজ্ঞান (৭ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'বাংলাদেশ ও বিশ্বপরিচয়', bookName: 'বাংলাদেশ ও বিশ্বপরিচয় (৭ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'ইসলাম ও নৈতিক শিক্ষা', bookName: 'ইসলাম ও নৈতিক শিক্ষা (৭ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 7, subjectName: 'তথ্য ও যোগাযোগ প্রযুক্তি', bookName: 'তথ্য ও যোগাযোগ প্রযুক্তি (৭ম)', type: BookType.TEXTBOOK, displayOrder: 1 },

    // Class 8 Books
    { classNumeric: 8, subjectName: 'বাংলা ১ম পত্র', bookName: 'সাহিত্য কণিকা', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'বাংলা ১ম পত্র', bookName: 'আনন্দপাঠ', type: BookType.SUPPLEMENTARY, displayOrder: 2 },
    { classNumeric: 8, subjectName: 'বাংলা ২য় পত্র', bookName: 'বাংলা ভাষার ব্যাকরণ ও নির্মিতি (৮ম)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'English 1st Paper', bookName: 'English For Today (Class 8)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'গণিত', bookName: 'গণিত (৮ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'বিজ্ঞান', bookName: 'বিজ্ঞান (৮ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'বাংলাদেশ ও বিশ্বপরিচয়', bookName: 'বাংলাদেশ ও বিশ্বপরিচয় (৮ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'ইসলাম ও নৈতিক শিক্ষা', bookName: 'ইসলাম ও নৈতিক শিক্ষা (৮ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 8, subjectName: 'তথ্য ও যোগাযোগ প্রযুক্তি', bookName: 'তথ্য ও যোগাযোগ প্রযুক্তি (৮ম)', type: BookType.TEXTBOOK, displayOrder: 1 },

    // Class 9 Books
    { classNumeric: 9, subjectName: 'বাংলা ১ম পত্র', bookName: 'সাহিত্য পাঠ (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'বাংলা ১ম পত্র', bookName: 'সহপাঠ (কাকতাড়ুয়া ও বহিপীর)', type: BookType.SUPPLEMENTARY, displayOrder: 2 },
    { classNumeric: 9, subjectName: 'বাংলা ২য় পত্র', bookName: 'বাংলা ভাষার ব্যাকরণ ও নির্মিতি (৯ম-১০ম)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'English 1st Paper', bookName: 'English For Today (Class 9-10)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'গণিত', bookName: 'গণিত (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'উচ্চতর গণিত', bookName: 'উচ্চতর গণিত (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'পদার্থবিজ্ঞান', bookName: 'পদার্থবিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'রসায়ন', bookName: 'রসায়ন (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'জীববিজ্ঞান', bookName: 'জীববিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'বাংলাদেশ ও বিশ্বপরিচয়', bookName: 'বাংলাদেশ ও বিশ্বপরিচয় (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'হিসাববিজ্ঞান', bookName: 'হিসাববিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'ফিন্যান্স ও ব্যাংকিং', bookName: 'ফিন্যান্স ও ব্যাংকিং (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'ব্যবসায় উদ্যোগ', bookName: 'ব্যবসায় উদ্যোগ (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'ইসলাম ও নৈতিক শিক্ষা', bookName: 'ইসলাম ও নৈতিক শিক্ষা (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'তথ্য ও যোগাযোগ প্রযুক্তি', bookName: 'তথ্য ও যোগাযোগ প্রযুক্তি (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 9, subjectName: 'কৃষিশিক্ষা', bookName: 'কৃষিশিক্ষা (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },

    // Class 10 Books
    { classNumeric: 10, subjectName: 'বাংলা ১ম পত্র', bookName: 'সাহিত্য পাঠ (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'বাংলা ১ম পত্র', bookName: 'সহপাঠ (কাকতাড়ুয়া ও বহিপীর)', type: BookType.SUPPLEMENTARY, displayOrder: 2 },
    { classNumeric: 10, subjectName: 'বাংলা ২য় পত্র', bookName: 'বাংলা ভাষার ব্যাকরণ ও নির্মিতি (৯ম-১০ম)', type: BookType.GRAMMAR, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'English 1st Paper', bookName: 'English For Today (Class 9-10)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'গণিত', bookName: 'গণিত (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'উচ্চতর গণিত', bookName: 'উচ্চতর গণিত (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'পদার্থবিজ্ঞান', bookName: 'পদার্থবিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'রসায়ন', bookName: 'রসায়ন (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'জীববিজ্ঞান', bookName: 'জীববিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'বাংলাদেশ ও বিশ্বপরিচয়', bookName: 'বাংলাদেশ ও বিশ্বপরিচয় (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'হিসাববিজ্ঞান', bookName: 'হিসাববিজ্ঞান (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'ফিন্যান্স ও ব্যাংকিং', bookName: 'ফিন্যান্স ও ব্যাংকিং (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'ব্যবসায় উদ্যোগ', bookName: 'ব্যবসায় উদ্যোগ (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'ইসলাম ও নৈতিক শিক্ষা', bookName: 'ইসলাম ও নৈতিক শিক্ষা (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'তথ্য ও যোগাযোগ প্রযুক্তি', bookName: 'তথ্য ও যোগাযোগ প্রযুক্তি (৯ম-১০ম)', type: BookType.TEXTBOOK, displayOrder: 1 },
    { classNumeric: 10, subjectName: 'কৃষিশিক্ষা', bookName: 'কৃষিশিক্ষা (৯ম-১০ম শ্রেণি)', type: BookType.TEXTBOOK, displayOrder: 1 },
  ];

  for (const b of booksData) {
    const classId = classMap.get(b.classNumeric);
    const subjectId = subjectMap.get(b.subjectName);

    if (!classId || !subjectId) {
      console.warn(`Skipping book "${b.bookName}" - class or subject not found.`);
      continue;
    }

    await prisma.book.upsert({
      where: {
        classId_subjectId_name: {
          classId,
          subjectId,
          name: b.bookName,
        },
      },
      update: {
        type: b.type,
        displayOrder: b.displayOrder,
        isActive: true,
      },
      create: {
        classId,
        subjectId,
        name: b.bookName,
        type: b.type,
        displayOrder: b.displayOrder,
        isActive: true,
      },
    });
  }

  console.log('✓ NCTB Academic Curriculum seeding completed successfully!');
}
