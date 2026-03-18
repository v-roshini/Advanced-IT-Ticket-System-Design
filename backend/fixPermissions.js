const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fix() {
  const perms = [
    { role: "agent", key: "can_view_tickets" },
    { role: "agent", key: "can_view_renewals" },
    { role: "agent", key: "can_view_billing" },
    { role: "agent", key: "can_view_amc_contracts" },
    { role: "client", key: "can_view_own_tickets" },
    { role: "client", key: "can_view_renewals" },
    { role: "client", key: "can_view_billing" }
  ];

  console.log("🛠️ Fixing Permissions...");

  for (const p of perms) {
    await prisma.permission.upsert({
      where: { role_permission_key: { role: p.role, permission_key: p.key } },
      update: { is_enabled: true },
      create: { role: p.role, permission_key: p.key, is_enabled: true }
    });
    console.log(`✅ Set ${p.role} -> ${p.key}`);
  }

  console.log("✨ Done!");
  await prisma.$disconnect();
}

fix();
