const prisma = require('./config/prisma');

async function check() {
  await prisma.$connect();
  
  const assetName = 'dailyplanet.com (TEST)';
  const logs = await prisma.systemLog.findMany({
    where: { 
      action: 'RENEWAL_ALERT',
      details: { contains: assetName }
    }
  });

  console.log(`📋 Logs for ${assetName}:`);
  console.log(JSON.stringify(logs, null, 2));

  const notifs = await prisma.notification.findMany({
    where: { 
      message: { contains: assetName }
    }
  });

  console.log(`\n🔔 Notifications for ${assetName}:`);
  console.log(JSON.stringify(notifs, null, 2));
}

check().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
