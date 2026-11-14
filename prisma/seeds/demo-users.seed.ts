import { PrismaClient, StaffType, StaffStatus } from '../generated/client';
import * as bcrypt from 'bcrypt';

export async function seedDemoUsers(prisma: PrismaClient) {
  console.log('Seeding MVP Demo Users (Teacher & Parent)...');

  const teacherPasswordHash = await bcrypt.hash('teacherpassword', 10);
  const parentPasswordHash = await bcrypt.hash('parentpassword', 10);

  // 1. Seed Teacher User & Staff Profile
  const teacherRole = await prisma.role.findUnique({
    where: { name: 'TEACHER' },
  });

  if (teacherRole) {
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {
        name: 'Md. Rafiqul Islam (Teacher)',
        passwordHash: teacherPasswordHash,
        phone: '01711111111',
        isActive: true,
      },
      create: {
        name: 'Md. Rafiqul Islam (Teacher)',
        email: 'teacher@example.com',
        phone: '01711111111',
        passwordHash: teacherPasswordHash,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: teacherUser.id,
          roleId: teacherRole.id,
        },
      },
      update: {},
      create: {
        userId: teacherUser.id,
        roleId: teacherRole.id,
      },
    });

    const existingStaff = await prisma.staff.findFirst({
      where: {
        OR: [{ userId: teacherUser.id }, { email: 'teacher@example.com' }],
      },
    });

    if (existingStaff) {
      await prisma.staff.update({
        where: { id: existingStaff.id },
        data: {
          userId: teacherUser.id,
          designation: 'Senior Assistant Teacher',
          qualification: 'M.Sc in Mathematics, B.Ed',
          staffType: StaffType.TEACHER,
          status: StaffStatus.ACTIVE,
        },
      });
    } else {
      await prisma.staff.create({
        data: {
          userId: teacherUser.id,
          name: 'Md. Rafiqul Islam',
          designation: 'Senior Assistant Teacher',
          qualification: 'M.Sc in Mathematics, B.Ed',
          staffType: StaffType.TEACHER,
          phone: '01711111111',
          email: 'teacher@example.com',
          status: StaffStatus.ACTIVE,
        },
      });
    }
    console.log('Teacher user seeded: teacher@example.com (Role: TEACHER)');
  }

  // 2. Seed Parent User & Parent Profile
  const parentRole = await prisma.role.findUnique({
    where: { name: 'PARENT' },
  });

  if (parentRole) {
    const parentUser = await prisma.user.upsert({
      where: { email: 'parent@example.com' },
      update: {
        name: 'Abdul Karim (Guardian)',
        passwordHash: parentPasswordHash,
        phone: '01822222222',
        isActive: true,
      },
      create: {
        name: 'Abdul Karim (Guardian)',
        email: 'parent@example.com',
        phone: '01822222222',
        passwordHash: parentPasswordHash,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: parentUser.id,
          roleId: parentRole.id,
        },
      },
      update: {},
      create: {
        userId: parentUser.id,
        roleId: parentRole.id,
      },
    });

    const existingParent = await prisma.parent.findFirst({
      where: {
        OR: [{ userId: parentUser.id }, { email: 'parent@example.com' }],
      },
    });

    if (existingParent) {
      await prisma.parent.update({
        where: { id: existingParent.id },
        data: {
          userId: parentUser.id,
          phone: '01822222222',
          occupation: 'Businessman',
          address: 'Bogura Sadar, Bogura',
        },
      });
    } else {
      await prisma.parent.create({
        data: {
          userId: parentUser.id,
          name: 'Abdul Karim',
          phone: '01822222222',
          email: 'parent@example.com',
          occupation: 'Businessman',
          address: 'Bogura Sadar, Bogura',
        },
      });
    }
    console.log('Parent user seeded: parent@example.com (Role: PARENT)');
  }
}

