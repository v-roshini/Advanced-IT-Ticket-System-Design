const axios = require("axios");
require("dotenv").config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const models = [
    "google/gemini-2.5-pro-exp-03-25:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-coder:free",
    "openrouter/auto"
];

async function test() {
    for (const model of models) {
        console.log("Testing model:", model);
        try {
            const response = await axios.post(
                OPENROUTER_URL,
                {
                    model: model,
                    messages: [{ role: "user", content: "Hello" }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        "X-Title": "Linotec Ticket System",
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log("✅ Success! Model worked:", model);
            return; // Exit on first success
        } catch (err) {
            console.error("❌ Failed:", err.response?.data?.error?.message || err.message);
        }
    }
}

test();
