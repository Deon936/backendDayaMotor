// api/advertisements.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET all advertised motorcycles
router.get('/', async (req, res) => {
  try {
    console.log('📢 GET /api/advertisements called');
    
    const { data, error } = await supabase
      .from('advertised_motorcycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: error.message
      });
    }

    const advertisements = (data || []).map(ad => ({
      id: ad.id,
      name: ad.name,
      category: ad.category,
      price: parseFloat(ad.price),
      image: ad.image,
      description: ad.description,
      created_at: ad.created_at,
      updated_at: ad.updated_at
    }));

    console.log(`✅ Returning ${advertisements.length} advertisements`);
    
    res.json({
      success: true,
      data: advertisements,
      count: advertisements.length
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Pastikan ini di akhir file
module.exports = router;