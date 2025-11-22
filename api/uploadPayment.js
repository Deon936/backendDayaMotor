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
  console.log('=== 🚨 DEBUG UPLOAD PAYMENT START ===');
  
  try {
    // Log request body
    console.log('📦 Raw request body:', req.body);
    console.log('📋 Body keys:', Object.keys(req.body || {}));
    
    const { file, filename, order_id, payment_method } = req.body;

    console.log('🔍 Parsed fields:');
    console.log('  - order_id:', order_id, 'Type:', typeof order_id);
    console.log('  - filename:', filename);
    console.log('  - payment_method:', payment_method);
    console.log('  - has file:', !!file);
    console.log('  - file type:', typeof file);
    console.log('  - file length:', file ? file.length : 0);

    // Validation dengan logging detail
    if (!file) {
      console.log('❌ VALIDATION FAILED: file is missing or empty');
      return res.status(400).json({
        success: false,
        message: 'Payment proof file is required'
      });
    }

    if (!order_id) {
      console.log('❌ VALIDATION FAILED: order_id is missing');
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    if (!filename) {
      console.log('❌ VALIDATION FAILED: filename is missing');
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // Validasi tipe data order_id
    const orderId = parseInt(order_id);
    if (isNaN(orderId)) {
      console.log('❌ VALIDATION FAILED: order_id is not a number');
      return res.status(400).json({
        success: false,
        message: 'Order ID must be a valid number'
      });
    }

    console.log('✅ All validations passed');

    // Cek apakah order exists
    console.log(`🔍 Checking if order ${orderId} exists...`);
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, order_code, customer_name, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !existingOrder) {
      console.log(`❌ Order ${orderId} not found:`, orderError);
      return res.status(404).json({
        success: false,
        message: `Order dengan ID ${orderId} tidak ditemukan`
      });
    }

    console.log(`✅ Order found: ${existingOrder.order_code} - ${existingOrder.customer_name}`);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop() || 'jpg';
    const uniqueFilename = `payment_${orderId}_${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    console.log(`💾 Saving file: ${uniqueFilename}`);

    // Decode base64
    let base64Data = file;
    if (file.startsWith('data:')) {
      base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      console.log('✅ Base64 data URL detected and cleaned');
    } else {
      console.log('ℹ️  Raw base64 data (no data URL prefix)');
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Validasi buffer
    if (buffer.length === 0) {
      console.log('❌ Buffer is empty after base64 decoding');
      throw new Error('Failed to decode base64 file data');
    }

    console.log(`✅ Base64 decoded successfully, buffer size: ${buffer.length} bytes`);

    // Save file
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ File saved to: ${filePath}`);

    // Update order dengan payment proof
    const relativePath = `/uploads/${uniqueFilename}`;
    
    const updateData = {
      payment_proof: relativePath,
      payment_status: 'pending',
      updated_at: new Date().toISOString()
    };

    if (payment_method) {
      updateData.payment_method = payment_method;
    }

    console.log(`🔄 Updating order ${orderId} in database...`);

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Order updated successfully`);

    res.status(200).json({
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
    });

  } catch (error) {
    console.error('❌ Upload process error:', error);
    res.status(500).json({
      success: false,
      message: `Upload failed: ${error.message}`
    });
  } finally {
    console.log('=== 🚨 DEBUG UPLOAD PAYMENT END ===');
  }
}

module.exports = handler;