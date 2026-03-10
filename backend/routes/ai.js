const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Helper for OpenRouter calls.
 * Uses 'openrouter/auto' to dynamically select the best available model.
 */
async function callOpenRouter(messages) {
    const model = "openrouter/auto";

    try {
        console.log(`DEBUG: Calling OpenRouter via: ${model}`);
        const response = await axios.post(
            OPENROUTER_URL,
            { model, messages },
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "X-Title": "Linotec Ticket System",
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.data.choices || response.data.choices.length === 0) {
            console.error("OpenRouter Empty Response:", response.data);
            throw new Error("Empty response from AI");
        }

        return response.data.choices[0].message.content;
    } catch (error) {
        const errorData = error.response?.data || error.message;
        console.error("OpenRouter Error Details:", JSON.stringify(errorData, null, 2));
        if (error.response?.status === 404) {
            throw new Error(`Model "${model}" not found on OpenRouter.`);
        }
        throw error;
    }
}

/**
 * Keyword-based classification helper.
 * Used as fallback when AI classification is unavailable.
 */
function keywordClassify(text) {
    const desc = text.toLowerCase();

    // Category + Priority detection
    if (
        desc.includes("server") && (desc.includes("down") || desc.includes("crash") || desc.includes("not connecting")) ||
        desc.includes("data breach") ||
        desc.includes("system crash") ||
        desc.includes("complete outage")
    ) {
        return { category: "Server Issue", priority: "Critical" };
    }

    if (
        desc.includes("payment") || desc.includes("gateway") ||
        desc.includes("checkout") || desc.includes("billing fail") ||
        desc.includes("transaction fail")
    ) {
        return { category: "Payment Issue", priority: "High" };
    }

    if (
        desc.includes("login") || desc.includes("sign in") ||
        desc.includes("password") || desc.includes("account locked") ||
        desc.includes("access denied") || desc.includes("authentication")
    ) {
        return { category: "Login Issue", priority: "Medium" };
    }

    if (
        desc.includes("website") || desc.includes("web page") ||
        desc.includes("bug") || desc.includes("ui") ||
        desc.includes("glitch") || desc.includes("broken") ||
        desc.includes("not loading") || desc.includes("display issue")
    ) {
        return { category: "Website Bug", priority: "High" };
    }

    if (
        desc.includes("email") || desc.includes("mail") ||
        desc.includes("inbox") || desc.includes("smtp") ||
        desc.includes("not receiving")
    ) {
        return { category: "Email Issue", priority: "Medium" };
    }

    if (desc.includes("server") || desc.includes("slow") || desc.includes("performance")) {
        return { category: "Server Issue", priority: "High" };
    }

    if (
        desc.includes("feature request") || desc.includes("how to") ||
        desc.includes("question") || desc.includes("inquiry") || desc.includes("how do i")
    ) {
        return { category: "General Support", priority: "Low" };
    }

    // Feature issues = Medium
    if (desc.includes("feature") || desc.includes("not working") || desc.includes("issue")) {
        return { category: "General Support", priority: "Medium" };
    }

    return { category: "General Support", priority: "Low" };
}

// Hugging Face Classification Helper (Uses Dragneel model)
async function classifyWithDragneel(text) {
    try {
        console.log("Classifying with Dragneel/ticket-classification-v1 via Hugging Face...");
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/Dragneel/ticket-classification-v1",
            { inputs: text },
            { headers: { "Content-Type": "application/json" } }
        );

        const result = response.data;
        if (Array.isArray(result) && Array.isArray(result[0])) {
            const sorted = result[0].sort((a, b) => b.score - a.score);
            return sorted[0].label;
        }
        return "General Inquiry";
    } catch (error) {
        console.error("Hugging Face Error:", error.response?.data || error.message);
        return "General Inquiry"; // Fallback
    }
}

