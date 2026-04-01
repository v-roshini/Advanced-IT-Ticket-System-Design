require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
});

async function main() {
    console.log("Connect to DB...");
    let connected = false;
    for (let i = 0; i < 5; i++) {
        try {
            await prisma.$connect();
            connected = true;
            console.log("CONNECTED");
            break;
        } catch (e) {
            console.log(`Failed to connect (attempt ${i + 1}): ${e.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    if (!connected) {
        console.error("Could not connect to database.");
        return;
    }

    const renewals = await prisma.renewal.findMany({
        include: { customer: true }
    });

    console.log("RENEWALS:");
    console.table(renewals.map(r => ({
        id: r.id,
        asset: r.asset_name,
        expiry: r.expiry_date.toISOString().split('T')[0],
        diff: Math.ceil((new Date(r.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)),
        status: r.status,
        customer: r.customer?.name,
        remind_m: r.remind_one_month,
        remind_w: r.remind_one_week
    })));

    const logs = await prisma.systemLog.findMany({
        where: { action: "RENEWAL_ALERT" },
        take: 10,
        orderBy: { created_at: "desc" }
    });

    console.log("LATEST RENEWAL ALERTS IN LOG:");
    console.table(logs);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

main().catch(e => {
  console.error(e);
  process.exit(1);
});
