const axios = require("axios");
require("dotenv").config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const models = [
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "openrouter/auto"
];

// Small 1x1 black pixel base64
const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function test() {
    for (const model of models) {
        console.log("Testing Vision on model:", model);
        try {
            const response = await axios.post(
                OPENROUTER_URL,
                {
                    model: model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "What is this image?"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${dummyBase64}`
                                    }
                                }
                            ]
                        }
                    ],
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
            console.log("Reply:", response.data.choices[0].message.content);
        } catch (err) {
            console.error("❌ Failed:", err.response?.data?.error?.message || err.message);
        }
    }
}

test();
