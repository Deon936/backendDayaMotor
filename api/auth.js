// api/auth.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Demo accounts untuk testing
const demoAccounts = {
  "admin@dayamotor.com": {
    password: "admin123",
    role: "admin",
    name: "Super Admin",
    phone: "08123456789",
  },
  "demo@customer.com": {
    password: "demo123",
    role: "customer", 
    name: "Demo Customer",
    phone: "081987654321",
    address: "Jl. Raya Cikampek No. 99"
  }
};

async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.body;

    console.log(`Auth API - Action: ${action}`);

    switch (action) {
      case 'login':
        await handleLogin(req, res);
        break;
      case 'register':
        await handleRegister(req, res);
        break;
      case 'verify_otp':
        await handleVerifyOtp(req, res);
        break;
      case 'resend_otp':
        await handleResendOtp(req, res);
        break;
      case 'forgot_password':
        await handleForgotPassword(req, res);
        break;
      case 'reset_password':
        await handleResetPassword(req, res);
        break;
      default:
        res.status(400).json({
          status: 'error',
          message: 'Action tidak valid.'
        });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({
      status: 'error',
      message: `Server error: ${error.message}`
    });
  }
}

// =====================
// LOGIN HANDLER
// =====================
async function handleLogin(req, res) {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required.'
    });
  }

  const emailLower = email.trim().toLowerCase();
  const passwordTrim = password.trim();

  try {
    // Check demo accounts first
    if (demoAccounts[emailLower]) {
      const user = demoAccounts[emailLower];
      
      if (passwordTrim !== user.password) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid password.'
        });
      }

      // Demo login successful
      return res.status(200).json({
        status: 'success',
        message: 'Login successful.',
        user: {
          id: emailLower === "admin@dayamotor.com" ? 'demo-admin-1' : 'demo-customer-1',
          email: emailLower,
          name: user.name,
          role: user.role,
          phone: user.phone || '',
          address: user.address || '',
        },
        token: generateToken()
      });
    }

    // Check in Supabase database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailLower)
      .single();

    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    // Verify password (assuming passwords are hashed with bcrypt)
    // For demo purposes, we'll compare directly. In production, use proper hashing.
    if (passwordTrim !== user.password && !verifyPassword(passwordTrim, user.password)) {
      return res.status(401).json({
        status: 'error', 
        message: 'Invalid password.'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email belum terverifikasi. Silakan verifikasi email terlebih dahulu.',
        needs_verification: true,
        user_id: user.id
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // Login successful
    res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
      },
      token: generateToken()
    });

  } catch (error) {
    console.error('Login Error:', error);
    throw error;
  }
}

// =====================
// REGISTER HANDLER
// =====================
async function handleRegister(req, res) {
  const { name, email, password, phone, address, id_number } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Name, email and password are required.'
    });
  }

  // Email validation
  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email format.'
    });
  }

  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 6 characters long.'
    });
  }

  const emailLower = email.trim().toLowerCase();

  try {
    // Check if email is demo account
    if (demoAccounts[emailLower]) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered.'
      });
    }

    // Check if email exists in database
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered.'
      });
    }

    // Generate OTP
    const otp_code = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Create user in Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: name.trim(),
        email: emailLower,
        password: hashPassword(password), // In production, use proper hashing
        phone: phone || '',
        address: address || '',
        id_number: id_number || '',
        role: 'customer',
        otp_code: otp_code,
        otp_expires_at: otp_expires,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error('Create User Error:', createError);
      throw new Error('Gagal melakukan registrasi.');
    }

    // Send OTP email (simulated)
    const emailSent = await sendOTPEmail(emailLower, name, otp_code);

    res.status(201).json({
      status: 'success',
      message: 'Registrasi berhasil. Silakan cek email untuk kode OTP.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      },
      email_sent: emailSent,
      needs_verification: true
    });

  } catch (error) {
    console.error('Register Error:', error);
    throw error;
  }
}

// =====================
// VERIFY OTP HANDLER
// =====================
async function handleVerifyOtp(req, res) {
  const { user_id, otp_code } = req.body;

  if (!user_id || !otp_code) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID and OTP code are required.'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    // Check if OTP is valid and not expired
    if (user.otp_code !== otp_code) {
      return res.status(400).json({
        status: 'error',
        message: 'Kode OTP tidak valid.'
      });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({
        status: 'error',
        message: 'Kode OTP sudah kedaluwarsa.'
      });
    }

    // Update user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      throw new Error('Gagal memverifikasi email.');
    }

    res.status(200).json({
      status: 'success',
      message: 'Email berhasil diverifikasi.'
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    throw error;
  }
}

// =====================
// RESEND OTP HANDLER
// =====================
async function handleResendOtp(req, res) {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID is required.'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    // Generate new OTP
    const new_otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update OTP in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        otp_code: new_otp,
        otp_expires_at: otp_expires,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      throw new Error('Gagal mengirim ulang OTP.');
    }

    // Send new OTP email
    const emailSent = await sendOTPEmail(user.email, user.name, new_otp);

    res.status(200).json({
      status: 'success',
      message: 'Kode OTP baru telah dikirim ke email Anda.',
      email_sent: emailSent
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    throw error;
  }
}

// =====================
// FORGOT PASSWORD HANDLER
// =====================
async function handleForgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: 'error',
      message: 'Email is required.'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        status: 'success',
        message: 'Jika email terdaftar, instruksi reset password akan dikirim.'
      });
    }

    // Generate reset token
    const reset_token = generateToken();
    const reset_expires = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1 hour

    // Save reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: reset_token,
        reset_expires_at: reset_expires,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Gagal membuat token reset.');
    }

    // Send reset email (simulated)
    const emailSent = await sendPasswordResetEmail(user.email, user.name, reset_token);

    res.status(200).json({
      status: 'success',
      message: 'Instruksi reset password telah dikirim ke email Anda.',
      email_sent: emailSent
    });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    throw error;
  }
}

// =====================
// RESET PASSWORD HANDLER
// =====================
async function handleResetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Token and new password are required.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 6 characters long.'
    });
  }

  try {
    // Find user by reset token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token reset tidak valid.'
      });
    }

    // Check if token is expired
    if (new Date() > new Date(user.reset_expires_at)) {
      return res.status(400).json({
        status: 'error',
        message: 'Token reset sudah kedaluwarsa.'
      });
    }

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashPassword(password),
        reset_token: null,
        reset_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Gagal reset password.');
    }

    res.status(200).json({
      status: 'success',
      message: 'Password berhasil direset.'
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    throw error;
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Simple password hashing (in production, use bcrypt)
function hashPassword(password) {
  // For demo purposes, we're storing plain text
  // In production, use: return require('bcrypt').hashSync(password, 10);
  return password;
}

function verifyPassword(inputPassword, storedPassword) {
  // For demo purposes, we're comparing plain text
  // In production, use: return require('bcrypt').compareSync(inputPassword, storedPassword);
  return inputPassword === storedPassword;
}

// Simulated email functions
async function sendOTPEmail(email, name, otp) {
  console.log(`[EMAIL] OTP ${otp} sent to ${name} <${email}>`);
  // In production, integrate with email service like SendGrid, AWS SES, etc.
  return true;
}

async function sendPasswordResetEmail(email, name, token) {
  console.log(`[EMAIL] Password reset token sent to ${name} <${email}>: ${token}`);
  // In production, send actual email with reset link
  return true;
}

module.exports = handler;