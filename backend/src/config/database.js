const knex = require('knex');
require('dotenv').config();

const config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: { min: 2, max: 10 },
    migrations: {
        directory: './src/database/migrations',
        extension: 'js'
    }
};

const db = knex(config);

module.exports = db;
