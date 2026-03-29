const prisma = require('./config/prisma');

async function main() {
  await prisma.$connect();
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Clark', mode: 'insensitive' } }
  });

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  const renewal = await prisma.renewal.create({
    data: {
      customer_id: customer.id,
      category: 'hosting',
      asset_name: 'superman-hosting (NO-ALERT-TEST)',
      vendor: 'Krypton Hosting',
      expiry_date: expiryDate,
      remind_one_month: false, // Should NOT alert at 30 days
      status: 'active'
    }
  });

  console.log('✅ Created asset with NO alert at 30 days:');
  console.log(JSON.stringify(renewal, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
