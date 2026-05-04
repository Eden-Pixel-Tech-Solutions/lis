import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306 // Checking common ports
};

async function setup() {
  let connection;
  try {
    // 1. Connect without database to create it
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server.');

    const dbName = process.env.DB_NAME || 'meril-hims';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" checked/created.`);
    await connection.end();

    console.log('\nStarting table migrations...');
    // The existing scripts use 'meril_hmis' or 'meril-hims' inconsistently.
    // I'll suggest running the existing scripts which use their own connections.
    
  } catch (err) {
    console.error('Setup failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('\nTip: Make sure your MySQL server is running on the specified port.');
    }
  }
}

setup();
