// api/validateNIK.js
function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Validate NIK API - Method: ${req.method}`);

  try {
    if (req.method === 'POST') {
      return handleValidateNIK(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Validate NIK API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

async function handleValidateNIK(req, res) {
  const { nik } = req.body;

  // Validation
  if (!nik) {
    return res.status(400).json({
      success: false,
      message: 'NIK is required'
    });
  }

  // Basic NIK validation (16 digits)
  const nikRegex = /^\d{16}$/;
  if (!nikRegex.test(nik)) {
    return res.status(400).json({
      success: false,
      message: 'NIK harus terdiri dari 16 digit angka'
    });
  }

  try {
    // Simulasi validasi NIK
    // Di production, integrasikan dengan API Dukcapil atau service validasi resmi
    
    const isValid = await simulateNIKValidation(nik);
    
    if (isValid) {
      res.status(200).json({
        success: true,
        message: 'NIK valid',
        data: {
          nik: nik,
          valid: true,
          message: 'NIK terverifikasi'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'NIK tidak valid'
      });
    }
  } catch (error) {
    console.error('Validate NIK Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// Simulasi validasi NIK
async function simulateNIKValidation(nik) {
  // Untuk demo, anggap semua NIK yang dimulai dengan '32' (Jawa Barat) valid
  return nik.startsWith('32');
}

module.exports = handler;