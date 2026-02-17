import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'admin@bazarbuy.ru';
  const adminPassword = 'admin123'; // Change this to a strong password!

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin already exists:', adminEmail);
  } else {
    // Create admin
    const admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        role: 'SUPERADMIN',
        publicId: 'ADM-001',
      },
    });

    console.log('✅ Admin created:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
  }

  // Create sample client (B2B company)
  const sampleClient = await prisma.client.findUnique({
    where: { email: 'info@example-company.ru' },
  }).catch(() => null);

  if (!sampleClient) {
    const client = await prisma.client.create({
      data: {
        email: 'info@example-company.ru',
        name: 'Example Company LLC',
        phone: '+7 (999) 123-45-67',
        inn: '7700000000',
        city: 'Moscow',
        publicId: 'CL-001',
      },
    });

    console.log('✅ Sample client created:');
    console.log(`   Email: ${client.email}`);
    console.log(`   Company: ${client.companyName}`);
  }

  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
