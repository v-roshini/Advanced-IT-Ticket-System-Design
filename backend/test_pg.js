require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected locally. Checking tables...");
    
    // Check if chat_messages exists
    const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1', ['public']);
    const tables = res.rows.map(r => r.tablename);
    
    if (tables.includes('chat_messages')) {
      console.log('Exists: chat_messages table found. Checking count...');
      const count = await client.query('SELECT COUNT(*) FROM chat_messages');
      console.log('Rows in chat_messages:', count.rows[0].count);
    } else {
      console.log('NOT FOUND: chat_messages table missing.');
      console.log('Creating chat_messages table manually since Prisma db push hangs... ');
      await client.query(`
        CREATE TABLE chat_messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX chat_messages_sender_id_idx ON chat_messages(sender_id);
        CREATE INDEX chat_messages_receiver_id_idx ON chat_messages(receiver_id);
      `);
      console.log('Successfully created chat_messages table.');
    }
    
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    await client.end();
  }
}

testConnection();
