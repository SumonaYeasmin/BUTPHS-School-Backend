import { PrismaClient } from '../generated/client';

export const SYSTEM_PERMISSIONS = [
  { name: 'MANAGE_USERS', description: 'Can manage users, roles, and access control' },
  { name: 'MANAGE_STAFF', description: 'Can manage teachers, staff, and staff structure' },
  { name: 'MANAGE_STUDENTS', description: 'Can manage students and enrollments' },
  { name: 'MANAGE_ACADEMIC', description: 'Can manage classes, sections, and subjects' },
  { name: 'MANAGE_ROUTINES', description: 'Can manage class routines and exam routines' },
  { name: 'MANAGE_ATTENDANCE', description: 'Can record and manage student attendance' },
  { name: 'MANAGE_EXAMINATIONS', description: 'Can manage exams and grading scales' },
  { name: 'ENTER_MARKS', description: 'Can enter and update exam marks' },
  { name: 'PUBLISH_RESULTS', description: 'Can publish results and merit lists' },
  { name: 'MANAGE_NOTICES', description: 'Can create and publish notices and events' },
  { name: 'MANAGE_WEBSITE', description: 'Can manage public website content and gallery' },
  { name: 'VIEW_AUDIT_LOGS', description: 'Can view system activity and audit logs' },
];

export const SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    description: 'Full system administrator with all permissions',
    permissions: SYSTEM_PERMISSIONS.map((p) => p.name),
  },
  {
    name: 'TEACHER',
    description: 'Academic staff with marks entry, attendance, and routine access',
    permissions: [
      'MANAGE_ATTENDANCE',
      'ENTER_MARKS',
      'MANAGE_ROUTINES',
      'MANAGE_STUDENTS',
    ],
  },
  {
    name: 'PARENT',
    description: 'Guardian with child profile, attendance, and results viewing access',
    permissions: [],
  },
];

export async function seedRolesAndPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description },
    });
  }

  console.log('Seeding roles and role-permissions...');
  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    if (roleDef.permissions.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { name: { in: roleDef.permissions } },
      });

      for (const p of perms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: p.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: p.id,
          },
        });
      }
    }
  }

  console.log('Roles and permissions seeded successfully!');
}

