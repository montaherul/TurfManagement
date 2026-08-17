import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../src/db/procedures.sql');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const sql = await fs.readFile(sqlPath, 'utf8');
  console.log(`Installing procedures from ${sqlPath} ...`);
  await client.query(sql);
  const { rows } = await client.query(`
    SELECT p.proname, pg_get_function_result(p.oid) AS returns
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('fn_json_amount','fn_analytics_dashboard','fn_analytics_score_trends',
                        'fn_analytics_score_distribution','fn_analytics_workorder_status',
                        'fn_analytics_maintenance_costs','fn_list_inspections')
    ORDER BY p.proname
  `);
  console.log('Installed procedures:');
  for (const r of rows) {
    console.log(`  - ${r.proname}() RETURNS ${r.returns}`);
  }
  console.log('Done.');
} catch (err) {
  console.error('Failed to install procedures:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}