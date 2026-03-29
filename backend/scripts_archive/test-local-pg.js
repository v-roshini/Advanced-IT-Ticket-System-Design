const { Client } = require("pg");
async function testLocal() {
    const client = new Client({
        connectionString: "postgresql://postgres@localhost:5432/postgres",
    });
    try {
        await client.connect();
        console.log("✅ Local Postgres Connected!");
        await client.end();
    } catch (err) {
        console.error("❌ Local Postgres Failed:", err.message);
    }
}
testLocal();
