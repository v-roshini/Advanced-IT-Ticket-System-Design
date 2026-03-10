const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test the connection
db.getConnection()
    .then((conn) => {
        console.log("✅ MySQL Connected Successfully ");
        conn.release();
    })
    .catch((err) => {
        console.error("❌ Database connection failed:", err.message);
    });

module.exports = db;
