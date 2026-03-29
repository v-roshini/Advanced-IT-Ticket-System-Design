const prisma = require('./config/prisma');
const { processRenewalAlerts } = require('./services/renewalService');

// Mock global.io
global.io = {
  to: (room) => ({
    emit: (event, data) => {
      console.log(`📡 [MOCK SOCKET] To: ${room}, Event: ${event}, Title: ${data.title}`);
    }
  })
};

async function testAlert() {
  console.log('🔄 Connecting for alert test...');
  await prisma.$connect();
  console.log('✅ Connected.');

  console.log('🔍 Running Renewal Alert Engine scan...');
  await processRenewalAlerts();
  
  // Check system logs for "RENEWAL_ALERT"
  const logs = await prisma.systemLog.findMany({
    where: { action: 'RENEWAL_ALERT' },
    orderBy: { created_at: 'desc' },
    take: 5
  });

  console.log('\n📋 Recent Alert Logs (Check for dailyplanet.com):');
  console.log(JSON.stringify(logs, null, 2));

  // Also check if notifications were created
  const notifs = await prisma.notification.findMany({
    where: { type: 'renewal_due' },
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.log('\n🔔 New Notifications created:');
  console.log(JSON.stringify(notifs, null, 2));
}

testAlert().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
