// api/users/index.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Users API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// =====================
// GET USERS
// =====================
async function handleGet(req, res) {
  const { email, id, role, page = 1, limit = 10 } = req.query;

  try {
    // Get user by email
    if (email) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, address, avatar, email_verified, created_at, last_login')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: user
      });
    }

    // Get user by ID
    if (id) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, address, avatar, email_verified, created_at, last_login')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: user
      });
    }

    // Get all users with filters and pagination
    let query = supabase
      .from('users')
      .select('id, name, email, phone, role, created_at, last_login', { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        total_pages: Math.ceil(count / limitNum)
      }
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    throw error;
  }
}

// =====================
// UPDATE USER PROFILE
// =====================
async function handlePut(req, res) {
  const { id, name, phone, address, avatar } = req.body;

  // Validation
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, phone, role, address, avatar, created_at, updated_at')
      .single();

    if (error) {
      console.error('Update User Error:', error);
      throw new Error('Failed to update user profile');
    }

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update User Error:', error);
    throw error;
  }
}