require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    await prisma.$connect();
    
    // 1. Find Clark Kent
    const customer = await prisma.customer.findFirst({
        where: { name: { contains: "Clark", mode: "insensitive" } }
    });

    if (!customer) {
        console.error("Clark Kent not found!");
        return;
    }

    console.log(`Found Customer: ${customer.name} (ID: ${customer.id})`);

    // 2. Create renewal
    const expiry = new Date("2026-04-05");
    const assetName = "Secure Cloud Storage (Pro)";
    
    const renewal = await prisma.renewal.create({
        data: {
            customer_id: customer.id,
            category: "hosting",
            asset_name: assetName,
            vendor: "Lenok IT Services",
            expiry_date: expiry,
            cost: 4500,
            currency: "INR",
            remind_one_week: true,
            remind_one_month: true,
            status: "active",
            notes: "Test renewal for Clark Kent to verify notifications."
        }
    });

    console.log(`✅ Renewal created: ${assetName} for ${customer.name}`);
    console.log(`Expiry Date: ${expiry.toLocaleDateString()}`);

    await prisma.$disconnect();
}

main().catch(console.error);
