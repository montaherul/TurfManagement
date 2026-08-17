import { config } from 'dotenv';
import pg from 'pg';

config();

const { Client } = pg;
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
console.log(r.rows.map((x) => x.tablename).join("\n"));
await c.end();