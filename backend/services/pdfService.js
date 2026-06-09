const PDFDocument = require("pdfkit");

/**
 * Generate PDF buffer from data using PDFKit (pure JS, no browser needed).
 * @param {string} templateName - Unused in this version, but kept for signature compatibility.
 * @param {object} data - Data to inject into the template.
 */
async function generatePDFBuffer(templateName, data) {
    return new Promise((resolve, reject) => {
        try {
            // Create a new PDF document
            const doc = new PDFDocument({
                size: "A4",
                margin: 40,
                bufferPages: true
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            // Theme Colors (Clean Slate Blue and Neutral Dark)
            const primaryColor = "#007bff";
            const darkGrey = "#333333";
            const lightGrey = "#777777";
            const borderGrey = "#dddddd";

            // Helper to format currency
            const formatCurrency = (val) => {
                const num = Number(val);
                return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
            };

            // --- HEADER ---
            // Draw Company Logo
            doc.fillColor(primaryColor)
               .font("Helvetica-Bold")
               .fontSize(24)
               .text("Lenok IT SOLUTIONS", 40, 40);

            // Invoice Title
            doc.fillColor(darkGrey)
               .fontSize(20)
               .font("Helvetica-Bold")
               .text("INVOICE", 400, 40, { align: "right" });

            // Invoice Details (No. & Date)
            const invoiceDate = data.created_at ? new Date(data.created_at).toLocaleDateString() : new Date().toLocaleDateString();
            doc.fontSize(10)
               .font("Helvetica")
               .fillColor(lightGrey)
               .text(`No: ${data.invoice_no || "N/A"}`, 400, 65, { align: "right" })
               .text(`Date: ${invoiceDate}`, 400, 80, { align: "right" });

            // Top Separator Accent Line
            doc.strokeColor(primaryColor)
               .lineWidth(2)
               .moveTo(40, 110)
               .lineTo(555, 110)
               .stroke();

            // --- BILLING INFORMATION ---
            const detailsY = 130;

            // Billing To (Customer Profile)
            doc.fillColor(primaryColor)
               .font("Helvetica-Bold")
               .fontSize(11)
               .text("Billing To:", 40, detailsY);

            doc.fillColor(darkGrey)
               .font("Helvetica-Bold")
               .fontSize(10)
               .text(data.customer_name || "Customer", 40, detailsY + 18);

            doc.font("Helvetica")
               .fillColor(lightGrey)
               .text(data.company_name || "N/A", 40, detailsY + 32)
               .text(data.customer_email || "N/A", 40, detailsY + 46);

            // From (Company Profile)
            doc.fillColor(primaryColor)
               .font("Helvetica-Bold")
               .fontSize(11)
               .text("From:", 350, detailsY);

            doc.fillColor(darkGrey)
               .font("Helvetica-Bold")
               .fontSize(10)
               .text("Lenok IT Solutions", 350, detailsY + 18);

            doc.font("Helvetica")
               .fillColor(lightGrey)
               .text("123 Tech Park, Suite 400", 350, detailsY + 32)
               .text("City, State, Zip", 350, detailsY + 46);

            // --- LINE ITEMS TABLE ---
            const tableTop = 220;

            // Table Header Background Bar
            doc.rect(40, tableTop, 515, 24)
               .fill(primaryColor);

            // Table Header Column Labels
            doc.fillColor("#ffffff")
               .font("Helvetica-Bold")
               .fontSize(9);

            doc.text("Description", 50, tableTop + 8, { width: 230 });
            doc.text("Quantity", 290, tableTop + 8, { width: 60, align: "right" });
            doc.text("Price", 360, tableTop + 8, { width: 80, align: "right" });
            doc.text("Amount", 450, tableTop + 8, { width: 95, align: "right" });

            let currentY = tableTop + 24;

            // Table Body
            doc.fillColor(darkGrey)
               .font("Helvetica")
               .fontSize(9);

            const items = data.items || [];
            items.forEach((item) => {
                const desc = item.description || "Service";
                const qty = item.quantity !== undefined ? item.quantity : 1;
                const price = item.unit_price !== undefined ? item.unit_price : 0;
                const amt = item.amount !== undefined ? item.amount : 0;

                // Calculate multi-line height for description
                const textHeight = doc.heightOfString(desc, { width: 230 });
                const rowHeight = Math.max(textHeight + 16, 28);

                // Add page break if content overflows the A4 height
                if (currentY + rowHeight > 730) {
                    doc.addPage();
                    currentY = 40;

                    // Redraw Table Header Bar on new page
                    doc.rect(40, currentY, 515, 24).fill(primaryColor);
                    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
                    doc.text("Description", 50, currentY + 8, { width: 230 });
                    doc.text("Quantity", 290, currentY + 8, { width: 60, align: "right" });
                    doc.text("Price", 360, currentY + 8, { width: 80, align: "right" });
                    doc.text("Amount", 450, currentY + 8, { width: 95, align: "right" });

                    currentY += 24;
                    doc.fillColor(darkGrey).font("Helvetica").fontSize(9);
                }

                // Render Item Cell Data
                doc.text(desc, 50, currentY + 8, { width: 230 });
                doc.text(qty.toString(), 290, currentY + 8, { width: 60, align: "right" });
                doc.text(formatCurrency(price), 360, currentY + 8, { width: 80, align: "right" });
                doc.text(formatCurrency(amt), 450, currentY + 8, { width: 95, align: "right" });

                // Bottom Border Separator
                doc.strokeColor(borderGrey)
                   .lineWidth(1)
                   .moveTo(40, currentY + rowHeight)
                   .lineTo(555, currentY + rowHeight)
                   .stroke();

                currentY += rowHeight;
            });

            // --- TOTALS CALCULATION ---
            const totalsHeight = 80;
            // Page break check for totals block
            if (currentY + totalsHeight > 730) {
                doc.addPage();
                currentY = 40;
            }

            const subtotal = data.subtotal !== undefined ? data.subtotal : 0;
            const taxPercentage = data.tax_percentage !== undefined ? data.tax_percentage : 0;
            const taxAmount = data.tax_amount !== undefined ? data.tax_amount : 0;
            const totalAmount = data.total_amount !== undefined ? data.total_amount : 0;

            doc.font("Helvetica")
               .fontSize(10)
               .fillColor(lightGrey);

            // Subtotal row
            doc.text("Subtotal:", 320, currentY + 20, { width: 120, align: "right" });
            doc.fillColor(darkGrey).text(formatCurrency(subtotal), 450, currentY + 20, { width: 95, align: "right" });

            // Tax row
            doc.fillColor(lightGrey).text(`Tax (${taxPercentage}%):`, 320, currentY + 36, { width: 120, align: "right" });
            doc.fillColor(darkGrey).text(formatCurrency(taxAmount), 450, currentY + 36, { width: 95, align: "right" });

            // Total row
            doc.font("Helvetica-Bold")
               .fontSize(12)
               .fillColor(primaryColor);
            doc.text("Total:", 320, currentY + 54, { width: 120, align: "right" });
            doc.text(formatCurrency(totalAmount), 450, currentY + 54, { width: 95, align: "right" });

            // --- CENTRED FOOTER ON ALL PAGES ---
            const pages = doc.bufferedPageRange();
            for (let i = pages.start; i < pages.start + pages.count; i++) {
                doc.switchToPage(i);
                doc.fillColor(lightGrey)
                   .font("Helvetica")
                   .fontSize(8)
                   .text(
                       "Thank you for your business! Please pay this invoice within 15 days.",
                       40,
                       800,
                       { align: "center", width: 515 }
                   );
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePDFBuffer };
