const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // Find the current admin
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    
    if (!admin) {
        console.error("No admin user found. Please run seedTestData.js first.");
        return;
    }

    console.log(`Found Admin: ${admin.full_name} (ID: ${admin.id})`);

    // Create some sample notifications
    const notifications = [
        {
            user_id: admin.id,
            type: "ticket_created",
            title: "New Ticket #123456",
            message: "A new critical ticket has been created by Rose.",
            link: "/tickets/1",
            is_read: false,
        },
        {
            user_id: admin.id,
            type: "sla_breach",
            title: "🚨 SLA BREACHED",
            message: "Ticket #TKT9988 has breached the 4-hour resolution time.",
            link: "/tickets/2",
            is_read: false,
        },
        {
            user_id: admin.id,
            type: "renewal_due",
            title: "📅 Renewal Alert",
            message: "Hosting for 'Customer XYZ' expires in 3 days.",
            link: "/renewals",
            is_read: true,
        }
    ];

    for (const n of notifications) {
        await prisma.notification.create({ data: n });
    }

    console.log("✅ 3 Sample notifications created for the admin.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
