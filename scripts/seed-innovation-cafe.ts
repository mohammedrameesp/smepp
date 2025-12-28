import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Innovation Cafe with demo data...\n');

  // Find Innovation Cafe organization
  const org = await prisma.organization.findFirst({
    where: { slug: 'innovation-cafe' }
  });

  if (!org) {
    console.error('❌ Organization "innovation-cafe" not found!');
    return;
  }

  console.log(`✅ Found organization: ${org.name} (${org.id})\n`);
  const tenantId = org.id;

  // Get the owner/admin user
  const orgUser = await prisma.organizationUser.findFirst({
    where: { organizationId: tenantId, role: 'OWNER' },
    include: { user: true }
  });

  if (!orgUser) {
    console.error('❌ No owner found for organization!');
    return;
  }

  const adminUserId = orgUser.userId;
  console.log(`✅ Using admin user: ${orgUser.user.name} (${adminUserId})\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 1. CREATE EMPLOYEES WITH HR PROFILES
  // ═══════════════════════════════════════════════════════════════════
  console.log('👥 Creating employees...');

  const employees = [
    { name: 'Sarah Al-Mahmoud', email: 'sarah@innovation-cafe.qa', role: 'MANAGER', designation: 'Operations Manager', gender: 'Female' },
    { name: 'Ahmed Hassan', email: 'ahmed@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Senior Barista', gender: 'Male' },
    { name: 'Fatima Al-Thani', email: 'fatima@innovation-cafe.qa', role: 'HR_MANAGER', designation: 'HR & Admin', gender: 'Female' },
    { name: 'Mohammed Rashid', email: 'mohammed@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Head Chef', gender: 'Male' },
    { name: 'Layla Ibrahim', email: 'layla@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Marketing Coordinator', gender: 'Female' },
    { name: 'Omar Khalil', email: 'omar@innovation-cafe.qa', role: 'FINANCE_MANAGER', designation: 'Finance Manager', gender: 'Male' },
    { name: 'Noura Al-Suwaidi', email: 'noura@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Customer Service Lead', gender: 'Female' },
    { name: 'Khalid Al-Naimi', email: 'khalid@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Inventory Specialist', gender: 'Male' },
    { name: 'Aisha Mansoor', email: 'aisha@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Pastry Chef', gender: 'Female' },
    { name: 'Youssef Al-Marri', email: 'youssef@innovation-cafe.qa', role: 'EMPLOYEE', designation: 'Delivery Coordinator', gender: 'Male' },
  ];

  const createdUsers: { id: string; name: string }[] = [];

  for (const emp of employees) {
    const existing = await prisma.user.findUnique({ where: { email: emp.email } });
    if (existing) {
      createdUsers.push({ id: existing.id, name: emp.name });
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        role: emp.role as any,
        isEmployee: true,
        canLogin: true,
        organizationMemberships: {
          create: {
            organizationId: tenantId,
            role: emp.role === 'MANAGER' ? 'MANAGER' : emp.role === 'HR_MANAGER' ? 'ADMIN' : 'MEMBER'
          }
        }
      }
    });

    // Create HR Profile
    await prisma.hRProfile.create({
      data: {
        tenantId,
        userId: user.id,
        gender: emp.gender,
        nationality: 'Qatari',
        designation: emp.designation,
        dateOfJoining: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        qidNumber: `284${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        qidExpiry: new Date(2026, Math.floor(Math.random() * 12), 15),
        passportNumber: `A${Math.floor(10000000 + Math.random() * 89999999)}`,
        passportExpiry: new Date(2028, Math.floor(Math.random() * 12), 15),
        bankName: ['Qatar National Bank', 'Commercial Bank of Qatar', 'Doha Bank'][Math.floor(Math.random() * 3)],
        iban: `QA${Math.floor(10000000000000000000000000 + Math.random() * 89999999999999999999999999)}`.slice(0, 29),
        qatarMobile: `${['3', '5', '6', '7'][Math.floor(Math.random() * 4)]}${Math.floor(1000000 + Math.random() * 8999999)}`,
        onboardingComplete: true,
      }
    });

    createdUsers.push({ id: user.id, name: emp.name });
  }
  console.log(`  ✓ Created ${createdUsers.length} employees\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 2. CREATE ASSETS
  // ═══════════════════════════════════════════════════════════════════
  console.log('📦 Creating assets...');

  const assets = [
    // IT Equipment
    { type: 'Laptop', category: 'IT Equipment', brand: 'Apple', model: 'MacBook Pro 14"', price: 8500, status: 'IN_USE' },
    { type: 'Laptop', category: 'IT Equipment', brand: 'Dell', model: 'XPS 15', price: 6200, status: 'IN_USE' },
    { type: 'Laptop', category: 'IT Equipment', brand: 'HP', model: 'EliteBook 840', price: 4800, status: 'SPARE' },
    { type: 'Desktop', category: 'IT Equipment', brand: 'Apple', model: 'iMac 27"', price: 9500, status: 'IN_USE' },
    { type: 'Monitor', category: 'IT Equipment', brand: 'LG', model: '27" 4K UltraFine', price: 2200, status: 'IN_USE' },
    { type: 'Monitor', category: 'IT Equipment', brand: 'Samsung', model: '32" Curved', price: 1800, status: 'IN_USE' },
    { type: 'Printer', category: 'IT Equipment', brand: 'HP', model: 'LaserJet Pro MFP', price: 2500, status: 'IN_USE' },
    { type: 'Router', category: 'IT Equipment', brand: 'Cisco', model: 'Business Router RV345', price: 1500, status: 'IN_USE' },
    { type: 'iPad', category: 'IT Equipment', brand: 'Apple', model: 'iPad Pro 12.9"', price: 4500, status: 'IN_USE' },
    { type: 'iPad', category: 'IT Equipment', brand: 'Apple', model: 'iPad Air', price: 2800, status: 'IN_USE' },

    // Cafe Equipment
    { type: 'Espresso Machine', category: 'Cafe Equipment', brand: 'La Marzocco', model: 'Linea PB', price: 55000, status: 'IN_USE' },
    { type: 'Coffee Grinder', category: 'Cafe Equipment', brand: 'Mahlkönig', model: 'E65S', price: 8500, status: 'IN_USE' },
    { type: 'Coffee Grinder', category: 'Cafe Equipment', brand: 'Baratza', model: 'Forte BG', price: 3200, status: 'SPARE' },
    { type: 'Ice Machine', category: 'Cafe Equipment', brand: 'Hoshizaki', model: 'IM-240ANE', price: 12000, status: 'IN_USE' },
    { type: 'Blender', category: 'Cafe Equipment', brand: 'Vitamix', model: 'Quiet One', price: 4500, status: 'IN_USE' },
    { type: 'Blender', category: 'Cafe Equipment', brand: 'Vitamix', model: 'E520', price: 2800, status: 'IN_USE' },
    { type: 'Refrigerator', category: 'Cafe Equipment', brand: 'True', model: 'T-23-HC', price: 15000, status: 'IN_USE' },
    { type: 'Display Cooler', category: 'Cafe Equipment', brand: 'Turbo Air', model: 'TGM-23RB', price: 8500, status: 'IN_USE' },
    { type: 'Oven', category: 'Cafe Equipment', brand: 'Rational', model: 'iCombi Pro', price: 45000, status: 'IN_USE' },
    { type: 'Dishwasher', category: 'Cafe Equipment', brand: 'Hobart', model: 'AM15', price: 18000, status: 'IN_USE' },

    // Furniture
    { type: 'Table', category: 'Furniture', brand: 'Custom', model: 'Wood Dining Table (4-seater)', price: 2500, status: 'IN_USE' },
    { type: 'Table', category: 'Furniture', brand: 'Custom', model: 'Wood Dining Table (6-seater)', price: 3500, status: 'IN_USE' },
    { type: 'Chair', category: 'Furniture', brand: 'Herman Miller', model: 'Eames Side Chair', price: 1200, status: 'IN_USE' },
    { type: 'Sofa', category: 'Furniture', brand: 'Custom', model: 'L-Shaped Lounge Sofa', price: 8500, status: 'IN_USE' },
    { type: 'Counter', category: 'Furniture', brand: 'Custom', model: 'Main Service Counter', price: 25000, status: 'IN_USE' },

    // POS & Electronics
    { type: 'POS Terminal', category: 'POS System', brand: 'Lightspeed', model: 'Restaurant POS', price: 5500, status: 'IN_USE' },
    { type: 'POS Terminal', category: 'POS System', brand: 'Lightspeed', model: 'Restaurant POS', price: 5500, status: 'IN_USE' },
    { type: 'Card Reader', category: 'POS System', brand: 'Verifone', model: 'VX520', price: 800, status: 'IN_USE' },
    { type: 'Cash Drawer', category: 'POS System', brand: 'APG', model: 'Vasario', price: 450, status: 'IN_USE' },
    { type: 'Receipt Printer', category: 'POS System', brand: 'Epson', model: 'TM-T88VI', price: 1200, status: 'IN_USE' },

    // Vehicles
    { type: 'Van', category: 'Vehicles', brand: 'Toyota', model: 'HiAce Delivery Van', price: 85000, status: 'IN_USE' },
    { type: 'Motorcycle', category: 'Vehicles', brand: 'Honda', model: 'PCX 150', price: 12000, status: 'IN_USE' },
    { type: 'Motorcycle', category: 'Vehicles', brand: 'Yamaha', model: 'NMAX 155', price: 11000, status: 'IN_USE' },
  ];

  let assetCount = 0;
  for (const asset of assets) {
    const existingCount = await prisma.asset.count({ where: { tenantId, type: asset.type, model: asset.model } });
    if (existingCount > 0) continue;

    const assignedUser = asset.status === 'IN_USE' ? createdUsers[Math.floor(Math.random() * createdUsers.length)] : null;

    await prisma.asset.create({
      data: {
        tenantId,
        assetTag: `IC-${asset.category.substring(0, 2).toUpperCase()}-${String(assetCount + 1).padStart(4, '0')}`,
        type: asset.type,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        status: asset.status as any,
        price: asset.price,
        priceCurrency: 'QAR',
        priceQAR: asset.price,
        purchaseDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        warrantyExpiry: new Date(2025, Math.floor(Math.random() * 12), 15),
        assignedUserId: assignedUser?.id,
        assignmentDate: assignedUser ? new Date().toISOString().split('T')[0] : null,
        location: ['Main Cafe', 'Kitchen', 'Office', 'Storage Room', 'Delivery Bay'][Math.floor(Math.random() * 5)],
      }
    });
    assetCount++;
  }
  console.log(`  ✓ Created ${assetCount} assets\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 3. CREATE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════
  console.log('💳 Creating subscriptions...');

  const subscriptions = [
    { name: 'Lightspeed POS', category: 'POS & Operations', cost: 350, cycle: 'MONTHLY', vendor: 'Lightspeed' },
    { name: 'QuickBooks Online', category: 'Accounting', cost: 180, cycle: 'MONTHLY', vendor: 'Intuit' },
    { name: 'Slack Business+', category: 'Communication', cost: 480, cycle: 'MONTHLY', vendor: 'Slack' },
    { name: 'Microsoft 365 Business', category: 'Productivity', cost: 550, cycle: 'MONTHLY', vendor: 'Microsoft' },
    { name: 'Adobe Creative Cloud', category: 'Design', cost: 250, cycle: 'MONTHLY', vendor: 'Adobe' },
    { name: 'Canva Pro', category: 'Design', cost: 45, cycle: 'MONTHLY', vendor: 'Canva' },
    { name: 'Instagram Business', category: 'Marketing', cost: 0, cycle: 'MONTHLY', vendor: 'Meta' },
    { name: 'Google Workspace', category: 'Productivity', cost: 280, cycle: 'MONTHLY', vendor: 'Google' },
    { name: 'Ooredoo Business Internet', category: 'Internet', cost: 850, cycle: 'MONTHLY', vendor: 'Ooredoo' },
    { name: 'Zoom Business', category: 'Communication', cost: 75, cycle: 'MONTHLY', vendor: 'Zoom' },
    { name: 'Mailchimp Standard', category: 'Marketing', cost: 65, cycle: 'MONTHLY', vendor: 'Mailchimp' },
    { name: 'Hootsuite Professional', category: 'Marketing', cost: 180, cycle: 'MONTHLY', vendor: 'Hootsuite' },
    { name: 'Xero Accounting', category: 'Accounting', cost: 120, cycle: 'MONTHLY', vendor: 'Xero' },
    { name: 'Deliveroo for Business', category: 'Delivery', cost: 0, cycle: 'MONTHLY', vendor: 'Deliveroo' },
    { name: 'Talabat Partner', category: 'Delivery', cost: 0, cycle: 'MONTHLY', vendor: 'Talabat' },
    { name: 'Deputy Scheduling', category: 'HR', cost: 120, cycle: 'MONTHLY', vendor: 'Deputy' },
    { name: 'Spotify Business', category: 'Entertainment', cost: 95, cycle: 'MONTHLY', vendor: 'Spotify' },
    { name: 'CCTV Monitoring Service', category: 'Security', cost: 200, cycle: 'MONTHLY', vendor: 'Qatar Security' },
    { name: 'Fire Alarm Maintenance', category: 'Safety', cost: 1500, cycle: 'YEARLY', vendor: 'Qatar Civil Defense' },
    { name: 'Pest Control Service', category: 'Maintenance', cost: 400, cycle: 'MONTHLY', vendor: 'Rentokil' },
  ];

  let subCount = 0;
  for (const sub of subscriptions) {
    const existing = await prisma.subscription.findFirst({
      where: { tenantId, serviceName: sub.name }
    });
    if (existing) continue;

    await prisma.subscription.create({
      data: {
        tenantId,
        serviceName: sub.name,
        category: sub.category,
        vendor: sub.vendor,
        billingCycle: sub.cycle as any,
        costPerCycle: sub.cost,
        costCurrency: 'QAR',
        costQAR: sub.cost,
        status: 'ACTIVE',
        renewalDate: new Date(2025, Math.floor(Math.random() * 12), 15),
        purchaseDate: new Date(2023, Math.floor(Math.random() * 12), 1),
        autoRenew: true,
      }
    });
    subCount++;
  }
  console.log(`  ✓ Created ${subCount} subscriptions\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 4. CREATE SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🚚 Creating suppliers...');

  const suppliers = [
    { name: 'Qatar Coffee Imports', category: 'Coffee & Beverages', city: 'Doha', status: 'APPROVED' },
    { name: 'Gulf Fresh Dairy', category: 'Dairy Products', city: 'Doha', status: 'APPROVED' },
    { name: 'Al Meera Foods', category: 'Food Supplies', city: 'Doha', status: 'APPROVED' },
    { name: 'Baladna Dairy', category: 'Dairy Products', city: 'Al Khor', status: 'APPROVED' },
    { name: 'Qatar Bakery Supplies', category: 'Bakery Ingredients', city: 'Doha', status: 'APPROVED' },
    { name: 'Al Sulaiteen Trading', category: 'General Supplies', city: 'Doha', status: 'APPROVED' },
    { name: 'ProPack Qatar', category: 'Packaging', city: 'Industrial Area', status: 'APPROVED' },
    { name: 'Restaurant Equipment ME', category: 'Equipment', city: 'Doha', status: 'APPROVED' },
    { name: 'Lavazza Arabia', category: 'Coffee Beans', city: 'Dubai (UAE)', status: 'APPROVED' },
    { name: 'Monin Middle East', category: 'Syrups & Flavors', city: 'Dubai (UAE)', status: 'APPROVED' },
    { name: 'Al Safwa Cleaning', category: 'Cleaning Supplies', city: 'Doha', status: 'APPROVED' },
    { name: 'Qatar Paper Products', category: 'Paper & Napkins', city: 'Industrial Area', status: 'APPROVED' },
    { name: 'Fresh Farms Qatar', category: 'Fresh Produce', city: 'Al Wakra', status: 'PENDING' },
    { name: 'Ice Factory Doha', category: 'Ice Supply', city: 'Doha', status: 'APPROVED' },
    { name: 'Chef Uniforms Qatar', category: 'Uniforms', city: 'Doha', status: 'APPROVED' },
  ];

  let suppCount = 0;
  for (let i = 0; i < suppliers.length; i++) {
    const supp = suppliers[i];
    const existing = await prisma.supplier.findFirst({
      where: { tenantId, name: supp.name }
    });
    if (existing) continue;

    await prisma.supplier.create({
      data: {
        tenantId,
        suppCode: supp.status === 'APPROVED' ? `SUPP-${String(suppCount + 1).padStart(4, '0')}` : null,
        name: supp.name,
        category: supp.category,
        city: supp.city,
        country: supp.city.includes('UAE') ? 'United Arab Emirates' : 'Qatar',
        status: supp.status as any,
        primaryContactName: `Contact ${i + 1}`,
        primaryContactEmail: `contact@${supp.name.toLowerCase().replace(/\s+/g, '')}.com`,
        primaryContactMobile: `+974 ${Math.floor(30000000 + Math.random() * 69999999)}`,
        approvedAt: supp.status === 'APPROVED' ? new Date() : null,
        approvedById: supp.status === 'APPROVED' ? adminUserId : null,
      }
    });
    suppCount++;
  }
  console.log(`  ✓ Created ${suppCount} suppliers\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 5. CREATE PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('📁 Creating projects...');

  const projects = [
    { code: 'IC-2024-001', name: 'New Branch Opening - Pearl Qatar', status: 'ACTIVE', client: 'INTERNAL' },
    { code: 'IC-2024-002', name: 'Menu Redesign & Photography', status: 'COMPLETED', client: 'INTERNAL' },
    { code: 'IC-2024-003', name: 'Kitchen Renovation', status: 'PLANNING', client: 'INTERNAL' },
    { code: 'IC-2024-004', name: 'Catering - Qatar Foundation Event', status: 'ACTIVE', client: 'EXTERNAL' },
    { code: 'IC-2024-005', name: 'Mobile App Development', status: 'ON_HOLD', client: 'EXTERNAL' },
    { code: 'IC-2025-001', name: 'Summer Promotion Campaign', status: 'PLANNING', client: 'INTERNAL' },
    { code: 'IC-2025-002', name: 'Staff Training Program', status: 'ACTIVE', client: 'INTERNAL' },
  ];

  let projCount = 0;
  for (const proj of projects) {
    const existing = await prisma.project.findFirst({
      where: { code: proj.code }
    });
    if (existing) continue;

    await prisma.project.create({
      data: {
        tenantId,
        code: proj.code,
        name: proj.name,
        status: proj.status as any,
        clientType: proj.client as any,
        clientName: proj.client === 'EXTERNAL' ? 'External Client' : null,
        startDate: new Date(2024, Math.floor(Math.random() * 6), 1),
        endDate: proj.status === 'COMPLETED' ? new Date() : new Date(2025, Math.floor(Math.random() * 6) + 6, 30),
        managerId: createdUsers[0].id,
        createdById: adminUserId,
      }
    });
    projCount++;
  }
  console.log(`  ✓ Created ${projCount} projects\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 6. CREATE LEAVE TYPES
  // ═══════════════════════════════════════════════════════════════════
  console.log('🏖️ Creating leave types...');

  const leaveTypes = [
    { name: 'Annual Leave', defaultDays: 21, color: '#3B82F6', category: 'STANDARD', isPaid: true },
    { name: 'Sick Leave', defaultDays: 14, color: '#EF4444', category: 'MEDICAL', isPaid: true, requiresDocument: true },
    { name: 'Unpaid Leave', defaultDays: 0, color: '#6B7280', category: 'STANDARD', isPaid: false },
    { name: 'Maternity Leave', defaultDays: 50, color: '#EC4899', category: 'PARENTAL', isPaid: true, gender: 'FEMALE' },
    { name: 'Paternity Leave', defaultDays: 3, color: '#8B5CF6', category: 'PARENTAL', isPaid: true, gender: 'MALE' },
    { name: 'Hajj Leave', defaultDays: 14, color: '#10B981', category: 'RELIGIOUS', isPaid: true },
    { name: 'Compassionate Leave', defaultDays: 3, color: '#F59E0B', category: 'STANDARD', isPaid: true },
  ];

  const createdLeaveTypes: { id: string; name: string; defaultDays: number }[] = [];
  for (const lt of leaveTypes) {
    const existing = await prisma.leaveType.findFirst({
      where: { tenantId, name: lt.name }
    });
    if (existing) {
      createdLeaveTypes.push({ id: existing.id, name: lt.name, defaultDays: lt.defaultDays });
      continue;
    }

    const created = await prisma.leaveType.create({
      data: {
        tenantId,
        name: lt.name,
        defaultDays: lt.defaultDays,
        color: lt.color,
        category: lt.category as any,
        isPaid: lt.isPaid,
        requiresDocument: lt.requiresDocument || false,
        genderRestriction: lt.gender || null,
        isActive: true,
        requiresApproval: true,
      }
    });
    createdLeaveTypes.push({ id: created.id, name: lt.name, defaultDays: lt.defaultDays });
  }
  console.log(`  ✓ Created ${createdLeaveTypes.length} leave types\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 7. CREATE LEAVE BALANCES FOR EMPLOYEES
  // ═══════════════════════════════════════════════════════════════════
  console.log('📊 Creating leave balances...');

  let balanceCount = 0;
  for (const user of createdUsers) {
    for (const lt of createdLeaveTypes) {
      if (lt.defaultDays === 0) continue;

      const existing = await prisma.leaveBalance.findFirst({
        where: { tenantId, userId: user.id, leaveTypeId: lt.id, year: 2025 }
      });
      if (existing) continue;

      await prisma.leaveBalance.create({
        data: {
          tenantId,
          userId: user.id,
          leaveTypeId: lt.id,
          year: 2025,
          entitlement: lt.defaultDays,
          used: Math.floor(Math.random() * Math.min(5, lt.defaultDays)),
          pending: 0,
          carriedForward: Math.floor(Math.random() * 3),
        }
      });
      balanceCount++;
    }
  }
  console.log(`  ✓ Created ${balanceCount} leave balances\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 8. CREATE LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('📝 Creating leave requests...');

  const leaveStatuses = ['PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED'];
  let leaveReqCount = 0;

  for (let i = 0; i < 15; i++) {
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const leaveType = createdLeaveTypes[Math.floor(Math.random() * createdLeaveTypes.length)];
    const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];
    const startDate = new Date(2025, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
    const days = Math.floor(Math.random() * 5) + 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        requestNumber: `LR-${String(leaveReqCount + 1).padStart(5, '0')}`,
        userId: user.id,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        totalDays: days,
        status: status as any,
        reason: ['Family event', 'Personal matters', 'Medical appointment', 'Vacation', 'Rest'][Math.floor(Math.random() * 5)],
        approverId: status !== 'PENDING' ? adminUserId : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectedAt: status === 'REJECTED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' ? 'Insufficient leave balance' : null,
      }
    });
    leaveReqCount++;
  }
  console.log(`  ✓ Created ${leaveReqCount} leave requests\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 9. CREATE PURCHASE REQUESTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🛒 Creating purchase requests...');

  const purchaseRequests = [
    { title: 'New Coffee Grinder', type: 'HARDWARE', amount: 8500, status: 'APPROVED' },
    { title: 'Monthly Office Supplies', type: 'OFFICE_SUPPLIES', amount: 1200, status: 'COMPLETED' },
    { title: 'Social Media Marketing', type: 'MARKETING', amount: 5000, status: 'PENDING' },
    { title: 'Staff Training Courses', type: 'TRAINING', amount: 3500, status: 'APPROVED' },
    { title: 'Website Redesign', type: 'SERVICES', amount: 15000, status: 'UNDER_REVIEW' },
    { title: 'New Uniforms Batch', type: 'OTHER', amount: 4500, status: 'APPROVED' },
    { title: 'POS Software Upgrade', type: 'SOFTWARE_SUBSCRIPTION', amount: 2800, status: 'PENDING' },
    { title: 'Kitchen Equipment Maintenance', type: 'SERVICES', amount: 2200, status: 'COMPLETED' },
    { title: 'New Menu Printing', type: 'MARKETING', amount: 1800, status: 'APPROVED' },
    { title: 'Delivery Scooter Repair', type: 'SERVICES', amount: 950, status: 'COMPLETED' },
  ];

  let prCount = 0;
  for (const pr of purchaseRequests) {
    const reqNum = `IC-PR-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(prCount + 1).padStart(4, '0')}`;

    const existing = await prisma.purchaseRequest.findFirst({
      where: { referenceNumber: reqNum }
    });
    if (existing) continue;

    await prisma.purchaseRequest.create({
      data: {
        tenantId,
        referenceNumber: reqNum,
        requesterId: createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
        title: pr.title,
        description: `Request for ${pr.title.toLowerCase()}`,
        status: pr.status as any,
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        purchaseType: pr.type as any,
        costType: 'OPERATING_COST',
        totalAmount: pr.amount,
        currency: 'QAR',
        totalAmountQAR: pr.amount,
        reviewedById: pr.status !== 'PENDING' ? adminUserId : null,
        reviewedAt: pr.status !== 'PENDING' ? new Date() : null,
        items: {
          create: [{
            itemNumber: 1,
            description: pr.title,
            quantity: 1,
            unitPrice: pr.amount,
            currency: 'QAR',
            unitPriceQAR: pr.amount,
            totalPrice: pr.amount,
            totalPriceQAR: pr.amount,
          }]
        }
      }
    });
    prCount++;
  }
  console.log(`  ✓ Created ${prCount} purchase requests\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 10. CREATE SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════════
  console.log('💰 Creating salary structures...');

  const salaryRanges = [
    { min: 8000, max: 15000 },   // Employees
    { min: 12000, max: 20000 },  // Senior/Lead
    { min: 18000, max: 30000 },  // Managers
  ];

  let salaryCount = 0;
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const existing = await prisma.salaryStructure.findFirst({
      where: { userId: user.id }
    });
    if (existing) continue;

    const range = salaryRanges[Math.min(Math.floor(i / 4), 2)];
    const basic = Math.floor(range.min + Math.random() * (range.max - range.min));
    const housing = Math.floor(basic * 0.25);
    const transport = 1500;
    const food = 1000;
    const phone = 300;
    const gross = basic + housing + transport + food + phone;

    await prisma.salaryStructure.create({
      data: {
        tenantId,
        userId: user.id,
        basicSalary: basic,
        housingAllowance: housing,
        transportAllowance: transport,
        foodAllowance: food,
        phoneAllowance: phone,
        otherAllowances: 0,
        grossSalary: gross,
        currency: 'QAR',
        effectiveFrom: new Date(2024, 0, 1),
        isActive: true,
      }
    });
    salaryCount++;
  }
  console.log(`  ✓ Created ${salaryCount} salary structures\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 11. CREATE COMPANY DOCUMENT TYPES
  // ═══════════════════════════════════════════════════════════════════
  console.log('📋 Creating company document types...');

  const docTypes = [
    { name: 'Commercial Registration (CR)', code: 'CR', category: 'COMPANY' },
    { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY' },
    { name: 'Municipality License', code: 'MUNICIPALITY', category: 'COMPANY' },
    { name: 'Food Handling License', code: 'FOOD_LICENSE', category: 'COMPANY' },
    { name: 'Fire Safety Certificate', code: 'FIRE_SAFETY', category: 'COMPANY' },
    { name: 'Health Certificate', code: 'HEALTH_CERT', category: 'COMPANY' },
    { name: 'Insurance Policy', code: 'INSURANCE', category: 'COMPANY' },
    { name: 'Vehicle Registration (Istimara)', code: 'ISTIMARA', category: 'VEHICLE' },
    { name: 'Vehicle Insurance', code: 'VEHICLE_INSURANCE', category: 'VEHICLE' },
  ];

  const createdDocTypes: { id: string; name: string }[] = [];
  for (const dt of docTypes) {
    const existing = await prisma.companyDocumentType.findFirst({
      where: { tenantId, code: dt.code }
    });
    if (existing) {
      createdDocTypes.push({ id: existing.id, name: dt.name });
      continue;
    }

    const created = await prisma.companyDocumentType.create({
      data: {
        tenantId,
        name: dt.name,
        code: dt.code,
        category: dt.category,
        isActive: true,
      }
    });
    createdDocTypes.push({ id: created.id, name: dt.name });
  }
  console.log(`  ✓ Created ${createdDocTypes.length} document types\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 12. CREATE COMPANY DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('📄 Creating company documents...');

  let docCount = 0;
  for (const dt of createdDocTypes) {
    const existing = await prisma.companyDocument.findFirst({
      where: { tenantId, documentTypeId: dt.id }
    });
    if (existing) continue;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 24) + 1);

    await prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeId: dt.id,
        referenceNumber: `DOC-${Math.floor(100000 + Math.random() * 899999)}`,
        issuedBy: ['Ministry of Commerce', 'Municipality', 'Civil Defense', 'Ministry of Health'][Math.floor(Math.random() * 4)],
        expiryDate,
        renewalCost: Math.floor(500 + Math.random() * 5000),
        createdById: adminUserId,
      }
    });
    docCount++;
  }
  console.log(`  ✓ Created ${docCount} company documents\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 13. CREATE EMPLOYEE LOANS
  // ═══════════════════════════════════════════════════════════════════
  console.log('🏦 Creating employee loans...');

  const loanUsers = createdUsers.slice(0, 3);
  let loanCount = 0;
  for (const user of loanUsers) {
    const existing = await prisma.employeeLoan.findFirst({
      where: { userId: user.id }
    });
    if (existing) continue;

    const principal = [5000, 10000, 15000, 20000][Math.floor(Math.random() * 4)];
    const installments = [6, 12, 18, 24][Math.floor(Math.random() * 4)];
    const monthly = Math.ceil(principal / installments);
    const paidInstallments = Math.floor(Math.random() * (installments / 2));

    await prisma.employeeLoan.create({
      data: {
        tenantId,
        loanNumber: `LOAN-${String(loanCount + 1).padStart(5, '0')}`,
        userId: user.id,
        type: 'LOAN',
        description: ['Personal Loan', 'Emergency Loan', 'Education Loan'][Math.floor(Math.random() * 3)],
        principalAmount: principal,
        totalAmount: principal,
        monthlyDeduction: monthly,
        totalPaid: paidInstallments * monthly,
        remainingAmount: principal - (paidInstallments * monthly),
        startDate: new Date(2024, 6, 1),
        installments,
        installmentsPaid: paidInstallments,
        status: 'ACTIVE',
        approvedById: adminUserId,
        approvedAt: new Date(2024, 5, 15),
        createdById: adminUserId,
      }
    });
    loanCount++;
  }
  console.log(`  ✓ Created ${loanCount} employee loans\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Demo data seeding completed successfully!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`
Summary:
  👥 Employees: ${createdUsers.length}
  📦 Assets: ${assetCount}
  💳 Subscriptions: ${subCount}
  🚚 Suppliers: ${suppCount}
  📁 Projects: ${projCount}
  🏖️ Leave Types: ${createdLeaveTypes.length}
  📊 Leave Balances: ${balanceCount}
  📝 Leave Requests: ${leaveReqCount}
  🛒 Purchase Requests: ${prCount}
  💰 Salary Structures: ${salaryCount}
  📋 Document Types: ${createdDocTypes.length}
  📄 Company Documents: ${docCount}
  🏦 Employee Loans: ${loanCount}
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
