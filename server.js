// index.js - Raihan Premium Shop Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Raihan Premium Shop API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/products', (req, res) => {
    try {
        const productsData = fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8');
        const products = JSON.parse(productsData);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Products data not found' });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        const order = req.body;
        order.id = 'RPS' + Date.now();
        order.status = 'pending';
        order.createdAt = new Date().toISOString();
        
        // Save order to file (in production, use database)
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        let orders = [];
        
        if (fs.existsSync(ordersPath)) {
            const ordersData = fs.readFileSync(ordersPath, 'utf8');
            orders = JSON.parse(ordersData);
        }
        
        orders.push(order);
        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
        
        res.json({ 
            success: true, 
            orderId: order.id,
            message: 'Order placed successfully' 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders/:id', (req, res) => {
    try {
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        if (fs.existsSync(ordersPath)) {
            const ordersData = fs.readFileSync(ordersPath, 'utf8');
            const orders = JSON.parse(ordersData);
            const order = orders.find(o => o.id === req.params.id);
            
            if (order) {
                res.json(order);
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } else {
            res.status(404).json({ error: 'No orders found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Payment webhook (for bKash, Nagad, etc.)
app.post('/api/webhook/payment', (req, res) => {
    const paymentData = req.body;
    
    // Process payment notification
    console.log('Payment webhook received:', paymentData);
    
    // Update order status based on payment
    // This would integrate with your payment gateway
    
    res.json({ received: true });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Initialize data directory and files
function initializeData() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const productsPath = path.join(dataDir, 'products.json');
    if (!fs.existsSync(productsPath)) {
        const sampleProducts = [
            {
                id: 1,
                name: "৩ IN ১ হেয়ার ট্রিমার মেশিন",
                price: 1250,
                description: "প্রফেশনাল হেয়ার ট্রিমার মেশিন। ওয়াটারপ্রুফ ডিজাইন। ২ ঘন্টা ব্যাকআপ।",
                image: "https://i.imgur.com/nun51uF.jpeg",
                category: "beauty",
                stock: 25,
                rating: 4.5,
                reviews: 128
            },
            {
                id: 2,
                name: "সamsung গ্যালাক্সি A15",
                price: 25500,
                description: "৪জিবি র‍্যাম, ১২৮জিবি মেমোরি। লেটেস্ট অ্যান্ড্রয়েড ভার্সন।",
                image: "https://i.imgur.com/B6yvpAz.jpeg",
                category: "electronics",
                stock: 15,
                rating: 4.3,
                reviews: 89
            },
            {
                id: 3,
                name: "নাইকি এয়ার ম্যাক্স শু",
                price: 4500,
                description: "কমফোর্টেবল স্পোর্টস শু। প্রিমিয়াম কোয়ালিটি।",
                image: "https://i.imgur.com/mULwWC3.jpeg",
                category: "fashion",
                stock: 30,
                rating: 4.7,
                reviews: 215
            }
        ];
        fs.writeFileSync(productsPath, JSON.stringify(sampleProducts, null, 2));
    }
    
    const ordersPath = path.join(dataDir, 'orders.json');
    if (!fs.existsSync(ordersPath)) {
        fs.writeFileSync(ordersPath, JSON.stringify([], null, 2));
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
    `);
});

module.exports = app;
