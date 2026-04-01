require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { processRenewalAlerts } = require("./services/renewalService");

async function main() {
    console.log("Connect to DB...");
    await prisma.$connect();
    console.log("CONNECTED");

    // 1. Find a customer
    const customer = await prisma.customer.findFirst();
    if (!customer) {
        console.error("No customer found for test!");
        return;
    }

    // 2. Create a test renewal with exactly 7 days left
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    testDate.setHours(0, 0, 0, 0);

    const assetName = "Test Asset " + Date.now();
    console.log(`Creating test asset '${assetName}' for expiry on ${testDate.toLocaleDateString()}...`);

    const r = await prisma.renewal.create({
        data: {
            customer_id: customer.id,
            category: "hosting",
            asset_name: assetName,
            expiry_date: testDate,
            remind_one_week: true,
            remind_one_month: true,
            status: "active"
        }
    });

    console.log(`Renewal created: id=${r.id}`);

    // 3. Manually run the alert engine
    console.log("Running Renewal Alert Engine...");
    // Mock global.io if it's missing (though it shouldn't be if server isn't running but we can handle it)
    global.io = {
      to: () => ({ emit: (ev, data) => console.log(`[Mock Socket.io] Emit ${ev}:`, data.title) })
    };

    await processRenewalAlerts();

    // 4. Verify notification was created
    const notifications = await prisma.notification.findMany({
        where: {
            message: { contains: assetName }
        },
        orderBy: { created_at: "desc" }
    });

    if (notifications.length > 0) {
        console.log(`✅ SUCCESS: ${notifications.length} notification(s) found!`);
        console.table(notifications.map(n => ({
          user: n.user_id,
          title: n.title,
          msg: n.message
        })));
    } else {
        console.log("❌ FAILURE: No notification found for this asset in 'Notification' table.");
    }

    // 5. Cleanup
    // await prisma.renewal.delete({ where: { id: r.id } });
    console.log(`Asset '${assetName}' left in DB for your inspection or cleanup later.`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
