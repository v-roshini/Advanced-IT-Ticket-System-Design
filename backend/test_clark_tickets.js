require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const c = await prisma.customer.findFirst({ where: { name: { contains: 'Clark' } }});
  if (!c) {
    console.log("No Clark customer.");
    return;
  }
  console.log('Clark ID:', c.id);
  const tickets = await prisma.ticket.findMany({ 
    where: { customer_id: c.id },
    include: { agent: true }
  });
  console.log('Tickets:', JSON.stringify(tickets, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
