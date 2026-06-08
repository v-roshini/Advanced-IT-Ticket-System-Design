const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// Helper to get customer ID for a portal user
async function getCustomerId(userId) {
    const customer = await prisma.customer.findUnique({
        where: { portal_user_id: userId }
    });
    return customer?.id;
}

// Helper to map RenewalCategory to RenewalAsset type
function mapCategoryToAssetType(cat) {
    const c = String(cat || "").toLowerCase();
    if (c === "domain") return "Domain";
    if (c === "hosting") return "Hosting";
    if (c === "ssl") return "SSL Certificate";
    if (c === "software") return "Software License";
    return "Other";
}


// GET all renewals (filterable by category, customer, status, date range)
router.get("/", verifyToken, async (req, res) => {
  const { category, customerId, status, start_date, end_date } = req.query;
  
  try {
    const where = {};

    // Role-based filtering: clients only see their own renewals
    if (req.user.role === 'client') {
        const canView = await prisma.permission.findFirst({
            where: { role: 'client', permission_key: 'can_view_renewals', is_enabled: true }
        });
        if (!canView) return res.status(430).json({ message: "Permission Denied: You cannot view renewals." });

        const custId = await getCustomerId(req.user.id);
        if (!custId) return res.status(403).json({ message: "Customer profile not found" });
        where.customer_id = custId;
    } else if (req.user.role === 'agent') {
        const canView = await prisma.permission.findFirst({
            where: { role: 'agent', permission_key: 'can_view_renewals', is_enabled: true }
        });
        if (!canView) return res.status(403).json({ message: "Permission Denied: You cannot view renewals." });

        if (customerId) where.customer_id = Number(customerId);
    } else {
        if (customerId) where.customer_id = Number(customerId);
    }

    if (category) where.category = category;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.expiry_date = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    const renewals = await prisma.renewal.findMany({
      where,
      include: {
        customer: { select: { name: true, company: true } },
        assigned_agent: { select: { full_name: true } },
      },
      orderBy: { expiry_date: "asc" },
    });
    res.json(renewals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET renewals expiring in next N days
router.get("/due", verifyToken, async (req, res) => {
  const days = Number(req.query.days) || 30;
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const renewals = await prisma.renewal.findMany({
      where: {
        expiry_date: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        customer: { select: { name: true, company: true } },
      },
      orderBy: { expiry_date: "asc" },
    });
    res.json(renewals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET renewals for specific customer
router.get("/customer/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const renewals = await prisma.renewal.findMany({
      where: { customer_id: Number(id) },
      orderBy: { expiry_date: "asc" },
    });
    res.json(renewals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Calendar data
router.get("/calendar", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const renewals = await prisma.renewal.findMany({
      where: {
        expiry_date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      select: {
        id: true,
        asset_name: true,
        expiry_date: true,
        status: true,
        category: true,
      },
    });
    res.json(renewals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create renewal
router.post("/", verifyToken, async (req, res) => {
  const {
    customer_id,
    category,
    asset_name,
    vendor,
    purchase_date,
    expiry_date,
    cost,
    currency,
    auto_renew,
    remind_one_week,
    remind_one_month,
    notes,
    assigned_agent_id,
  } = req.body;

  try {
    // Sync: Create corresponding RenewalAsset first
    const assetType = mapCategoryToAssetType(category);
    const asset = await prisma.renewalAsset.create({
      data: {
        customer_id: Number(customer_id),
        asset_name,
        asset_type: assetType,
        purchase_date: purchase_date ? new Date(purchase_date) : null,
        expiry_date: new Date(expiry_date),
        cost: cost ? parseFloat(cost) : null,
        supplier: vendor || null,
        notes: notes || null
      }
    });

    const renewal = await prisma.renewal.create({
      data: {
        customer_id: Number(customer_id),
        category,
        asset_name,
        vendor,
        purchase_date: purchase_date ? new Date(purchase_date) : null,
        expiry_date: new Date(expiry_date),
        cost: cost ? parseFloat(cost) : null,
        currency: currency || "AED",
        auto_renew: !!auto_renew,
        remind_one_week: remind_one_week !== undefined ? !!remind_one_week : true,
        remind_one_month: remind_one_month !== undefined ? !!remind_one_month : true,
        status: "active",
        notes,
        assigned_agent_id: assigned_agent_id ? Number(assigned_agent_id) : null,
        created_by_id: req.user.id,
        renewal_asset_id: asset.id
      },
    });
    res.status(201).json(renewal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update renewal
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  
  // Clean dates and numeric IDs
  if (updateData.customer_id) updateData.customer_id = Number(updateData.customer_id);
  if (updateData.purchase_date) updateData.purchase_date = new Date(updateData.purchase_date);
  if (updateData.expiry_date) updateData.expiry_date = new Date(updateData.expiry_date);
  if (updateData.cost) updateData.cost = parseFloat(updateData.cost);
  if (updateData.assigned_agent_id) updateData.assigned_agent_id = Number(updateData.assigned_agent_id);

  // Ensure booleans for new fields
  if (updateData.remind_one_week !== undefined) updateData.remind_one_week = !!updateData.remind_one_week;
  if (updateData.remind_one_month !== undefined) updateData.remind_one_month = !!updateData.remind_one_month;

  // Cleanup relation objects that Prisma update might reject
  delete updateData.customer;
  delete updateData.assigned_agent;
  delete updateData.created_by;
  delete updateData.id; // avoid updating ID
  delete updateData.created_at;
  delete updateData.updated_at;

  try {
    const oldRenewal = await prisma.renewal.findUnique({ where: { id: Number(id) } });
    if (!oldRenewal) return res.status(404).json({ message: "Renewal not found" });

    const renewal = await prisma.renewal.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Sync: Update corresponding RenewalAsset if linked
    if (renewal.renewal_asset_id) {
      const assetType = mapCategoryToAssetType(renewal.category);
      await prisma.renewalAsset.update({
        where: { id: renewal.renewal_asset_id },
        data: {
          asset_name: renewal.asset_name,
          asset_type: assetType,
          purchase_date: renewal.purchase_date,
          expiry_date: renewal.expiry_date,
          cost: renewal.cost,
          supplier: renewal.vendor,
          notes: renewal.notes
        }
      });
    }

    res.json(renewal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE renewal
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const oldRenewal = await prisma.renewal.findUnique({ where: { id: Number(id) } });
    if (!oldRenewal) return res.status(404).json({ message: "Renewal not found" });

    // 1. Delete the Renewal record first
    await prisma.renewal.delete({ where: { id: Number(id) } });

    // 2. Then delete the corresponding RenewalAsset if linked
    if (oldRenewal.renewal_asset_id) {
      await prisma.renewalAsset.delete({
        where: { id: oldRenewal.renewal_asset_id }
      }).catch(() => {}); // ignore if already deleted
    }

    res.json({ message: "Renewal record and linked asset deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST mark as renewed
router.post("/:id/renew", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { new_expiry_date, new_cost } = req.body;

  try {
    const oldRenewal = await prisma.renewal.findUnique({ where: { id: Number(id) } });
    if (!oldRenewal) return res.status(404).json({ message: "Renewal not found" });

    // Mark current as renewed or update with new date
    const updated = await prisma.renewal.update({
      where: { id: Number(id) },
      data: {
        expiry_date: new Date(new_expiry_date),
        cost: new_cost ? parseFloat(new_cost) : oldRenewal.cost,
        status: "active",
        updated_at: new Date(),
      },
    });

    // Sync: Update the linked RenewalAsset expiry and cost
    if (updated.renewal_asset_id) {
      await prisma.renewalAsset.update({
        where: { id: updated.renewal_asset_id },
        data: {
          expiry_date: new Date(new_expiry_date),
          cost: new_cost ? parseFloat(new_cost) : oldRenewal.cost
        }
      });
    }

    // Instructions: Create an invoice if possible.
    // Let's create an automatic bill and maybe an invoice if appropriate.
    // In this simplified setup, we'll create a billing entry directly if there's a cost.
    if (updated.cost > 0) {
      const bill = await prisma.billing.create({
        data: {
          customer_id: updated.customer_id,
          total_amount: updated.cost,
          month: new Date().toISOString().slice(0, 7),
          hours_used: 0,
          hourly_rate: 0,
        },
      });
      console.log(`✅ Overage/Renewal billing created for ${updated.asset_name}: ₹${updated.cost}`);
    }

    res.json({ message: "Asset renewed and expiry updated", updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
