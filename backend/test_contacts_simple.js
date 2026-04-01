require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContacts() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", is_active: true }
    });
    console.log("Admins:", admins.length, admins.map(a => a.role));
  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
testContacts();
