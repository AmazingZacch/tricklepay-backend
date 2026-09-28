import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  // Safety check: ensure it points to a local host instance
  const isLocal = 
    databaseUrl.includes('localhost') || 
    databaseUrl.includes('127.0.0.1') || 
    databaseUrl.includes('0.0.0.0') ||
    databaseUrl.includes('postgres:postgres@db:'); // common docker-compose local service names if applicable

  if (!isLocal) {
    console.error('❌ Aborted: DATABASE_URL does not appear to point to a local database instance.');
    console.error('This script refuses to run against non-local environments for safety.');
    process.exit(1);
  }

  console.log('Connecting to local database to perform reset...');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    // Drop public schema and recreate it to clear all tables, types, and functions
    console.log('Dropping public schema...');
    await client.query('DROP SCHEMA public CASCADE;');
    
    console.log('Recreating public schema...');
    await client.query('CREATE SCHEMA public;');
    
    console.log('Granting privileges...');
    await client.query('GRANT ALL ON SCHEMA public TO public;');

    console.log('✅ Database successfully reset to an empty schema.');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();