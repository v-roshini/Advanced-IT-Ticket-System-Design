const prisma = require('./config/prisma');

async function main() {
  console.log('🔄 Attempting to connect to database...');
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Connected to database');
      connected = true;
      break;
    } catch (err) {
      console.warn(`⚠️ Connection attempt ${attempt}/3 failed. Retrying in 5s...`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!connected) {
    console.error('❌ Could not connect to database after 3 attempts.');
    process.exit(1);
  }

  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Clark', mode: 'insensitive' } }
  });

  if (!customer) {
    console.error('❌ Customer Clark Kent not found in database.');
    process.exit(1);
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30 days out for testing

  const renewal = await prisma.renewal.create({
    data: {
      customer_id: customer.id,
      category: 'domain',
      asset_name: 'dailyplanet.com (TEST)',
      vendor: 'Daily Planet',
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
