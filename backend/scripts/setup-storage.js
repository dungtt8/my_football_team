#!/usr/bin/env node

/**
 * Setup Supabase Storage buckets for the application
 * Run: node scripts/setup-storage.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗ NOT SET');
    console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗ NOT SET');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKETS = [
    {
        name: 'team-assets',
        public: true,
        description: 'Team QR codes and other public assets'
    }
];

async function setupBuckets() {
    console.log('🔧 Setting up Supabase Storage buckets...\n');

    for (const bucket of BUCKETS) {
        try {
            // Check if bucket exists
            const { data: existingBuckets } = await supabase.storage.listBuckets();
            const bucketExists = existingBuckets?.some(b => b.name === bucket.name);

            if (bucketExists) {
                console.log(`✓ Bucket "${bucket.name}" already exists`);
                continue;
            }

            // Create bucket
            const { data, error } = await supabase.storage.createBucket(bucket.name, {
                public: bucket.public
            });

            if (error) {
                console.error(`❌ Failed to create bucket "${bucket.name}":`, error.message);
                continue;
            }

            console.log(`✓ Created bucket "${bucket.name}" (public: ${bucket.public})`);

            // Set up CORS policy for public bucket
            if (bucket.public) {
                console.log(`  → Bucket is public and accessible via direct URLs`);
            }
        } catch (error) {
            console.error(`❌ Error setting up bucket "${bucket.name}":`, error.message);
        }
    }

    console.log('\n✅ Storage setup complete!');
    console.log('\nNext steps:');
    console.log('1. Verify buckets in Supabase dashboard: https://app.supabase.com/');
    console.log('2. Go to Storage → Buckets');
    console.log('3. Set CORS policy if needed (usually auto-configured)');
}

setupBuckets().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
