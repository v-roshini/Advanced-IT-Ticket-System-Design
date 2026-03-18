const prisma = require("./config/prisma");

async function seedRenewals() {
  console.log("🌱 Seeding Renewals for all customers...");

  const customers = await prisma.customer.findMany();

  const renewalTemplates = [
    {
      category: "domain",
      asset_name: "linotec.com",
      vendor: "GoDaddy",
      expiry_date: new Date("2025-12-31"),
      cost: 1200,
      auto_renew: true
    },
    {
      category: "hosting",
      asset_name: "Managed Web Hosting",
      vendor: "AWS Lightsail",
      expiry_date: new Date("2026-01-25"),
      cost: 4500,
      auto_renew: false
    },
    {
      category: "ssl",
      asset_name: "SSL Wildcard Certificate",
      vendor: "Let's Encrypt / Sectigo",
      expiry_date: new Date("2026-04-10"),
      cost: 800,
      auto_renew: true
    },
    {
      category: "email",
      asset_name: "Google Workspace",
      vendor: "Google",
      expiry_date: new Date("2026-06-30"),
      cost: 2400,
      auto_renew: false
    },
    {
      category: "software",
      asset_name: "Microsoft 365 License",
      vendor: "Microsoft",
      expiry_date: new Date("2026-09-15"),
      cost: 3600,
      auto_renew: true
    },
    {
      category: "firewall",
      asset_name: "Sophos XGS Firewall",
      vendor: "Sophos",
      expiry_date: new Date("2025-11-30"),
      cost: 8000,
      auto_renew: false
    },
    {
      category: "amc",
      asset_name: "Annual Maintenance Contract",
      vendor: "Linotec IT Solutions",
      expiry_date: new Date("2026-03-31"),
      cost: 24000,
      auto_renew: true
    }
  ];

  for (const customer of customers) {
    // Pick 3–4 random renewals per customer
    const selected = renewalTemplates
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2) + 3);

    for (const r of selected) {
      // Slightly randomize cost per customer
      const adjustedCost = r.cost * (0.9 + Math.random() * 0.3);
      const assetName = `${r.asset_name} - ${customer.company || customer.name}`;

      await prisma.renewal.create({
        data: {
          customer_id: customer.id,
          category: r.category,
          asset_name: assetName,
          vendor: r.vendor,
          expiry_date: r.expiry_date,
          cost: parseFloat(adjustedCost.toFixed(2)),
          currency: "INR",
          auto_renew: r.auto_renew,
          notes: `Auto-generated for testing. Customer: ${customer.name}`,
          created_by_id: null
        }
      });
    }
    console.log(`✅ ${selected.length} renewals created for ${customer.name} (${customer.company})`);
  }

  console.log("\n✨ Renewal Seeding Complete!");
  process.exit(0);
}

seedRenewals().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
