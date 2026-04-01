require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const customers = await prisma.customer.findMany({
        where: { name: { contains: "Clark", mode: "insensitive" } },
        include: { user: true }
    });
    console.log(JSON.stringify(customers, null, 2));
    await prisma.$disconnect();
}
main();
