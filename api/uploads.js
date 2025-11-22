// api/uploadPayment.js
const supabase = require('../lib/supabase');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Upload Payment API - Method: ${req.method}`);

  try {
    if (req.method === 'POST') {
      return handlePaymentUpload(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Upload Payment API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

async function handlePaymentUpload(req, res) {
  const { file, filename, order_id, payment_method } = req.body;

  // Validation
  if (!file || !filename || !order_id) {
    return res.status(400).json({
      success: false,
      message: 'File, filename, and order_id are required'
    });
  }

  try {
    // Generate unique filename for payment proof
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `payment_${order_id}_${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Decode base64 and save to file system
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Payment proof saved: ${uniqueFilename}`);

    // Update order with payment proof
    const relativePath = `/uploads/${uniqueFilename}`;
    
    const updateData = {
      payment_proof: relativePath,
      payment_status: 'pending',
      updated_at: new Date().toISOString()
    };

    // If payment method is provided, update it
    if (payment_method) {
      updateData.payment_method = payment_method;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order with payment proof:', updateError);
      throw updateError;
    }

    console.log(`✅ Order ${order_id} updated with payment proof`);

    // Return success response
    const responseData = {
      success: true,
      message: 'Payment proof uploaded successfully',
      data: {
        order: updatedOrder,
        file_info: {
          filename: uniqueFilename,
          file_path: relativePath,
          file_size: buffer.length,
          uploaded_at: new Date().toISOString()
        }
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Payment Upload Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;