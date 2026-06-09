const prisma = require("../config/prisma");

// Helper to map RenewalCategory to RenewalAsset type
function mapCategoryToAssetType(cat) {
    const c = String(cat || "").toLowerCase();
    if (c === "domain") return "Domain";
    if (c === "hosting") return "Hosting";
    if (c === "ssl") return "SSL Certificate";
    if (c === "software") return "Software License";
    return "Other";
}

/**
 * Synchronizes an AMC Contract to a corresponding Renewal and RenewalAsset record.
 * If one doesn't exist, it creates it. If it exists, it updates it.
 */
async function syncContractToRenewal(contract) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: contract.customer_id }
        });
        if (!customer) {
            console.error(`❌ syncContractToRenewal: Customer ${contract.customer_id} not found.`);
            return;
        }

        const companyName = contract.company_name || customer.company || customer.name || "Client";
        const assetName = `Annual Maintenance Contract - ${companyName}`;
        const yearlyCost = (contract.monthly_base_fee || 0) * 12;

        // Determine if contract is active or expired
        const now = new Date();
        const status = new Date(contract.end_date) > now ? "active" : "expired";

        // Check for existing AMC renewal for this customer
        const renewal = await prisma.renewal.findFirst({
            where: {
                customer_id: contract.customer_id,
                category: "amc"
            }
        });

        if (renewal) {
            // Update existing renewal
            await prisma.renewal.update({
                where: { id: renewal.id },
                data: {
                    asset_name: assetName,
                    expiry_date: contract.end_date,
                    purchase_date: contract.start_date,
                    cost: yearlyCost,
                    status: status,
                    updated_at: new Date()
                }
            });

            // Update linked asset if present
            if (renewal.renewal_asset_id) {
                await prisma.renewalAsset.update({
                    where: { id: renewal.renewal_asset_id },
                    data: {
                        asset_name: assetName,
                        expiry_date: contract.end_date,
                        purchase_date: contract.start_date,
                        cost: yearlyCost,
                        notes: contract.scope_of_services
                    }
                });
            }
            console.log(`🔄 Synced existing AMC renewal for customer ${customer.name} (Contract ID: ${contract.id})`);
        } else {
            // Create a new RenewalAsset
            const asset = await prisma.renewalAsset.create({
                data: {
                    customer_id: contract.customer_id,
                    asset_name: assetName,
                    asset_type: "Other",
                    purchase_date: contract.start_date,
                    expiry_date: contract.end_date,
                    cost: yearlyCost,
                    supplier: "Lenok IT Solutions",
                    notes: contract.scope_of_services
                }
            });

            // Create corresponding Renewal
            await prisma.renewal.create({
                data: {
                    customer_id: contract.customer_id,
                    category: "amc",
                    asset_name: assetName,
                    vendor: "Lenok IT Solutions",
                    purchase_date: contract.start_date,
                    expiry_date: contract.end_date,
                    cost: yearlyCost,
                    currency: "AED",
                    status: status,
                    notes: contract.scope_of_services,
                    renewal_asset_id: asset.id
                }
            });
            console.log(`✨ Created new AMC renewal tracking for customer ${customer.name} (Contract ID: ${contract.id})`);
        }

        // Keep customer type as AMC
        if (customer.type !== "AMC") {
            await prisma.customer.update({
                where: { id: customer.id },
                data: { type: "AMC" }
            });
        }
    } catch (err) {
        console.error("❌ Error in syncContractToRenewal:", err.message);
    }
}

/**
 * Deletes any AMC renewals and assets associated with a customer when their contract is deleted.
 */
async function deleteContractRenewal(customerId) {
    try {
        const renewals = await prisma.renewal.findMany({
            where: {
                customer_id: customerId,
                category: "amc"
            }
        });

        for (const r of renewals) {
            await prisma.renewal.delete({
                where: { id: r.id }
            });

            if (r.renewal_asset_id) {
                await prisma.renewalAsset.delete({
                    where: { id: r.renewal_asset_id }
                }).catch(() => {});
            }
        }
        console.log(`🗑️ Deleted AMC renewals for customer ID ${customerId}`);
    } catch (err) {
        console.error("❌ Error in deleteContractRenewal:", err.message);
    }
}

/**
 * Runs a startup reconciliation to ensure all AMC contracts have a matching renewal record.
 */
async function reconcileExistingContracts() {
    console.log("🔍 Running AMC contract to renewal reconciliation...");
    try {
        const contracts = await prisma.contractAMC.findMany({
            orderBy: { end_date: "desc" }
        });

        // Get unique customer IDs that have a contract
        const customerIdsWithContracts = [...new Set(contracts.map(c => c.customer_id))];

        // Delete any amc renewals for customers who don't have a contract
        const deletedStray = await prisma.renewal.deleteMany({
            where: {
                category: "amc",
                customer_id: {
                    notIn: customerIdsWithContracts
                }
            }
        });
        if (deletedStray.count > 0) {
            console.log(`🗑️ Cleaned up ${deletedStray.count} stray AMC renewals.`);
        }

        let createdCount = 0;
        let syncedCount = 0;

        const processedCustomers = new Set();
        for (const contract of contracts) {
            if (processedCustomers.has(contract.customer_id)) continue;
            processedCustomers.add(contract.customer_id);

            const customerRenewals = await prisma.renewal.findMany({
                where: {
                    customer_id: contract.customer_id,
                    category: "amc"
                },
                orderBy: { expiry_date: "desc" }
            });

            if (customerRenewals.length === 0) {
                await syncContractToRenewal(contract);
                createdCount++;
            } else {
                const latestRenewal = customerRenewals[0];
                if (customerRenewals.length > 1) {
                    const duplicateIds = customerRenewals.slice(1).map(r => r.id);
                    await prisma.renewal.deleteMany({
                        where: { id: { in: duplicateIds } }
                    });
                    console.log(`🗑️ Deleted ${duplicateIds.length} duplicate AMC renewals for customer ID ${contract.customer_id}`);
                }

                // Check if dates are out of sync
                const contractEndDateStr = new Date(contract.end_date).toISOString().split('T')[0];
                const renewalEndDateStr = new Date(latestRenewal.expiry_date).toISOString().split('T')[0];

                if (contractEndDateStr !== renewalEndDateStr) {
                    await syncContractToRenewal(contract);
                    syncedCount++;
                }
            }
        }
        console.log(`✅ Reconciliation complete. Created: ${createdCount}, Synced: ${syncedCount}`);
    } catch (err) {
        console.error("❌ Error in reconcileExistingContracts:", err.message);
    }
}

module.exports = {
    syncContractToRenewal,
    deleteContractRenewal,
    reconcileExistingContracts,
    mapCategoryToAssetType
};
