require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

// Single global PrismaClient instance — prevents multiple connection pools
// on hot reloads or multiple requires across the app
if (!global._prisma) {
    global._prisma = new PrismaClient({
        errorFormat: "minimal",
    });
}

const prisma = global._prisma;

// Graceful shutdown
process.on("beforeExit", async () => {
    await prisma.$disconnect();
});

module.exports = prisma;
