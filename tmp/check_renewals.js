const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const renewals = await prisma.renewal.findMany({
    include: {
      customer: true
    }
  });

  console.table(renewals.map(r => ({
    id: r.id,
    asset: r.asset_name,
    expiry: r.expiry_date.toISOString().split('T')[0],
    status: r.status,
    customer: r.customer?.name,
    portal_user_id: r.customer?.portal_user_id,
    remind_one_month: r.remind_one_month,
    remind_one_week: r.remind_one_week
  })));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
