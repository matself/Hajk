#!/usr/bin/env node

/**
 * Setup script to create a sample Hajk SQLite database
 * Usage: node setup-sqlite-db.js
 *
 * This creates hajk.db with sample data from the schema
 */

const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hajk.db');

// Read the SQL file
const sqlFile = path.join(__dirname, 'create-hajk-sqlite.sql');

if (!fs.existsSync(sqlFile)) {
  console.error(`Error: ${sqlFile} not found`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf-8');

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

// Create database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }

  console.log(`Creating database: ${DB_PATH}`);

  // Execute statements sequentially
  let count = 0;

  const executeNext = (index) => {
    if (index >= statements.length) {
      console.log(`\n✓ Database created successfully with ${count} statements`);
      console.log(`Database file: ${DB_PATH}`);
      db.close();
      process.exit(0);
    }

    const stmt = statements[index];
    db.exec(stmt, (err) => {
      if (err) {
        console.error(`Error executing statement ${index + 1}:`, err);
        console.error('Statement:', stmt.substring(0, 100) + '...');
        db.close();
        process.exit(1);
      }
      count++;
      if (count % 10 === 0) {
        process.stdout.write('.');
      }
      executeNext(index + 1);
    });
  };

  executeNext(0);
});
