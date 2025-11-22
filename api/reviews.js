// api/reviews.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Reviews API - Method: ${req.method}`);

  try {
    switch (req.method) {
      case 'GET':
        return handleGetReviews(req, res);
      case 'POST':
        return handleCreateReview(req, res);
      default:
        res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Reviews API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// GET /api/reviews - Get reviews with optional filters
async function handleGetReviews(req, res) {
  const { motorcycle_id, user_id, limit = 10 } = req.query;

  try {
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by motorcycle_id if provided
    if (motorcycle_id) {
      query = query.eq('motorcycle_id', motorcycle_id);
    }

    // Filter by user_id if provided
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // Limit results
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    // Get user names separately since foreign key doesn't exist
    const reviewsWithUserInfo = await enrichReviewsWithUserInfo(reviews);

    console.log(`✅ Found ${reviews.length} reviews`);
    res.status(200).json({
      success: true,
      data: reviewsWithUserInfo
    });
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// Helper function to enrich reviews with user information
async function enrichReviewsWithUserInfo(reviews) {
  if (!reviews || reviews.length === 0) return reviews;

  try {
    // Get unique user IDs from reviews
    const userIds = [...new Set(reviews.map(review => review.user_id))];
    
    // Fetch user information
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (error) {
      console.warn('Could not fetch user info:', error.message);
      return reviews; // Return original reviews if user fetch fails
    }

    // Create user map for quick lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Enrich reviews with user info
    return reviews.map(review => ({
      ...review,
      user: userMap[review.user_id] || { name: 'Unknown User', email: '' }
    }));
  } catch (error) {
    console.error('Error enriching reviews:', error);
    return reviews; // Return original reviews if enrichment fails
  }
}

// POST /api/reviews - Create new review
async function handleCreateReview(req, res) {
  const { user_id, rating, komentar, motorcycle_id } = req.body;

  // Validation
  if (!user_id || !rating || !komentar) {
    return res.status(400).json({
      success: false,
      message: 'User ID, rating, and komentar are required'
    });
  }

  // Rating validation
  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  try {
    const reviewData = {
      user_id: user_id,
      rating: parseInt(rating),
      komentar: komentar.trim(),
      created_at: new Date().toISOString()
    };

    // Add motorcycle_id if provided
    if (motorcycle_id) {
      reviewData.motorcycle_id = parseInt(motorcycle_id);
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    console.log(`✅ Review created by user: ${user_id}`);
    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    });
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

module.exports = handler;