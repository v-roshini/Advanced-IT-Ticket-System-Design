require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    await prisma.$connect();
    const customers = await prisma.customer.findMany({
        include: { user: true }
    });
    console.table(customers.map(c => ({
        id: c.id,
        name: c.name,
        portal_id: c.portal_user_id,
        user_email: c.user?.email
    })));
    await prisma.$disconnect();
}

main();
