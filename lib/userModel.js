// lib/userModel.js
export class UserModel {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'users';
  }

  // =====================
  // GET USER BY EMAIL
  // =====================
  async getByEmail(email, selectFields = 'id, name, email, phone, role, created_at') {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(selectFields)
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // GET USER BY ID
  // =====================
  async getById(id, selectFields = 'id, name, email, phone, role, address, avatar, email_verified, created_at, last_login') {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // GET ALL USERS
  // =====================
  async getAll(filters = {}, pagination = { page: 1, limit: 10 }) {
    let query = this.supabase
      .from(this.tableName)
      .select('id, name, email, phone, role, created_at, last_login', { count: 'exact' });

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        total_pages: Math.ceil(count / pagination.limit)
      }
    };
  }

  // =====================
  // UPDATE USER PROFILE
  // =====================
  async updateProfile(userId, updateData) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, phone, role, address, avatar, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // UPDATE USER ROLE
  // =====================
  async updateRole(userId, newRole) {
    const validRoles = ['admin', 'customer', 'staff'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, role')
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // CHECK IF EMAIL EXISTS
  // =====================
  async emailExists(email) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // =====================
  // GET USER STATISTICS
  // =====================
  async getStatistics() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('role, created_at');

    if (error) throw error;

    const stats = {
      total_users: data.length,
      by_role: {},
      recent_signups: 0
    };

    // Calculate users by role
    data.forEach(user => {
      stats.by_role[user.role] = (stats.by_role[user.role] || 0) + 1;
    });

    // Calculate recent signups (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    stats.recent_signups = data.filter(user => 
      new Date(user.created_at) > oneWeekAgo
    ).length;

    return stats;
  }

  // =====================
  // DELETE USER
  // =====================
  async delete(userId) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  }

  // =====================
  // SEARCH USERS
  // =====================
  async search(query, limit = 10) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id, name, email, phone, role')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data;
  }
}