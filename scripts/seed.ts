import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  console.log('Connecting to database for seeding...');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    console.log('Inserting representative payment streams...');

    // Assuming a 'streams' table exists with columns: id, sender, recipient, amount, status, created_at
    // Adjust table name and column schemas if your specific schema varies slightly.
    const query = `
      INSERT INTO public.streams (id, sender, recipient, amount, status, created_at)
      VALUES 
        (
          'stream_pending_01', 
          'G_SENDER_PENDING_EXAMPLE', 
          'G_RECIPIENT_PENDING_EXAMPLE', 
          1000.00, 
          'PENDING', 
          NOW()
        ),
        (
          'stream_active_01', 
          'G_SENDER_ACTIVE_EXAMPLE', 
          'G_RECIPIENT_ACTIVE_EXAMPLE', 
          5000.50, 
          'ACTIVE', 
          NOW() - INTERVAL '2 days'
        ),
        (
          'stream_cancelled_01', 
          'G_SENDER_CANCELLED_EXAMPLE', 
          'G_RECIPIENT_CANCELLED_EXAMPLE', 
          2500.00, 
          'CANCELLED', 
          NOW() - INTERVAL '5 days'
        )
      ON CONFLICT (id) DO NOTHING;
    `;

    await client.query(query);
    console.log('✅ Successfully seeded local database with pending, active, and cancelled streams.');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();