import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';
import { seedRolesAndPermissions } from './roles-permissions.seed';
import { seedAdmin } from './admin.seed';
import { seedDemoUsers } from './demo-users.seed';
import { seedCurriculum } from './curriculum.seed';

const connectionString =
  process.env.DATABASE_URL || process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Roles and Permissions
  await seedRolesAndPermissions(prisma);

  // 2. Seed Super Admin
  await seedAdmin(prisma);

  // 3. Seed Demo Users (Teacher & Parent)
  await seedDemoUsers(prisma);

  // 4. Seed NCTB Curriculum (Classes, Groups, Subjects, Books)
  await seedCurriculum(prisma);

  console.log('--- Database Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
