require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const msg = await prisma.chatMessage.findMany({ take: 1 });
    console.log('success', msg);
  } catch (e) {
    console.error('fail', e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
