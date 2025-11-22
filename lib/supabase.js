// lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Pastikan environment variables sudah terbaca
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  throw new Error('Supabase configuration is missing. Please check your .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized successfully');

module.exports = supabase;