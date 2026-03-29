const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini API Key:", key ? key.substring(0, 5) + "..." : "MISSING");

    if (!key || key === "your_gemini_api_key_here") {
        console.log("Error: Key is missing or default.");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(key);

        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        for (const m of models) {
            try {
                console.log(`Checking model: ${m}...`);
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                const response = await result.response;
                console.log(`Model ${m} works! Response: ${response.text().substring(0, 20)}...`);
                break;
            } catch (e) {
                console.log(`Model ${m} failed:`, JSON.stringify(e, null, 2));
            }
        }
    } catch (err) {
        console.error("Gemini Test Failed:");
        console.error(err);
    }
}

testGemini();
