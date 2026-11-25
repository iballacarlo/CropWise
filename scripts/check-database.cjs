require('dotenv').config();

const mysql = require('mysql2/promise');

async function main() {
  let connection;
  try {
    const host = process.env.DB_HOST?.trim();
    const username = process.env.DB_USERNAME?.trim();
    const rawPort = process.env.DB_PORT;
    const port = Number(rawPort);
    if (!host || !username || !rawPort || !/^\d+$/.test(rawPort)) {
      throw new Error(
        'Set DB_HOST, DB_PORT, and DB_USERNAME in your local .env.',
      );
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be an integer between 1 and 65535.');
    }
    if (process.env.DB_DATABASE !== 'cropwise_db') {
      throw new Error('DB_DATABASE must be cropwise_db.');
    }
    if (process.env.DB_PASSWORD === undefined) {
      throw new Error(
        'Set DB_PASSWORD in your local .env; it may be empty if intentional.',
      );
    }

    connection = await mysql.createConnection({
      host,
      port,
      user: username,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectTimeout: 5000,
    });
    const [rows] = await connection.query(
      'SELECT 1 AS connection_ok, DATABASE() AS database_name',
    );
    const result = rows[0];
    if (result.connection_ok !== 1 || result.database_name !== 'cropwise_db') {
      throw new Error('The connection did not select cropwise_db.');
    }
    console.log('MySQL connection verified for cropwise_db (read-only check).');
  } finally {
    await connection?.end();
  }
}

main().catch((error) => {
  console.error(`Database check failed: ${error.message}`);
  process.exitCode = 1;
});
