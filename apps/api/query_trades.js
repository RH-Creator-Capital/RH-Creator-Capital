const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT amount, eth_amount_wei, trade_type FROM trade_history ORDER BY timestamp DESC LIMIT 5').then(res => {
  console.log(res.rows);
  pool.end();
});
