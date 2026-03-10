const axios = require("axios");

const token = "YOUR_TOKEN_HERE"; // Need a real token to test
const URL = "http://localhost:5000/ai/chat";

async function test() {
    try {
        const res = await axios.post(URL,
            { message: "Hello AI" },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Response:", res.data);
    } catch (err) {
        console.error("Test Failed:", err.response?.data || err.message);
    }
}

// test();
// Running this requires a valid token
