// backend/knexfile.js
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

  staging: {
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
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: 'require'
    },
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
