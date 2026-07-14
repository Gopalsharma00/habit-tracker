import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ensure DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ error: 'DATABASE_URL environment variable is missing in Vercel settings.' });
  }

  const sql = neon(databaseUrl);

  try {
    // Automatically create database table if it doesn't exist yet
    await sql`
      CREATE TABLE IF NOT EXISTS habit_tracker_sync (
        sync_key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 1. GET Request: Fetch data for sync key
    if (req.method === 'GET') {
      const { key } = req.query;
      if (!key) {
        return res.status(400).json({ error: 'Sync key is required' });
      }

      const result = await sql`
        SELECT data FROM habit_tracker_sync WHERE sync_key = ${key}
      `;

      if (result.length === 0) {
        return res.status(404).json({ message: 'No sync data found for this key.' });
      }

      return res.status(200).json(result[0].data);
    }

    // 2. POST Request: Upsert data under sync key
    if (req.method === 'POST') {
      const { key, habits, logs, lastUpdated } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'Sync key is required' });
      }

      const data = { habits, logs, lastUpdated };

      await sql`
        INSERT INTO habit_tracker_sync (sync_key, data, updated_at)
        VALUES (${key}, ${data}, CURRENT_TIMESTAMP)
        ON CONFLICT (sync_key)
        DO UPDATE SET data = ${data}, updated_at = CURRENT_TIMESTAMP
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Sync Error:', error);
    return res.status(500).json({ 
      error: 'Database operations failed', 
      details: error.message 
    });
  }
}
