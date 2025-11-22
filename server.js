// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Import route handlers - SESUAI STRUKTUR FOLDER ANDA
const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const motorcycleRoutes = require('./api/motorcycles');
const motorcycleSimpleRoutes = require('./api/motorcycles-simple');
const motorDetailRoutes = require('./api/motorDetail');
const orderRoutes = require('./api/orders');
const paymentRoutes = require('./api/payment'); // Fixed: 'payment' bukan 'payments'
const uploadPaymentRoutes = require('./api/uploadPayment');
const reviewRoutes = require('./api/reviews');
const averageReviewRoutes = require('./api/reviews/average'); // Tambahan untuk average reviews
const settingsRoutes = require('./api/settings');
const uploadRoutes = require('./api/uploads');
const validateNikRoutes = require('./api/validateNIK'); // Fixed: 'validateNIK' bukan 'validateNik'
const advertisementRoutes = require('./api/advertisements');

// API Routes dengan error handling
const routes = [
    { path: '/api/auth', route: authRoutes, name: 'auth' },
    { path: '/api/users', route: userRoutes, name: 'users' },
    { path: '/api/motorcycles', route: motorcycleRoutes, name: 'motorcycles' },
    { path: '/api/motorcycles-simple', route: motorcycleSimpleRoutes, name: 'motorcycles-simple' },
    { path: '/api/motor-detail', route: motorDetailRoutes, name: 'motor-detail' },
    { path: '/api/orders', route: orderRoutes, name: 'orders' },
    { path: '/api/payment', route: paymentRoutes, name: 'payment' }, // Fixed path
    { path: '/api/upload-payment', route: uploadPaymentRoutes, name: 'upload-payment' },
    { path: '/api/reviews', route: reviewRoutes, name: 'reviews' },
    { path: '/api/reviews/average', route: averageReviewRoutes, name: 'reviews-average' }, // Tambahan route
    { path: '/api/settings', route: settingsRoutes, name: 'settings' },
    { path: '/api/uploads', route: uploadRoutes, name: 'uploads' },
    { path: '/api/validate-nik', route: validateNikRoutes, name: 'validate-nik' },
    { path: '/api/advertisements', route: advertisementRoutes, name: 'advertisements' }
];

// Register routes dengan error handling
routes.forEach(({ path, route, name }) => {
    try {
        if (route) {
            app.use(path, route);
            console.log(`✅ Route registered: ${path}`);
        } else {
            console.warn(`⚠️  Route for ${path} (${name}) is not available - module not found`);
        }
    } catch (error) {
        console.error(`❌ Failed to load route ${path} (${name}):`, error.message);
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'HONDA MOTORCYCLE DEALER API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            motorcycles: '/api/motorcycles',
            motorcycles_simple: '/api/motorcycles-simple',
            motor_detail: '/api/motor-detail',
            orders: '/api/orders',
            payment: '/api/payment',
            upload_payment: '/api/upload-payment',
            reviews: '/api/reviews',
            reviews_average: '/api/reviews/average',
            settings: '/api/settings',
            uploads: '/api/uploads',
            validate_nik: '/api/validate-nik',
            advertisements: '/api/advertisements',
            health: '/api/health'
        }
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
            '/api/auth',
            '/api/users', 
            '/api/motorcycles',
            '/api/motorcycles-simple',
            '/api/motor-detail',
            '/api/orders',
            '/api/payment',
            '/api/upload-payment',
            '/api/reviews',
            '/api/reviews/average',
            '/api/settings',
            '/api/uploads',
            '/api/validate-nik',
            '/api/advertisements',
            '/api/health'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global Error Handler:', error);
    
    // Default error
    const statusCode = error.status || error.statusCode || 500;
    const message = error.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack,
            details: error.details 
        })
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

// Check if required environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
    console.log('💡 Please check your .env file');
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Supabase URL: ${process.env.SUPABASE_URL}`);
    
    // Test database connection on startup
    testDatabaseConnection();
});

// Test database connection function
async function testDatabaseConnection() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Database connection failed:', error.message);
        } else {
            console.log('✅ Database connected successfully');
        }
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
    }
}

module.exports = app;