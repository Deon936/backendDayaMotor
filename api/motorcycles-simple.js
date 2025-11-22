// api/motorcycles-simple.js
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

  console.log(`📨 Motorcycles Simple API - Method: ${req.method}`);

  try {
    if (req.method === 'GET') {
      return handleGetMotorcycles(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Motorcycles Simple API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

async function handleGetMotorcycles(req, res) {
  try {
    const { data: motorcycles, error } = await supabase
      .from('motorcycles')
      .select('id, name, category, price, image, available')
      .order('name');

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    console.log(`✅ Found ${motorcycles.length} motorcycles`);
    res.status(200).json({
      success: true,
      data: motorcycles
    });
  } catch (error) {
    console.error('Get Motorcycles Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;