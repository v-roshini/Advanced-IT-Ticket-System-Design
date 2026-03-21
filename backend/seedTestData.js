const prisma = require("./config/prisma");
const bcrypt = require("bcryptjs");

async function seedTestData() {
  const password = "12345";
  const hashedPassword = await bcrypt.hash(password, 10);

  const agents = [
    { name: "Alex Rivera", email: "alex.agent@linotec.com", spec: "Network Security" },
    { name: "Sarah Connor", email: "sarah.agent@linotec.com", spec: "Server Administration" },
    { name: "Michael Chen", email: "michael.agent@linotec.com", spec: "Cloud Architecture" },
    { name: "Priya Sharma", email: "priya.agent@linotec.com", spec: "Database Tuning" },
    { name: "David Miller", email: "david.agent@linotec.com", spec: "VoIP & Telecom" }
  ];

  const customers = [
    { name: "John Wick", email: "john@continental.com", company: "Continental Hotels", type: "Monthly" },
    { name: "Bruce Wayne", email: "bruce@waynecorp.com", company: "Wayne Enterprises", type: "AMC" },
    { name: "Tony Stark", email: "tony@stark.com", company: "Stark Industries", type: "Retainer" },
    { name: "Diana Prince", email: "diana@themyscira.com", company: "Amazonian Exports", type: "Monthly" },
    { name: "Clark Kent", email: "clark@dailyplanet.com", company: "Daily Planet", type: "Annual" }
  ];

  console.log("🚀 Starting Seeding Process...");
  
  // Seed Admin
  await prisma.user.upsert({
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
    // 1. Create Portal User for Customer
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

    // 2. Handle Customer Profile linked to Portal User
    const existingCustomer = await prisma.customer.findUnique({
      where: { portal_user_id: user.id }
    });

    if (!existingCustomer) {
      await prisma.customer.create({
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
    } else {
      await prisma.customer.update({
        where: { portal_user_id: user.id },
        data: {
          name: c.name,
          email: c.email,
          company: c.company,
          type: c.type
        }
      });
      console.log(`✅ Customer Updated: ${c.name}`);
    }

    // 3. Seed Sample Ticket for Customer
    const finalCust = await prisma.customer.findUnique({ where: { portal_user_id: user.id } });
    if (finalCust) {
      await prisma.ticket.create({
        data: {
          ticket_no: "TKT" + Math.random().toString(36).slice(-6).toUpperCase(),
          customer_id: finalCust.id,
          customer_name: finalCust.name,
          company: finalCust.company,
          issue_title: `Setup Support: ${finalCust.company}`,
          description: "This is a sample ticket for portal testing.",
          status: "Open",
          priority: "Medium",
          source: "Web Portal"
        }
      });
      console.log(`   🎫 Sample Ticket Created for ${c.name}`);
    }
  }

  console.log("\n✨ Seeding Complete!");
  console.log("🔑 All members have password: 12345");
  process.exit(0);
}

seedTestData().catch(e => {
  console.error("❌ Seed Error:", e);
  process.exit(1);
});
