require('dotenv').config();

const mysql = require('mysql2/promise');

function readConfig() {
  const host = process.env.DB_HOST?.trim();
  const username = process.env.DB_USERNAME?.trim();
  const database = process.env.DB_DATABASE?.trim();
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
  if (database !== 'cropwise_db') {
    throw new Error('DB_DATABASE must be cropwise_db.');
  }
  if (process.env.DB_PASSWORD === undefined) {
    throw new Error(
      'Set DB_PASSWORD in your local .env; it may be empty if intentional.',
    );
  }

  return {
    host,
    port,
    user: username,
    password: process.env.DB_PASSWORD,
  };
}

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(readConfig());
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS `cropwise_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    console.log('Database cropwise_db is ready.');
  } finally {
    await connection?.end();
  }
}

main().catch((error) => {
  console.error(`Could not create cropwise_db: ${error.message}`);
  process.exitCode = 1;
});
