// api/reviews/average.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`📨 Reviews Average API - Method: ${req.method}`);

  try {
    if (req.method === 'GET') {
      return handleGetAverageReviews(req, res);
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Reviews Average API Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// GET /api/reviews/average - Get average ratings
async function handleGetAverageReviews(req, res) {
  const { motorcycle_id } = req.query;

  try {
    let query = supabase
      .from('reviews')
      .select('rating, motorcycle_id');

    // Filter by motorcycle_id if provided
    if (motorcycle_id) {
      query = query.eq('motorcycle_id', motorcycle_id);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    // Calculate averages
    const averages = calculateAverages(reviews);

    console.log(`✅ Calculated averages for ${reviews.length} reviews`);
    res.status(200).json({
      success: true,
      data: averages
    });
  } catch (error) {
    console.error('Get Average Reviews Error:', error);
    res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`
    });
  }
}

// Helper function to calculate average ratings
function calculateAverages(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      overall: {
        average_rating: 0,
        total_reviews: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      },
      by_motorcycle: {}
    };
  }

  // Overall average
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  // Rating breakdown
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    ratingBreakdown[review.rating]++;
  });

  // Averages by motorcycle
  const motorcycleRatings = {};
  reviews.forEach(review => {
    if (review.motorcycle_id) {
      if (!motorcycleRatings[review.motorcycle_id]) {
        motorcycleRatings[review.motorcycle_id] = {
          total_rating: 0,
          count: 0,
          ratings: []
        };
      }
      motorcycleRatings[review.motorcycle_id].total_rating += review.rating;
      motorcycleRatings[review.motorcycle_id].count++;
      motorcycleRatings[review.motorcycle_id].ratings.push(review.rating);
    }
  });

  // Calculate averages for each motorcycle
  const byMotorcycle = {};
  Object.keys(motorcycleRatings).forEach(motorcycleId => {
    const data = motorcycleRatings[motorcycleId];
    byMotorcycle[motorcycleId] = {
      average_rating: data.total_rating / data.count,
      total_reviews: data.count,
      ratings: data.ratings
    };
  });

  return {
    overall: {
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      total_reviews: reviews.length,
      rating_breakdown: ratingBreakdown
    },
    by_motorcycle: byMotorcycle
  };
}

module.exports = handler;