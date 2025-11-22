// lib/authModel.js
export class AuthModel {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'users';
  }

  // =====================
  // REGISTER USER
  // =====================
  async register(userData) {
    const validationErrors = this.validateUserData(userData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check if email exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Generate OTP
    const otp_code = this.generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertData = {
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: this.hashPassword(userData.password),
      phone: userData.phone || '',
      address: userData.address || '',
      id_number: userData.id_number || '',
      role: 'customer',
      otp_code: otp_code,
      otp_expires_at: otp_expires,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return { user: data, otp: otp_code };
  }

  // =====================
  // LOGIN USER
  // =====================
  async login(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (!this.verifyPassword(password, user.password)) {
      throw new Error('Invalid password');
    }

    if (!user.email_verified) {
      throw new Error('Email not verified');
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }

  // =====================
  // VERIFY OTP
  // =====================
  async verifyOTP(userId, otpCode) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.otp_code !== otpCode) {
      throw new Error('Invalid OTP code');
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      throw new Error('OTP expired');
    }

    // Mark email as verified
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        email_verified: true,
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  }

  // =====================
  // RESEND OTP
  // =====================
  async resendOTP(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const new_otp = this.generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        otp_code: new_otp,
        otp_expires_at: otp_expires,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return new_otp;
  }

  // =====================
  // FORGOT PASSWORD
  // =====================
  async forgotPassword(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return null;
    }

    const reset_token = this.generateToken();
    const reset_expires = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();

    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        reset_token: reset_token,
        reset_expires_at: reset_expires,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;
    return { user, reset_token };
  }

  // =====================
  // RESET PASSWORD
  // =====================
  async resetPassword(token, newPassword) {
    const user = await this.findByResetToken(token);
    if (!user) {
      throw new Error('Invalid reset token');
    }

    if (new Date() > new Date(user.reset_expires_at)) {
      throw new Error('Reset token expired');
    }

    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        password: this.hashPassword(newPassword),
        reset_token: null,
        reset_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;
    return true;
  }

  // =====================
  // FIND USER BY EMAIL
  // =====================
  async findByEmail(email) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // =====================
  // FIND USER BY ID
  // =====================
  async findById(userId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // =====================
  // FIND USER BY RESET TOKEN
  // =====================
  async findByResetToken(token) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('reset_token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // =====================
  // UPDATE LAST LOGIN
  // =====================
  async updateLastLogin(userId) {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  }

  // =====================
  // VALIDATE USER DATA
  // =====================
  validateUserData(data) {
    const errors = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    return errors;
  }

  // =====================
  // HELPER FUNCTIONS
  // =====================
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  hashPassword(password) {
    // For demo - in production use bcrypt
    return password;
  }

  verifyPassword(inputPassword, storedPassword) {
    // For demo - in production use bcrypt.compare
    return inputPassword === storedPassword;
  }
}