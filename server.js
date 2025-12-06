// index.js - Raihan Premium Shop Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
        }
    }
}));

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:10000'],
    credentials: true
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.'
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'raihan-premium-shop-secret-key-2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin check middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Raihan Premium Shop API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: process.uptime()
    });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const users = getUsers();
        
        // Check if user exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: 'USR' + Date.now(),
            name,
            email,
            password: hashedPassword,
            phone: phone || '',
            role: 'user',
            createdAt: new Date().toISOString(),
            isActive: true
        };

        users.push(newUser);
        saveUsers(users);

        // Create token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const users = getUsers();
        const user = users.find(u => u.email === email && u.isActive);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Products API
app.get('/api/products', (req, res) => {
    try {
        const products = getProducts();
        
        // Filtering
        let filteredProducts = [...products];
        
        if (req.query.category) {
            filteredProducts = filteredProducts.filter(p => 
                p.category === req.query.category
            );
        }
        
        if (req.query.minPrice) {
            filteredProducts = filteredProducts.filter(p => 
                p.price >= parseFloat(req.query.minPrice)
            );
        }
        
        if (req.query.maxPrice) {
            filteredProducts = filteredProducts.filter(p => 
                p.price <= parseFloat(req.query.maxPrice)
            );
        }
        
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Sorting
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'rating':
                    filteredProducts.sort((a, b) => b.rating - a.rating);
                    break;
                case 'newest':
                    filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
            }
        }
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedProducts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(filteredProducts.length / limit),
                totalProducts: filteredProducts.length,
                hasNext: endIndex < filteredProducts.length,
                hasPrevious: startIndex > 0
            }
        });
        
    } catch (error) {
        console.error('Products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', (req, res) => {
    try {
        const products = getProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({
            success: true,
            data: product
        });
        
    } catch (error) {
        console.error('Product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
    try {
        const product = req.body;
        
        // Validation
        if (!product.name || !product.price || !product.description) {
            return res.status(400).json({ error: 'Name, price, and description are required' });
        }
        
        const products = getProducts();
        
        // Generate ID
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        
        const newProduct = {
            id: newId,
            ...product,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stock: product.stock || 0,
            rating: product.rating || 0,
            reviews: product.reviews || 0
        };
        
        products.push(newProduct);
        saveProducts(products);
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: newProduct
        });
        
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updates = req.body;
        
        const products = getProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        products[productIndex] = {
            ...products[productIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        saveProducts(products);
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: products[productIndex]
        });
        
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        let products = getProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Soft delete (mark as inactive)
        products[productIndex].isActive = false;
        products[productIndex].updatedAt = new Date().toISOString();
        
        saveProducts(products);
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Orders API
app.post('/api/orders', authenticateToken, (req, res) => {
    try {
        const orderData = req.body;
        const userId = req.user.id;
        
        // Validation
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }
        
        // Calculate total
        const products = getProducts();
        let total = 0;
        let items = [];
        
        for (const item of orderData.items) {
            const product = products.find(p => p.id === item.productId && p.isActive);
            if (!product) {
                return res.status(400).json({ error: `Product ${item.productId} not found` });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
                });
            }
            
            items.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                total: product.price * item.quantity
            });
            
            total += product.price * item.quantity;
        }
        
        const order = {
            id: 'ORD' + Date.now(),
            userId,
            items,
            shippingAddress: orderData.shippingAddress || {},
            paymentMethod: orderData.paymentMethod || 'cash',
            subtotal: total,
            shipping: orderData.shipping || 0,
            tax: orderData.tax || 0,
            total: total + (orderData.shipping || 0) + (orderData.tax || 0),
            status: 'pending',
            paymentStatus: 'unpaid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save order
        const orders = getOrders();
        orders.push(order);
        saveOrders(orders);
        
        // Update product stock
        for (const item of orderData.items) {
            const productIndex = products.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                products[productIndex].stock -= item.quantity;
                products[productIndex].updatedAt = new Date().toISOString();
            }
        }
        saveProducts(products);
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });
        
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders/my-orders', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const orders = getOrders();
        const userOrders = orders.filter(o => o.userId === userId);
        
        res.json({
            success: true,
            data: userOrders
        });
        
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;
        
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Check if user owns the order or is admin
        if (order.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json({
            success: true,
            data: order
        });
        
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Admin - Get all orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
    try {
        const orders = getOrders();
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Admin - Update order status
app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, paymentStatus } = req.body;
        
        const orders = getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (status) orders[orderIndex].status = status;
        if (paymentStatus) orders[orderIndex].paymentStatus = paymentStatus;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        saveOrders(orders);
        
        res.json({
            success: true,
            message: 'Order updated successfully',
            data: orders[orderIndex]
        });
        
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Categories API
app.get('/api/categories', (req, res) => {
    try {
        const products = getProducts();
        const categories = [...new Set(products.map(p => p.category))];
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Statistics API (Admin only)
app.get('/api/admin/statistics', authenticateToken, requireAdmin, (req, res) => {
    try {
        const products = getProducts();
        const orders = getOrders();
        const users = getUsers();
        
        // Calculate statistics
        const totalProducts = products.length;
        const totalOrders = orders.length;
        const totalUsers = users.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        
        // Recent orders
        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        
        // Top products
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = 0;
                }
                productSales[item.productId] += item.quantity;
            });
        });
        
        const topProducts = Object.entries(productSales)
            .map(([productId, sales]) => {
                const product = products.find(p => p.id === parseInt(productId));
                return product ? { ...product, sales } : null;
            })
            .filter(p => p !== null)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);
        
        res.json({
            success: true,
            data: {
                totalProducts,
                totalOrders,
                totalUsers,
                totalRevenue,
                recentOrders,
                topProducts,
                orderStatus: {
                    pending: orders.filter(o => o.status === 'pending').length,
                    processing: orders.filter(o => o.status === 'processing').length,
                    shipped: orders.filter(o => o.status === 'shipped').length,
                    delivered: orders.filter(o => o.status === 'delivered').length,
                    cancelled: orders.filter(o => o.status === 'cancelled').length
                }
            }
        });
        
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Payment webhook
app.post('/api/webhook/payment', (req, res) => {
    try {
        const paymentData = req.body;
        
        console.log('Payment webhook received:', paymentData);
        
        // Verify payment signature
        // This would integrate with your payment gateway
        
        if (paymentData.status === 'success') {
            // Update order payment status
            const orders = getOrders();
            const orderIndex = orders.findIndex(o => o.id === paymentData.orderId);
            
            if (orderIndex !== -1) {
                orders[orderIndex].paymentStatus = 'paid';
                orders[orderIndex].updatedAt = new Date().toISOString();
                saveOrders(orders);
            }
        }
        
        res.json({ received: true, processed: true });
        
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// File upload endpoint (for product images)
app.post('/api/upload', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'Image data required' });
        }
        
        // In production, use cloud storage like AWS S3
        // For now, save locally
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const fileName = `product_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        
        // Convert base64 to image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, base64Data, 'base64');
        
        const imageUrl = `/uploads/${fileName}`;
        
        res.json({
            success: true,
            url: imageUrl
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Data helper functions
function getProducts() {
    try {
        const productsPath = path.join(__dirname, 'data', 'products.json');
        if (fs.existsSync(productsPath)) {
            const data = fs.readFileSync(productsPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading products:', error);
        return [];
    }
}

function saveProducts(products) {
    try {
        const productsPath = path.join(__dirname, 'data', 'products.json');
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Error saving products:', error);
    }
}

function getOrders() {
    try {
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        if (fs.existsSync(ordersPath)) {
            const data = fs.readFileSync(ordersPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading orders:', error);
        return [];
    }
}

function saveOrders(orders) {
    try {
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Error saving orders:', error);
    }
}

function getUsers() {
    try {
        const usersPath = path.join(__dirname, 'data', 'users.json');
        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

function saveUsers(users) {
    try {
        const usersPath = path.join(__dirname, 'data', 'users.json');
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Initialize data directory and files
function initializeData() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize products
    const productsPath = path.join(dataDir, 'products.json');
    if (!fs.existsSync(productsPath)) {
        const sampleProducts = [
            {
                id: 1,
                name: "3 IN 1 Hair Trimmer Machine",
                price: 1250,
                description: "Professional hair trimmer machine. Waterproof design. 2 hours backup.",
                image: "https://i.imgur.com/nun51uF.jpeg",
                category: "beauty",
                stock: 25,
                rating: 4.5,
                reviews: 128,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                name: "Samsung Galaxy A15",
                price: 25500,
                description: "4GB RAM, 128GB Memory. Latest Android version.",
                image: "https://i.imgur.com/B6yvpAz.jpeg",
                category: "electronics",
                stock: 15,
                rating: 4.3,
                reviews: 89,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 3,
                name: "Nike Air Max Shoes",
                price: 4500,
                description: "Comfortable sports shoes. Premium quality.",
                image: "https://i.imgur.com/mULwWC3.jpeg",
                category: "fashion",
                stock: 30,
                rating: 4.7,
                reviews: 215,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 4,
                name: "Premium Leather Wallet",
                price: 1200,
                description: "Genuine leather wallet with multiple compartments.",
                image: "https://i.imgur.com/abc123.jpeg",
                category: "fashion",
                stock: 50,
                rating: 4.2,
                reviews: 76,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 5,
                name: "Wireless Bluetooth Earbuds",
                price: 1800,
                description: "Noise cancelling earbuds with 24hr battery life.",
                image: "https://i.imgur.com/def456.jpeg",
                category: "electronics",
                stock: 40,
                rating: 4.4,
                reviews: 152,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        fs.writeFileSync(productsPath, JSON.stringify(sampleProducts, null, 2));
    }
    
    // Initialize orders
    const ordersPath = path.join(dataDir, 'orders.json');
    if (!fs.existsSync(ordersPath)) {
        fs.writeFileSync(ordersPath, JSON.stringify([], null, 2));
    }
    
    // Initialize users
    const usersPath = path.join(dataDir, 'users.json');
    if (!fs.existsSync(usersPath)) {
        // Create default admin user (password: admin123)
        const defaultAdmin = {
            id: 'ADM001',
            name: 'Admin User',
            email: 'admin@raihanshop.com',
            password: '$2b$10$YourHashedPasswordHere', // You need to hash this properly
            phone: '+8801234567890',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString()
        };
        fs.writeFileSync(usersPath, JSON.stringify([defaultAdmin], null, 2));
    }
    
    // Create uploads directory
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
}

// Start server
app.listen(PORT, () => {
    initializeData();
    console.log(`
    🛍️  Raihan Premium Shop Server Started!
    🌐 URL: http://localhost:${PORT}
    ⏰ Time: ${new Date().toLocaleString()}
    📊 Environment: ${process.env.NODE_ENV || 'development'}
    🔒 Security: Enabled (Helmet, CORS, Rate Limiting)
    🔑 Authentication: JWT-based
    📁 Data Storage: JSON files
    🚀 Version: 2.0.0
    `);
    
    // Auto-generate admin password hash on first run
    if (process.env.GENERATE_ADMIN_PASSWORD) {
        const bcrypt = require('bcrypt');
        bcrypt.hash('admin123', 10).then(hash => {
            console.log('\n🔑 Admin password hash (for users.json):');
            console.log(hash);
        });
    }
});

module.exports = app;
