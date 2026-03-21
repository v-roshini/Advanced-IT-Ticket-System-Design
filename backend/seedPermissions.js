const prisma = require("./config/prisma");

async function seedPermissions() {
  const agentPermissions = [
    'can_view_tickets',
    'can_view_renewals',
    'can_create_ticket',
    'can_close_ticket',
    'can_reassign_ticket',
    'can_edit_ticket',
    'can_delete_ticket',
    'can_add_work_log',
    'can_view_customer_contact',
    'can_view_billing',
    'can_view_amc_contracts',
    'can_generate_invoice',
    'can_escalate_ticket',
    'can_view_reports'
  ];

  const customerPermissions = [
    'can_view_own_tickets',
    'can_create_ticket',
    'can_add_comment',
    'can_view_work_hours',
    'can_view_billing',
    'can_download_invoice',
    'can_view_amc_status',
    'can_view_renewals',
    'can_receive_renewal_alerts',
    'can_approve_resolution',
    'can_rate_ticket',
    'can_view_assigned_agent',
    'can_view_reports'
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

// Running once to initialize
seedPermissions().then(() => process.exit(0));
