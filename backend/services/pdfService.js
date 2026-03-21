const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");

/**
 * Generate PDF buffer from an EJS template and data.
 * @param {string} templateName - Name of the .ejs file in templates folder.
 * @param {object} data - Data to inject into the template.
 */
async function generatePDFBuffer(templateName, data) {
    let browser;
    try {
        const templatePath = path.join(__dirname, "../templates", `${templateName}.ejs`);
        const html = await ejs.renderFile(templatePath, data);

        browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"] // Important for Docker/Linux deployments
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "40px", right: "20px", bottom: "40px", left: "20px" }
        });

        return pdfBuffer;
    } catch (err) {
        console.error("❌ PDF generation failed:", err.message);
        throw err;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { generatePDFBuffer };
