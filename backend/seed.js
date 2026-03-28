const prisma = require("./config/prisma");
const bcrypt = require("bcryptjs");

async function seedPermissions() {
  const agentPermissions = [
    'can_view_tickets', 'can_view_renewals', 'can_create_ticket', 'can_close_ticket',
    'can_reassign_ticket', 'can_edit_ticket', 'can_delete_ticket', 'can_add_work_log',
    'can_view_customer_contact', 'can_view_billing', 'can_view_amc_contracts',
    'can_generate_invoice', 'can_escalate_ticket', 'can_view_reports', 'can_add_comment',
    'can_add_internal_note'
  ];

  const customerPermissions = [
    'can_view_own_tickets', 'can_create_ticket', 'can_add_comment', 'can_view_work_hours',
    'can_view_billing', 'can_download_invoice', 'can_view_amc_status', 'can_view_renewals',
    'can_receive_renewal_alerts', 'can_approve_resolution', 'can_rate_ticket',
    'can_view_assigned_agent', 'can_view_reports'
  ];

  console.log("🌱 Seeding default permissions...");

  for (const key of agentPermissions) {
    await prisma.permission.upsert({
      where: { role_permission_key: { role: 'agent', permission_key: key } },
      update: {},
      create: { role: 'agent', permission_key: key, is_enabled: true }
    }).catch(e => console.error(`Error seeding ${key}:`, e.message));
  }

  for (const key of customerPermissions) {
    await prisma.permission.upsert({
      where: { role_permission_key: { role: 'client', permission_key: key } },
      update: {},
      create: { role: 'client', permission_key: key, is_enabled: true }
    }).catch(e => console.error(`Error seeding ${key}:`, e.message));
  }

  console.log("✅ Default permissions seeded.");
}

async function seedTestData() {
  const password = "12345";
  const hashedPassword = await bcrypt.hash(password, 10);

  const agents = [
    { name: "Alex Rivera", email: "alex.agent@Lenok.com", spec: "Network Security" },
    { name: "Sarah Connor", email: "sarah.agent@Lenok.com", spec: "Server Administration" },
    { name: "Michael Chen", email: "michael.agent@Lenok.com", spec: "Cloud Architecture" },
    { name: "Priya Sharma", email: "priya.agent@Lenok.com", spec: "Database Tuning" },
    { name: "David Miller", email: "david.agent@Lenok.com", spec: "VoIP & Telecom" }
  ];

  const customers = [
    { name: "John Wick", email: "john@continental.com", company: "Continental Hotels", type: "Monthly" },
    { name: "Bruce Wayne", email: "bruce@waynecorp.com", company: "Wayne Enterprises", type: "AMC" },
    { name: "Tony Stark", email: "tony@stark.com", company: "Stark Industries", type: "Retainer" },
    { name: "Diana Prince", email: "diana@themyscira.com", company: "Amazonian Exports", type: "Monthly" },
    { name: "Clark Kent", email: "clark@dailyplanet.com", company: "Daily Planet", type: "Annual" }
  ];

  console.log("🚀 Seeding Core Users & Customers...");

  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: "faf@gmail.com" },
    update: {},
    create: {
      full_name: "System Admin",
      email: "faf@gmail.com",
      password: hashedPassword,
      role: "admin",
      is_active: true
    }
  });
  console.log("✅ Admin Created: faf@gmail.com");

  // Seed Agents
  for (const a of agents) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        full_name: a.name,
        email: a.email,
        password: hashedPassword,
        role: "agent",
        specialization: a.spec,
        is_active: true
      }
    });
    console.log(`✅ Agent Created: ${a.name}`);
  }

  // Seed Customers
  for (const c of customers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        full_name: c.name,
        email: c.email,
        password: hashedPassword,
        role: "client",
        is_active: true
      }
    });

    const existingCustomer = await prisma.customer.findUnique({
      where: { portal_user_id: user.id }
    });

    if (!existingCustomer) {
      const newCust = await prisma.customer.create({
        data: {
          name: c.name,
          email: c.email,
          company: c.company,
          type: c.type,
          status: "Active",
          portal_user_id: user.id
        }
      });
      console.log(`✅ Customer Created: ${c.name} (${c.company})`);
      
      // Create initial ticket
      await prisma.ticket.create({
        data: {
          ticket_no: "TKT" + Math.random().toString(36).slice(-6).toUpperCase(),
          customer_id: newCust.id,
          customer_name: newCust.name,
          company: newCust.company,
          issue_title: `Setup Support: ${newCust.company}`,
          description: "This is an initial setup ticket.",
          status: "Open",
          priority: "Medium",
          source: "Web Portal"
        }
      });
    }
  }

  // Seed some Notifications for Admin
  await prisma.notification.createMany({
    data: [
      {
        user_id: admin.id,
        type: "ticket_created",
        title: "New Ticket #123456",
        message: "A new critical ticket has been created by Rose.",
        link: "/tickets/1",
        is_read: false,
      },
      {
        user_id: admin.id,
        type: "sla_breach",
        title: "🚨 SLA BREACHED",
        message: "Ticket #TKT9988 has breached the 4-hour resolution time.",
        link: "/tickets/2",
        is_read: false,
      }
    ]
  });
  console.log("✅ Admin Notifications Seeded.");
}

async function seedRenewals() {
  console.log("🌱 Seeding Renewals...");
  const customers = await prisma.customer.findMany();
  
  const renewalTemplates = [
    { category: "domain", asset_name: "Domain Registration", vendor: "GoDaddy", cost: 1200 },
    { category: "hosting", asset_name: "Cloud Hosting", vendor: "AWS", cost: 5000 },
    { category: "ssl", asset_name: "SSL Certificate", vendor: "Sectigo", cost: 1500 },
    { category: "software", asset_name: "Office 365", vendor: "Microsoft", cost: 3000 }
  ];

  for (const customer of customers) {
    for (const r of renewalTemplates) {
      await prisma.renewal.create({
        data: {
          customer_id: customer.id,
          category: r.category,
          asset_name: `${r.asset_name} - ${customer.company}`,
          vendor: r.vendor,
          expiry_date: new Date(new Date().setMonth(new Date().getMonth() + Math.floor(Math.random() * 6))),
          cost: r.cost,
          currency: "INR",
          auto_renew: true,
          status: "Pending"
        }
      });
    }
  }
  console.log("✅ Renewal Data Seeded.");
}

async function runSeed() {
  try {
    await seedPermissions();
    await seedTestData();
    await seedRenewals();
    console.log("\n✨ ALL DATA SEEDED SUCCESSFULLY! ✨");
    console.log("🔑 Default Password for all: 12345");
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runSeed();
