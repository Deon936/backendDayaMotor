// lib/motorcycleModel.js
export class MotorcycleModel {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'motorcycles';
  }

  // =====================
  // CREATE MOTORCYCLE
  // =====================
  async create(motorcycleData) {
    const validationErrors = this.validate(motorcycleData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const insertData = {
      name: motorcycleData.name.trim(),
      category: motorcycleData.category,
      price: parseFloat(motorcycleData.price),
      image: motorcycleData.image || '',
      specs: motorcycleData.specs || '',
      description: motorcycleData.description || motorcycleData.specs || '',
      features: motorcycleData.features || '',
      available: Boolean(motorcycleData.available ?? true),
      created_at: new Date().toISOString()
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
  // UPDATE MOTORCYCLE
  // =====================
  async update(id, motorcycleData) {
    if (!id) {
      throw new Error('Motorcycle ID is required for update');
    }

    const validationErrors = this.validate(motorcycleData, true);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const updateData = {
      ...motorcycleData,
      price: motorcycleData.price ? parseFloat(motorcycleData.price) : undefined,
      available: motorcycleData.available !== undefined ? Boolean(motorcycleData.available) : undefined,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // GET ALL MOTORCYCLES
  // =====================
  async read(filters = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order('id', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.available !== undefined) {
      query = query.eq('available', filters.available);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.map(item => ({
      ...item,
      available: Boolean(item.available)
    }));
  }

  // =====================
  // GET SINGLE MOTORCYCLE
  // =====================
  async readOne(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      available: Boolean(data.available)
    };
  }

  // =====================
  // DELETE MOTORCYCLE
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
  // VALIDATE DATA
  // =====================
  validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.name !== undefined) {
      if (!data.name || data.name.trim() === '') {
        errors.push('Name is required');
      }
    }

    if (!isUpdate || data.category !== undefined) {
      if (!data.category || data.category.trim() === '') {
        errors.push('Category is required');
      } else {
        const validCategories = ['sport', 'scooter', 'adventure', 'naked', 'cruiser'];
        if (!validCategories.includes(data.category)) {
          errors.push(`Category must be one of: ${validCategories.join(', ')}`);
        }
      }
    }

    if (!isUpdate || data.price !== undefined) {
      if (data.price !== undefined && (isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0)) {
        errors.push('Valid price is required');
      }
    }

    return errors;
  }
}