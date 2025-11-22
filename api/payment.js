// api/payment.js
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

  console.log(`📨 Payment API - Method: ${req.method}`);

  try {
    switch (req.method) {
      case 'GET':
        return handleGetPayment(req, res);
      case 'POST':
        return handleCreatePayment(req, res);
      case 'PUT':
        return handleUpdatePayment(req, res);
      default:
        res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Payment API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// GET /api/payment - Get payment by order_id
async function handleGetPayment(req, res) {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  try {
    // First, try to get payment info from orders table
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      throw orderError;
    }

    // If payment_method is credit and using manual_payments, check that table
    if (order.payment_method === 'credit') {
      try {
        const { data: manualPayment, error: manualError } = await supabase
          .from('manual_payments')
          .select('*')
          .eq('order_id', order_id)
          .single();

        if (!manualError && manualPayment) {
          return res.status(200).json({
            success: true,
            data: {
              ...order,
              manual_payment: manualPayment
            },
            payment_type: 'manual'
          });
        }
      } catch (manualError) {
        // If manual_payments table doesn't exist, continue with order data
        console.log('Manual payments table not available, using order data');
      }
    }

    // Return order payment info
    res.status(200).json({
      success: true,
      data: order,
      payment_type: 'simple'
    });

  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// POST /api/payment - Create payment
async function handleCreatePayment(req, res) {
  const paymentData = req.body;

  // Validation
  if (!paymentData.order_id || !paymentData.amount) {
    return res.status(400).json({
      success: false,
      message: 'Order ID and amount are required'
    });
  }

  try {
    let result;

    // For credit payments, try to use manual_payments table
    if (paymentData.payment_method === 'credit') {
      try {
        // Create manual payment record
        const paymentCode = `PAY${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
        
        const manualPayment = {
          order_id: paymentData.order_id,
          payment_code: paymentCode,
          payment_method: 'bank_transfer', // Default for credit payments
          amount: paymentData.amount,
          status: 'pending',
          created_at: new Date().toISOString(),
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        const { data, error } = await supabase
          .from('manual_payments')
          .insert([manualPayment])
          .select()
          .single();

        if (error) {
          // If manual_payments table doesn't exist, fallback to updating orders table
          console.log('Manual payments table not available, updating orders table instead');
          result = await updateOrderPayment(paymentData);
        } else {
          result = { data, error: null };
        }
      } catch (error) {
        // Fallback to updating orders table
        console.log('Manual payment failed, falling back to orders table:', error.message);
        result = await updateOrderPayment(paymentData);
      }
    } else {
      // For cash payments, update orders table directly
      result = await updateOrderPayment(paymentData);
    }

    if (result.error) throw result.error;

    console.log(`✅ Payment created for order: ${paymentData.order_id}`);
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Create Payment Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// Helper function to update order payment
async function updateOrderPayment(paymentData) {
  const updateData = {
    payment_status: 'pending',
    payment_method: paymentData.payment_method || 'cash',
    updated_at: new Date().toISOString()
  };

  // Add down payment info for credit payments
  if (paymentData.payment_method === 'credit') {
    updateData.down_payment = paymentData.amount;
    updateData.down_payment_percent = paymentData.down_payment_percent;
    updateData.loan_term = paymentData.loan_term;
    updateData.monthly_installment = paymentData.monthly_installment;
  }

  return await supabase
    .from('orders')
    .update(updateData)
    .eq('id', paymentData.order_id)
    .select()
    .single();
}

// PUT /api/payment - Update payment status
async function handleUpdatePayment(req, res) {
  const { order_id, status, payment_proof, manual_payment_id } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({
      success: false,
      message: 'Order ID and status are required'
    });
  }

  try {
    let result;

    // Check if updating manual payment
    if (manual_payment_id) {
      try {
        // Update manual payment
        const updateData = { 
          status,
          updated_at: new Date().toISOString()
        };
        
        if (status === 'paid') {
          updateData.paid_at = new Date().toISOString();
          if (payment_proof) {
            updateData.payment_proof_image = payment_proof;
          }
        }

        result = await supabase
          .from('manual_payments')
          .update(updateData)
          .eq('id', manual_payment_id)
          .select()
          .single();

        if (result.error) {
          throw result.error;
        }
      } catch (error) {
        console.log('Manual payment update failed, updating order instead:', error.message);
        result = await updateOrderPaymentStatus(order_id, status, payment_proof);
      }
    } else {
      // Update order payment directly
      result = await updateOrderPaymentStatus(order_id, status, payment_proof);
    }

    if (result.error) throw result.error;

    console.log(`✅ Payment updated: ${status} for order ${order_id}`);
    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Update Payment Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// Helper function to update order payment status
async function updateOrderPaymentStatus(order_id, status, payment_proof) {
  const updateData = { 
    payment_status: status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'paid') {
    updateData.payment_date = new Date().toISOString();
  }
  
  if (payment_proof) {
    updateData.payment_proof = payment_proof;
  }

  return await supabase
    .from('orders')
    .update(updateData)
    .eq('id', order_id)
    .select()
    .single();
}

module.exports = handler;