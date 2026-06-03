const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding System Configurations...");

  // 1. SLA Configurations
  const slaConfigs = [
    { priority: "Critical", first_response_mins: 15,  resolution_mins: 120 },  // 2 hrs
    { priority: "High",     first_response_mins: 30,  resolution_mins: 240 },  // 4 hrs
    { priority: "Medium",   first_response_mins: 120, resolution_mins: 480 },  // 8 hrs
    { priority: "Low",      first_response_mins: 240, resolution_mins: 1440 }, // 24 hrs
  ];

  for (const config of slaConfigs) {
    await prisma.sLAConfig.upsert({
      where: { priority: config.priority },
      update: config,
      create: config,
    });
  }
  console.log("✅ SLA Configurations Upserted.");

  // 2. Default Permissions for Roles
  const rolesPermissions = [
    // Finance Permissions
    { role: 'finance', permission_key: 'can_view_billing', is_enabled: true },
    { role: 'finance', permission_key: 'can_generate_invoice', is_enabled: true },
    { role: 'finance', permission_key: 'can_view_reports', is_enabled: true },
    { role: 'finance', permission_key: 'can_view_amc_contracts', is_enabled: true },
    
    // Agent Permissions (ensuring standard set)
    { role: 'agent', permission_key: 'can_create_ticket', is_enabled: true },
    { role: 'agent', permission_key: 'can_add_comment', is_enabled: true },
    { role: 'agent', permission_key: 'can_view_amc_contracts', is_enabled: true },
  ];

  for (const p of rolesPermissions) {
    await prisma.permission.upsert({
      where: { role_permission_key: { role: p.role, permission_key: p.permission_key } },
      update: { is_enabled: p.is_enabled },
      create: p,
    });
  }
  console.log("✅ Permissions Upserted for Finance and Agent.");

  console.log("🏁 Seeding Complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
