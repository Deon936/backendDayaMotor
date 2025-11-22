// api/orders.js
const supabase = require('../lib/supabase');

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Orders API - Method: ${req.method}`);

  try {
    switch (req.method) {
      case 'GET':
        return handleGetOrders(req, res);
      case 'POST':
        return handleCreateOrder(req, res);
      case 'PUT':
        return handleUpdateOrder(req, res);
      default:
        res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Orders API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// GET /api/orders - Get orders by user_id or all orders for admin
async function handleGetOrders(req, res) {
  const { user_id, order_id } = req.query;

  try {
    let query = supabase
      .from('orders')
      .select('*');

    // Filter by user_id if provided (for customers)
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Filter by order_id if provided
    if (order_id) {
      query = query.eq('id', order_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    console.log(`✅ Found ${orders.length} orders`);
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// POST /api/orders - Create new order
async function handleCreateOrder(req, res) {
  const orderData = req.body;

  // Required fields validation
  const requiredFields = ['customer_name', 'nik_ktp', 'birth_place', 'birth_date', 'occupation', 'address', 'customer_phone', 'stnk_name', 'motorcycle_id', 'motorcycle_name', 'total_price'];
  
  for (const field of requiredFields) {
    if (!orderData[field]) {
      return res.status(400).json({
        success: false,
        message: `${field} is required`
      });
    }
  }

  try {
    // Generate order code
    const orderCode = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    const orderToInsert = {
      ...orderData,
      order_code: orderCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting order:', orderToInsert);

    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    console.log(`✅ Order created: ${orderCode}`);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// PUT /api/orders - Update order
async function handleUpdateOrder(req, res) {
  const { order_id, ...updateData } = req.body;

  if (!order_id) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    console.log(`✅ Order updated: ${order_id}`);
    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;