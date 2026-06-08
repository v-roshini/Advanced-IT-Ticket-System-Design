const prisma = require("../config/prisma");
const nodeCron = require("node-cron");

/**
 * Monthly Automated Billing Engine
 * Scans for all 'AMC' and 'Monthly' customers, collects unbilled work logs,
 * and generates a Draft Invoice for the month.
 */
// Robust helper to parse various time spent formats into decimal hours
function parseTimeSpentToHours(timeStr) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  
  // Check for pure decimal number (e.g. "1.5" or "2")
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }
  
  let totalHours = 0;
  
  // Match hours: "1.5h", "1h", "1.5 hours", "1.5 hr"
  const hMatch = s.match(/(\d+(\.\d+)?)\s*(h|hour|hr)/);
  if (hMatch) {
    totalHours += parseFloat(hMatch[1]);
  }
  
  // Match minutes: "30m", "30 mins", "30 minutes"
  const mMatch = s.match(/(\d+)\s*(m|min)/);
  if (mMatch) {
    totalHours += parseInt(mMatch[1], 10) / 60;
  }
  
  // Fallback: minutes words
  if (!hMatch && !mMatch) {
    const fallbackMin = s.match(/(\d+)\s*minutes?/);
    if (fallbackMin) {
      totalHours += parseInt(fallbackMin[1], 10) / 60;
    }
  }
  
  return totalHours;
}

async function generateMonthlyInvoices() {
    console.log("⏱️ Starting Automated Monthly Billing Generation...");

    try {
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const monthStr = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM

        // 1. Find all active customers needing monthly billing
        const customers = await prisma.customer.findMany({
            where: {
                type: { in: ["AMC", "Monthly", "Annual", "Retainer"] },
                status: "Active"
            }
        });

        for (const customer of customers) {
            // 2. Collect all unbilled work logs for this customer
            const unbilledLogs = await prisma.workLog.findMany({
                where: {
                    ticket: { customer_id: customer.id },
                    is_billed: false
                }
            });

            if (unbilledLogs.length === 0) {
                console.log(`⏩ No unbilled work for ${customer.name}, skipping.`);
                continue;
            }

            // 3. Calculate total hours logged
            let totalHoursLogged = 0;
            unbilledLogs.forEach(l => {
                totalHoursLogged += parseTimeSpentToHours(l.time_spent);
            });

            // 4. Determine Overage vs Included 
            let baseFee = 0;
            let overageHours = 0;
            let overageAmount = 0;
            let subtotal = 0;
            let hourlyRate = 150; // Default fallback

            const amc = await prisma.contractAMC.findFirst({
                where: {
                    customer_id: customer.id,
                    start_date: { lte: new Date() },
                    end_date: { gte: new Date() }
                }
            });

            if (amc) {
                baseFee = amc.monthly_base_fee || 0;
                overageHours = Math.max(0, totalHoursLogged - amc.monthly_hours);
                hourlyRate = amc.extra_hour_rate || 150;
                overageAmount = overageHours * hourlyRate;
                subtotal = baseFee + overageAmount;
                
                console.log(`📊 ${customer.name} (AMC): Logged ${totalHoursLogged.toFixed(1)}h. Allowance ${amc.monthly_hours}h. Base fee: ${baseFee} AED. Overage ${overageHours.toFixed(1)}h @ ${hourlyRate}/hr.`);
            } else {
                subtotal = totalHoursLogged * hourlyRate;
            }

            if (subtotal <= 0) {
                console.log(`⏩ No billing amount for ${customer.name}, skipping or marking logs as billed.`);
                
                // Still mark logs as billed so they don't appear in next month's bill
                if (unbilledLogs.length > 0) {
                    await prisma.workLog.updateMany({
                        where: { id: { in: unbilledLogs.map(l => l.id) } },
                        data: { is_billed: true }
                    });
                }
                continue;
            }

            // 5. Create Billing Record
            const bill = await prisma.billing.create({
                data: {
                    customer_id: customer.id,
                    hours_used: totalHoursLogged,
                    hourly_rate: hourlyRate,
                    total_amount: subtotal,
                    month: monthStr
                }
            });

            // 6. Create Draft Invoice
            const invoiceNo = `INV-AUTO-${Date.now().toString().slice(-6)}`;
            const gstPercent = 5; // AED standard
            const totalTax = subtotal * (gstPercent / 100);
            const totalWithTax = subtotal + totalTax;

            const invoice = await prisma.invoice.create({
                data: {
                    billing_id: bill.id,
                    invoice_number: invoiceNo,
                    status: "Draft",
                    gst_percentage: gstPercent,
                    total_tax: totalTax,
                    total_amout_with_tax: totalWithTax,
                    due_date: new Date(new Date().setDate(new Date().getDate() + 15)) // 15 days
                }
            });

            // 7. Create Line Items
            if (amc) {
                const lineItemsData = [];
                if (baseFee > 0) {
                    lineItemsData.push({
                        invoice_id: invoice.id,
                        ticket_ref: "AMC Monthly Retainer Fee",
                        agent_name: "System Agent",
                        date_logged: new Date(),
                        hours: 1,
                        rate: baseFee,
                        total: baseFee
                    });
                }
                if (overageAmount > 0) {
                    lineItemsData.push({
                        invoice_id: invoice.id,
                        ticket_ref: `AMC Support Overage (${overageHours.toFixed(1)} hrs)`,
                        agent_name: "System Agent",
                        date_logged: new Date(),
                        hours: overageHours,
                        rate: hourlyRate,
                        total: overageAmount
                    });
                }
                if (lineItemsData.length > 0) {
                    await prisma.invoiceLineItem.createMany({
                        data: lineItemsData
                    });
                }
            } else {
                await prisma.invoiceLineItem.create({
                    data: {
                        invoice_id: invoice.id,
                        ticket_ref: "General Support",
                        agent_name: "System Agent",
                        date_logged: new Date(),
                        hours: totalHoursLogged,
                        rate: hourlyRate,
                        total: subtotal
                    }
                });
            }

            // 8. Mark Logs as Billed
            await prisma.workLog.updateMany({
                where: { id: { in: unbilledLogs.map(l => l.id) } },
                data: { is_billed: true, billing_id: bill.id }
            });

            // 9. Notify Finance/Admin
            await notifyAdmins(
                "invoice_created",
                "New Invoice Generated",
                `Automated Monthly Invoice ${invoiceNo} created for ${customer.name}.`,
                `/invoices/${invoice.id}`
            );

            console.log(`✅ Generated Invoice ${invoiceNo} for ${customer.name}.`);
        }

        console.log("🏁 Automated Monthly Billing Complete.");
    } catch (err) {
        console.error("❌ Billing Engine Error:", err);
    }
}

