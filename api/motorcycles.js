// api/motorcycles.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET all motorcycles
router.get('/', async (req, res) => {
  try {
    console.log('Fetching motorcycles from Supabase...');
    
    const { data, error } = await supabase
      .from('motorcycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch motorcycles from database',
        error: error.message
      });
    }

    console.log(`Found ${data?.length || 0} motorcycles`);

    // Transform data
    const motorcycles = (data || []).map(moto => ({
      id: moto.id,
      name: moto.name || 'Unknown Motorcycle',
      category: moto.category || 'scooter',
      price: parseFloat(moto.price) || 0,
      image: moto.image || '/images/placeholder.jpg',
      specs: moto.specs || 'No specifications available',
      description: moto.description || moto.specs || 'No description available',
      features: moto.features || '',
      available: Boolean(moto.available),
      created_at: moto.created_at,
      updated_at: moto.updated_at  // FIXED: typo moco -> moto
    }));

    res.json({
      success: true,
      data: motorcycles,
      count: motorcycles.length
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET single motorcycle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching motorcycle ID:', id);

    const { data, error } = await supabase
      .from('motorcycles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Motorcycle not found'
      });
    }

    const motorcycle = {
      id: data.id,
      name: data.name,
      category: data.category,
      price: parseFloat(data.price),
      image: data.image,
      specs: data.specs,
      description: data.description,
      features: data.features,
      available: Boolean(data.available),
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({
      success: true,
      data: motorcycle
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;