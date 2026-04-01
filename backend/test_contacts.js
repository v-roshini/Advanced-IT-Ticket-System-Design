require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContacts() {
  console.log("Checking DB...");
  const role = "client";
  const clarkUser = await prisma.user.findFirst({ where: { full_name: { contains: 'Clark' } }});
  if (!clarkUser) {
    console.log("Clark user not found.");
    return;
  }
  const userId = clarkUser.id;
  console.log("Clark User ID:", userId);
  
  let contacts = [];

  const admins = await prisma.user.findMany({
    where: { role: "admin", is_active: true },
    select: { id: true, full_name: true, role: true, email: true }
  });
  console.log("Found admins:", admins);
  contacts.push(...admins);

  const customer = await prisma.customer.findUnique({ where: { portal_user_id: userId } });
  if (customer) {
    console.log("Found Clark Customer ID:", customer.id);
    const assignedTickets = await prisma.ticket.findMany({
      where: { 
        customer_id: customer.id, 
        agent_id: { not: null },
        status: { not: "Closed" } 
      },
      select: { agent: { select: { id: true, full_name: true, role: true, email: true } } }
    });
    console.log("Assigned Tickets:", assignedTickets.length);
    assignedTickets.forEach(t => t.agent && console.log("Ticket Agent:", t.agent.full_name));
    
    const assignedRenewals = await prisma.renewal.findMany({
      where: { customer_id: customer.id, assigned_agent_id: { not: null } },
      select: { assigned_agent: { select: { id: true, full_name: true, role: true, email: true } } }
    });
    console.log("Assigned Renewals:", assignedRenewals.length);
  } else {
    console.log("No customer record found for portal_user_id:", userId);
  }

  console.log("Final Contacts Array size:", contacts.length);
}

testContacts().catch(console.error).finally(() => prisma.$disconnect());
