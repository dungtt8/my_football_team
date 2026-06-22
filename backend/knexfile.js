// backend/knexfile.js
require('dotenv').config();

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
    connection: process.env.DATABASE_URL,
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
    },
    ssl: {
      rejectUnauthorized: false
    }
  }
};
