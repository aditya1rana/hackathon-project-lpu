import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed script — Populates the database with initial roles,
 * an admin user, sample categories, and test data.
 */
async function main() {
  console.log('🌱 Seeding database...');

  // ─── Roles ──────────────────────────────────────────────
  const roles = await Promise.all(
    (['ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT', 'STUDENT'] as RoleName[]).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name.replace('_', ' ')} role` },
      })
    )
  );
  console.log(`  ✅ ${roles.length} roles created`);

  // ─── Admin User ─────────────────────────────────────────
  const adminRole = roles.find((r) => r.name === 'ADMIN')!;
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.local' },
    update: {},
    create: {
      email: 'admin@inventory.local',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      department: 'IT Administration',
      roleId: adminRole.id,
    },
  });
  console.log(`  ✅ Admin user: admin@inventory.local / Admin@123`);

  // ─── Sample Categories ──────────────────────────────────
  const categories = await Promise.all(
    [
      { name: 'Electronics', description: 'Electronic components and devices' },
      { name: 'Lab Equipment', description: 'Laboratory instruments and apparatus' },
      { name: 'Books', description: 'Library books and reference materials' },
      { name: 'Chemicals', description: 'Laboratory chemicals and reagents' },
      { name: 'Furniture', description: 'Tables, chairs, and storage units' },
      { name: 'Software', description: 'Software licenses and subscriptions' },
      { name: 'Stationery', description: 'Office and lab stationery supplies' },
      { name: 'Safety Equipment', description: 'PPE and safety gear' },
    ].map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      })
    )
  );
  console.log(`  ✅ ${categories.length} categories created`);

  // ─── Sample Suppliers ───────────────────────────────────
  const supplier = await prisma.supplier.create({
    data: {
      name: 'TechParts India',
      contactName: 'Raj Kumar',
      email: 'sales@techparts.in',
      phone: '+91-9876543210',
      address: 'Nehru Place, New Delhi',
      leadTimeDays: 7,
      rating: 4.5,
    },
  });
  console.log(`  ✅ Sample supplier created`);

  // ─── Sample Inventory Items ─────────────────────────────
  const electronicsCategory = categories.find((c) => c.name === 'Electronics')!;
  const labCategory = categories.find((c) => c.name === 'Lab Equipment')!;
  const booksCategory = categories.find((c) => c.name === 'Books')!;

  const items = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        name: 'Arduino Uno R3',
        description: 'ATmega328P microcontroller board',
        quantity: 50,
        minStock: 10,
        location: 'Lab A - Shelf 3',
        barcode: 'ARD-001',
        unitPrice: 450,
        categoryId: electronicsCategory.id,
        supplierId: supplier.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Digital Multimeter',
        description: 'Fluke 17B+ digital multimeter',
        quantity: 25,
        minStock: 5,
        location: 'Lab A - Cabinet 2',
        barcode: 'DMM-001',
        unitPrice: 3200,
        categoryId: electronicsCategory.id,
        supplierId: supplier.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Beaker 500ml',
        description: 'Borosilicate glass beaker',
        quantity: 100,
        minStock: 20,
        location: 'Chemistry Lab - Rack 1',
        barcode: 'BKR-500',
        unitPrice: 150,
        isConsumable: true,
        categoryId: labCategory.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: 'Data Structures & Algorithms',
        description: 'by Cormen, Leiserson, Rivest, Stein (CLRS)',
        quantity: 15,
        minStock: 3,
        location: 'Library - Section CS-001',
        barcode: 'BK-CLRS-001',
        unitPrice: 850,
        categoryId: booksCategory.id,
      },
    }),
  ]);
  console.log(`  ✅ ${items.length} sample items created`);

  // ─── Sample Requests ────────────────────────────────────
  const requests = await Promise.all([
    prisma.request.create({
      data: {
        userId: admin.id,
        itemId: items[0].id,
        quantity: 5,
        purpose: 'Hackathon hardware demo',
        status: 'PENDING',
      }
    }),
    prisma.request.create({
      data: {
        userId: admin.id,
        itemId: items[1].id,
        quantity: 2,
        purpose: 'Lab testing',
        status: 'APPROVED',
        approvedAt: new Date(),
      }
    }),
    prisma.request.create({
      data: {
        userId: admin.id,
        itemId: items[2].id,
        quantity: 10,
        purpose: 'Chemistry experiment',
        status: 'REJECTED',
        rejectedAt: new Date(),
        remarks: 'Insufficient stock for this class size',
      }
    })
  ]);
  console.log(`  ✅ ${requests.length} sample requests created`);

  console.log('\n🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
