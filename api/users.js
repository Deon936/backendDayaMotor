// api/users.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Users API - Method: ${req.method}, Query:`, req.query);

  try {
    if (req.method === 'GET') {
      return handleGetUser(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Users API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// =====================
// GET USER BY EMAIL
// =====================
async function handleGetUser(req, res) {
  const { email } = req.query;

  console.log(`🔍 GET /api/users - Email: ${email}`);

  // Validation
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  try {
    // Gunakan service key untuk bypass RLS (jika ada)
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseAdmin = require('@supabase/supabase-js').createClient(
      process.env.SUPABASE_URL,
      serviceKey
    );

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, created_at')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      console.error('Database Error:', error);
      
      // Handle policy recursion error specifically
      if (error.code === '42P17' || error.message.includes('infinite recursion')) {
        return res.status(500).json({
          success: false,
          message: 'Database configuration error. Please contact administrator.'
        });
      }
      
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      throw error;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get User Error:', error);
    
    // Handle specific policy errors
    if (error.code === '42P17' || error.message.includes('infinite recursion')) {
      return res.status(500).json({
        success: false,
        message: 'Database policy error. Please check Supabase RLS settings.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;