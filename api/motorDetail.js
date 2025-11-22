// api/motorDetail.js
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

  console.log(`📨 Motor Detail API - Method: ${req.method}`);

  try {
    if (req.method === 'GET') {
      return handleGetMotorDetail(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Motor Detail API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// GET /api/motor-detail - Get detailed motorcycle information by ID
async function handleGetMotorDetail(req, res) {
  const { id } = req.query;

  // Validation
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Motorcycle ID is required'
    });
  }

  try {
    console.log(`🔍 Fetching motorcycle details for ID: ${id}`);

    // Get motorcycle details
    const { data: motorcycle, error } = await supabase
      .from('motorcycles')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error) {
      console.error('Database Error:', error);
      
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(404).json({
          success: false,
          message: 'Motorcycle not found'
        });
      }
      throw error;
    }

    if (!motorcycle) {
      return res.status(404).json({
        success: false,
        message: 'Motorcycle not found'
      });
    }

    console.log(`✅ Motorcycle details found: ${motorcycle.name}`);
    
    // 🔹 PERBAIKAN: Return data langsung tanpa wrapper 'data'
    res.status(200).json({
      success: true,
      data: motorcycle // Data langsung di dalam property 'data'
    });

  } catch (error) {
    console.error('Get Motor Detail Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;