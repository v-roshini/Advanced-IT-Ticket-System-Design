const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

console.log("Attempting connection to: " + process.env.DATABASE_URL.replace(/:\/\/.*@/, "://REDACTED@"));

async function main() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to database");
    const userCount = await prisma.user.count();
    console.log("✅ User count: " + userCount);
  } catch (err) {
    console.error("❌ Database Connection Failed:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
