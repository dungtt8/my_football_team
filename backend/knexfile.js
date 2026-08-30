// backend/knexfile.js
require('dotenv').config();

const productionConnection = process.env.DB_HOST
  ? {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  : process.env.DATABASE_URL;

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/football_team',
    pool: {
      min: 2,
      max: 10,
      afterCreate: (connection, callback) => {
        connection.query('SET timezone="UTC"', (err) => {
          callback(err, connection);
        });
      }
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'js'
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'js'
    }
  },

  production: {
    client: 'postgresql',
    // Match the connection used by src/config/database.js. DATABASE_URL remains
    // available for hosts that provide only a single connection string.
    connection: productionConnection,
    pool: {
      min: 2,
      max: 10,
      afterCreate: (connection, callback) => {
        connection.query('SET timezone="UTC"', (err) => {
          callback(err, connection);
        });
      }
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'js'
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'js'
    }
  }
};