// ─── AI CHAT ENDPOINT (Zero-Touch Resolution) ─────────────────────────────────
router.post("/chat", verifyToken, async (req, res) => {
    const { message, context } = req.body;

    if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ message: "OpenRouter API Key missing in .env" });
    }

    try {
        const systemPrompt = `You are an expert IT Support Agent for Linotec, a technology company.
Your primary goal is ZERO-TOUCH RESOLUTION — solve the user's issue yourself before any human intervention.

Guidelines:
- Provide specific, step-by-step troubleshooting instructions tailored to the reported problem.
- Be concise but thorough. Use numbered steps when giving instructions.
- Do NOT say "contact support" or "raise a ticket" as your first response.
- If the issue involves: server outages, data breaches, or payment failures, acknowledge urgency first.
- After giving your solution, end with: "Did these steps resolve your issue?"
- Keep a friendly, professional tone.

Categories you handle: Server Issues, Website Bugs, Login Issues, Payment Issues, Email Issues, General Support.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...(context || []).map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content || m.message || "",
            })),
            { role: "user", content: message },
        ];

        const reply = await callOpenRouter(messages);
        res.json({ reply, role: "assistant" });
    } catch (err) {
        console.error("Chat Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// ─── AI ESCALATE ENDPOINT (Auto-Draft Ticket from Conversation) ───────────────
router.post("/escalate", verifyToken, async (req, res) => {
    const { conversation } = req.body;

    if (!conversation || conversation.length === 0) {
        return res.status(400).json({ message: "No conversation provided for escalation." });
    }

    // Build a summary of the conversation for the AI
    const conversationText = conversation
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");

    if (!OPENROUTER_API_KEY) {
        // Fallback to keyword classification using the first user message
        const firstUserMsg = conversation.find((m) => m.role === "user")?.content || "";
        const { category, priority } = keywordClassify(firstUserMsg);
        return res.json({
            issue_title: "Support Request",
            description: firstUserMsg,
            category,
            priority,
        });
    }

    try {
        const messages = [
            {
                role: "system",
                content: `You are a ticket classification system. Analyze the conversation and return ONLY a valid JSON object with these exact fields:
{
  "issue_title": "Brief, specific title (max 10 words)",
  "description": "Clear summary of the problem from the user's perspective (2-3 sentences)",
  "category": "ONE of: Server Issue, Website Bug, Login Issue, Payment Issue, Email Issue, General Support",
  "priority": "ONE of: Critical, High, Medium, Low"
}

Priority rules:
- Critical: Server completely down, data breach, complete system failure
- High: Payment failing, checkout error, website broken, cannot access critical feature
- Medium: Specific feature not working, UI glitch, slow performance
- Low: General how-to question, feature request, minor cosmetic issue

Return ONLY the JSON. No explanation, no markdown, no code blocks.`,
            },
            {
                role: "user",
                content: `Please analyze this support conversation and generate a ticket:\n\n${conversationText}`,
            },
        ];

        const responseText = await callOpenRouter(messages);

        // Extract JSON from response (handle models that wrap in markdown)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        const draft = JSON.parse(jsonMatch[0]);

        // Validate all required fields exist
        const validCategories = ["Server Issue", "Website Bug", "Login Issue", "Payment Issue", "Email Issue", "General Support"];
        const validPriorities = ["Critical", "High", "Medium", "Low"];

        if (!validCategories.includes(draft.category)) draft.category = "General Support";
        if (!validPriorities.includes(draft.priority)) draft.priority = "Medium";

        res.json(draft);
    } catch (err) {
        console.error("Escalate Error:", err.message);

        // Fallback: use keyword classifier on first user message
        const firstUserMsg = conversation.find((m) => m.role === "user")?.content || "";
        const { category, priority } = keywordClassify(firstUserMsg);

        res.json({
            issue_title: "IT Support Request",
            description: firstUserMsg,
            category,
            priority,
        });
    }
});

// ─── SMART CLASSIFICATION ENDPOINT ───────────────────────────────────────────
router.post("/classify", verifyToken, async (req, res) => {
    const { description } = req.body;

    if (!description) {
        return res.status(400).json({ message: "Description is required." });
    }

    try {
        // Try Hugging Face first
        const hfLabel = await classifyWithDragneel(description);

        let category = "General Support";
        let priority = "Medium";

        if (hfLabel === "Billing Question") {
            category = "Payment Issue";
            priority = "High";
        } else if (hfLabel === "Technical Issue") {
            // Use keyword rules to determine sub-category and priority
            const classified = keywordClassify(description);
            category = classified.category;
            priority = classified.priority;
        } else if (hfLabel === "Feature Request") {
            category = "General Support";
            priority = "Low";
        } else {
            // HF returned unknown label — fall back to keyword classification
            const classified = keywordClassify(description);
            category = classified.category;
            priority = classified.priority;
        }

        res.json({ category, priority });
    } catch (err) {
        console.error("Classification Error:", err.message);

        // Final fallback: pure keyword classification
        const classified = keywordClassify(description);
        res.json(classified);
    }
});

// ─── SCREENSHOT ANALYSIS ENDPOINT (Vision) ───────────────────────────────────
router.post("/analyze-screenshot", verifyToken, upload.single("screenshot"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No screenshot uploaded." });

    if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ message: "OpenRouter API Key missing." });
    }

    try {
        const base64Image = req.file.buffer.toString("base64");
        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Analyze this screenshot of a technical error. Return ONLY valid JSON: { "issue_title": "...", "description": "...", "category": "...", "priority": "..." }. Categories: Server Issue, Website Bug, Login Issue, Payment Issue, Email Issue, General Support. Priorities: Critical, High, Medium, Low.`,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${req.file.mimetype};base64,${base64Image}`,
                        },
                    },
                ],
            },
        ];

        const responseText = await callOpenRouter(messages);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

        res.json(analysis);
    } catch (err) {
        console.error("Screenshot Analysis Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