/**
 * Overdue Payment Tracker
 * Scans for Draft/Sent invoices past their due_date and marks them as Overdue.
 * Sends notifications to Finance, Admin, and Customer.
 */
async function processOverdueInvoices() {
    console.log("⏱️ Scanning for Overdue Invoices...");
    try {
        const now = new Date();
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: ["Draft", "Sent"] },
                due_date: { lt: now }
            },
            include: { billing: { include: { customer: true } } }
        });

        for (const inv of overdueInvoices) {
            await prisma.invoice.update({
                where: { id: inv.id },
                data: { status: "Overdue" }
            });

            const msg = `Invoice ${inv.invoice_number} for ${inv.billing?.customer?.name} is OVERDUE. Amount: ${inv.total_amout_with_tax} AED.`;
            
            // Notify Finance/Admin
            await notifyAdmins("payment_overdue", "🚨 Payment Overdue", msg, `/invoices/${inv.id}`);

            // Notify Customer
            if (inv.billing?.customer?.portal_user_id) {
                await sendNotification(
                    inv.billing.customer.portal_user_id,
                    "payment_overdue",
                    "📅 Payment Reminder: Invoice Overdue",
                    `Your invoice ${inv.invoice_number} is past its due date. Please arrange payment to avoid service interruption.`,
                    `/invoices/${inv.id}`
                );
            }
            console.log(`⚠️ Invoice ${inv.invoice_number} marked as OVERDUE.`);
        }
    } catch (err) {
        console.error("❌ Overdue Scanner Error:", err);
    }
}

const { sendNotification, notifyAdmins } = require("./notificationService");

/**
 * Runs monthly on the 1st of every month at 1:00 AM
 */
function startBillingCron() {
    // Monthly Billing
    nodeCron.schedule("0 1 1 * *", () => {
        generateMonthlyInvoices();
    });

    // Daily Overdue Scan
    nodeCron.schedule("0 2 * * *", () => {
        processOverdueInvoices();
    });

    console.log("🕒 Billing & Overdue Cron Jobs scheduled.");
}

module.exports = {
    generateMonthlyInvoices,
    processOverdueInvoices,
    startBillingCron
};
