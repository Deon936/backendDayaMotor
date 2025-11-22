// api/settings.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Settings API - Method: ${req.method}`);

  try {
    if (req.method === 'GET') {
      return handleGetSettings(req, res);
    } else if (req.method === 'PUT') {
      return handleUpdateSettings(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

async function handleGetSettings(req, res) {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error) {
      // Jika tabel settings tidak ada, return default settings
      if (error.code === 'PGRST116') {
        const defaultSettings = {
          store_name: 'Honda Daya Motor',
          store_address: 'Jl. Raya Cikampek No. 123',
          store_phone: '(021) 1234567',
          store_email: 'info@dayamotor.com',
          business_hours: 'Senin - Minggu: 08:00 - 17:00'
        };
        
        return res.status(200).json({
          success: true,
          data: defaultSettings
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

async function handleUpdateSettings(req, res) {
  const settingsData = req.body;

  try {
    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('id')
      .single();

    let result;
    
    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('settings')
        .update(settingsData)
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings
      result = await supabase
        .from('settings')
        .insert([settingsData])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;