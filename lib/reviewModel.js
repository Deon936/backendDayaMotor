// lib/reviewModel.js
export class ReviewModel {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'reviews';
  }

  // =====================
  // CREATE REVIEW
  // =====================
  async create(reviewData) {
    const validationErrors = this.validateReviewData(reviewData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check for existing review
    if (reviewData.motorcycle_id) {
      const existing = await this.checkExistingReview(
        reviewData.customer_id, 
        reviewData.motorcycle_id
      );
      if (existing) {
        throw new Error('Customer already reviewed this motorcycle');
      }
    }

    const insertData = {
      ...reviewData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // GET REVIEW BY ID
  // =====================
  async readOne(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        customers:customer_id (name, email),
        motorcycles:motorcycle_id (name, image)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      customer_name: data.customers?.name,
      motorcycle_name: data.motorcycles?.name
    };
  }

  // =====================
  // GET FILTERED REVIEWS
  // =====================
  async read(filters = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        customers:customer_id (name),
        motorcycles:motorcycle_id (name)
      `, { count: 'exact' });

    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.motorcycle_id) {
      query = query.eq('motorcycle_id', filters.motorcycle_id);
    }
    if (filters.min_rating) {
      query = query.gte('rating', filters.min_rating);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviews = data.map(item => ({
      ...item,
      customer_name: item.customers?.name,
      motorcycle_name: item.motorcycles?.name
    }));

    return {
      data: reviews,
      total: count
    };
  }

  // =====================
  // UPDATE REVIEW
  // =====================
  async update(id, updateData) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // DELETE REVIEW
  // =====================
  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // =====================
  // CHECK EXISTING REVIEW
  // =====================
  async checkExistingReview(customerId, motorcycleId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('customer_id', customerId)
      .eq('motorcycle_id', motorcycleId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    return data;
  }

  // =====================
  // GET AVERAGE RATING
  // =====================
  async getAverageRating(motorcycleId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('rating')
      .eq('motorcycle_id', motorcycleId);

    if (error) throw error;

    if (data.length === 0) {
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / data.length;

    // Calculate rating breakdown
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach(review => {
      ratingBreakdown[review.rating]++;
    });

    return {
      average_rating: Math.round(averageRating * 10) / 10,
      total_reviews: data.length,
      rating_breakdown: ratingBreakdown
    };
  }

  // =====================
  // GET PAGED REVIEWS
  // =====================
  async readPaged(page = 1, limit = 10, filters = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        customers:customer_id (name, email),
        motorcycles:motorcycle_id (name, image)
      `, { count: 'exact' });

    if (filters.motorcycle_id) {
      query = query.eq('motorcycle_id', filters.motorcycle_id);
    }
    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.min_rating) {
      query = query.gte('rating', filters.min_rating);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const reviews = data.map(item => ({
      ...item,
      customer_name: item.customers?.name,
      motorcycle_name: item.motorcycles?.name
    }));

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit)
      }
    };
  }

  // =====================
  // VALIDATE REVIEW DATA
  // =====================
  validateReviewData(data) {
    const errors = [];

    if (!data.customer_id) {
      errors.push('customer_id is required');
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      errors.push('rating must be between 1 and 5');
    }
    if (!data.comment || data.comment.trim() === '') {
      errors.push('comment is required');
    }

    return errors;
  }

  // =====================
  // GET RECENT REVIEWS
  // =====================
  async getRecentReviews(limit = 5) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        customers:customer_id (name),
        motorcycles:motorcycle_id (name, image)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(item => ({
      ...item,
      customer_name: item.customers?.name,
      motorcycle_name: item.motorcycles?.name
    }));
  }
}