require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
        `Missing Supabase configuration. Required environment variables:\n` +
        `  SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ NOT SET'}\n` +
        `  SUPABASE_SERVICE_KEY: ${supabaseServiceKey ? '✓' : '✗ NOT SET'}\n` +
        `Please set these environment variables in your .env file or Vercel project settings.`
    );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
