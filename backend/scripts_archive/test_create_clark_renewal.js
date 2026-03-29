const prisma = require('./config/prisma');

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Clark', mode: 'insensitive' } }
  });

  if (!customer) {
    console.error('❌ Customer Clark not found');
    process.exit(1);
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // Set to 30 days from now to test 1-month reminder

  const renewal = await prisma.renewal.create({
    data: {
      customer_id: customer.id,
      category: 'domain',
      asset_name: 'dailyplanet.com',
      vendor: 'Daily Planet IT',
      expiry_date: expiryDate,
      cost: 1500,
      currency: 'INR',
      remind_one_week: true,
      remind_one_month: true,
      status: 'active',
      notes: 'Test renewal for Clark Kent'
    }
  });

  console.log('✅ Renewal created for Clark Kent:');
  console.log(JSON.stringify(renewal, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
