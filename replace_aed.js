const fs = require('fs');

const files = [
    'frontend/src/pages/Renewals.jsx',
    'frontend/src/pages/Dashboard.jsx',
    'frontend/src/pages/CustomerDashboard.jsx',
    'frontend/src/pages/CustomerBilling.jsx',
    'frontend/src/pages/Billing.jsx',
    'frontend/src/pages/AMCContracts.jsx',
    'frontend/src/pages/AdminPanel.jsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    let originalText = text;

    // 1. Label replacements
    text = text.split('($)').join('(AED)');
    text = text.replace(/Default Hourly Rate \(\$\)/g, 'Default Hourly Rate (AED)');
    
    // 2. Specific exact replacements based on previous output
    text = text.replace(/>\$\{r\.cost/g, '>AED {r.cost');
    text = text.replace(/Cost \(\$\)/g, 'Cost (AED)');
    text = text.replace(/>\$\{monthlyRevenue/g, '>AED {monthlyRevenue');
    text = text.replace(/>\$\{nextRenewal/g, '>AED {nextRenewal');
    text = text.replace(/              \$\{pendingTotal/g, '              AED {pendingTotal'); // CustomerDashboard.jsx
    text = text.replace(/>\$\{totalSpent/g, '>AED {totalSpent');
    text = text.replace(/>\$\{pendingAmount/g, '>AED {pendingAmount');
    text = text.replace(/>\$\{billing\[0\]\?\.total_amount/g, '>AED {billing[0]?.total_amount');
    text = text.replace(/>\$\{b\.total_amount/g, '>AED {b.total_amount');
    text = text.replace(/>\$\{currentMonthRevenue/g, '>AED {currentMonthRevenue');
    text = text.replace(/>\$\{b\.hourly_rate/g, '>AED {b.hourly_rate');
    text = text.replace(/Hour \(\$\)/g, 'Hour (AED)');
    text = text.replace(/>\$\{totalAmount/g, '>AED {totalAmount');
    text = text.replace(/>\$\{c\.extra_hour_rate/g, '>AED {c.extra_hour_rate');
    text = text.replace(/Rate \(\$\)/g, 'Rate (AED)');
    text = text.replace(/>\$\{calcTotal/g, '>AED {calcTotal');
    
    // 3. Renewals specific
    text = text.replace(/currency: "USD"/g, 'currency: "AED"');
    
    if (text !== originalText) {
        fs.writeFileSync(file, text);
        console.log('Updated ' + file);
    }
}
console.log('✅ Replacement finished');
