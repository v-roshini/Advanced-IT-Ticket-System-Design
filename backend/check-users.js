const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, full_name: true, email: true, role: true }
        });
        console.log("Registered Users:", JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error fetching users:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
