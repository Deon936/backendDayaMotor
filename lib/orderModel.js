// lib/orderModel.js
export class OrderModel {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'orders';
  }

  // =====================
  // CREATE ORDER
  // =====================
  async create(orderData) {
    const validationErrors = this.validateOrderData(orderData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const insertData = {
      ...orderData,
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
  // GET ORDER BY ID
  // =====================
  async readOne(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // GET FILTERED ORDERS
  // =====================
  async readFiltered(filters = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // =====================
  // UPDATE ORDER STATUS
  // =====================
  async updateStatus(id, status) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // UPDATE PAYMENT STATUS
  // =====================
  async updatePaymentStatus(id, paymentStatus) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // UPDATE PAYMENT PROOF
  // =====================
  async updatePaymentProof(id, paymentProofUrl) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        payment_proof: paymentProofUrl,
        payment_status: 'pending',
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // DELETE ORDER
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
  // VALIDATE ORDER DATA
  // =====================
  validateOrderData(data) {
    const errors = [];
    const requiredFields = [
      'customer_name', 'nik_kk', 'nik_ktp', 'birth_place', 
      'birth_date', 'occupation', 'address', 'customer_phone', 
      'stnk_name', 'motorcycle_id', 'motorcycle_name', 'total_price'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    }

    // Validate numeric fields
    if (data.motorcycle_id && isNaN(parseInt(data.motorcycle_id))) {
      errors.push('motorcycle_id must be a number');
    }
    if (data.total_price && isNaN(parseFloat(data.total_price))) {
      errors.push('total_price must be a valid number');
    }
    if (data.quantity && isNaN(parseInt(data.quantity))) {
      errors.push('quantity must be a number');
    }

    return errors;
  }

  // =====================
  // GET ORDERS BY USER
  // =====================
  async getOrdersByUser(userId, limit = 50) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // =====================
  // GET ORDER STATISTICS
  // =====================
  async getStatistics() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status, payment_status, total_price');

    if (error) throw error;

    const stats = {
      total_orders: data.length,
      total_revenue: data.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0),
      by_status: {},
      by_payment_status: {}
    };

    data.forEach(order => {
      stats.by_status[order.status] = (stats.by_status[order.status] || 0) + 1;
      stats.by_payment_status[order.payment_status] = (stats.by_payment_status[order.payment_status] || 0) + 1;
    });

    return stats;
  }
}