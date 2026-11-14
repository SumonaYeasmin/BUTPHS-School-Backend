import { PrismaClient } from '../generated/client';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const plainPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
  const adminPhone = process.env.ADMIN_PHONE || '01700000000';
  const adminName = process.env.ADMIN_NAME || 'Super Administrator';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  console.log(`Seeding admin user (${adminEmail})...`);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: hashedPassword,
      phone: adminPhone,
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!adminRole) {
    throw new Error('ADMIN role not found. Make sure seedRolesAndPermissions runs first.');
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log(`Admin user seeded: ${admin.email} (Role: ADMIN)`);
}
