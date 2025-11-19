const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Create data directory if not exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Routes - Serve HTML files directly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// API Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Raihan Premium Shop is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.get('/api/products', (req, res) => {
    const products = [
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
        }
    ];
    res.json(products);
});

// Start server
app.listen(PORT, () => {
    console.log(`
🛍️  Raihan Premium Shop Server Started!
🌐 Main Site: http://localhost:${PORT}
🔧 Admin Panel: http://localhost:${PORT}/admin
📊 Admin Dashboard: http://localhost:${PORT}/admin-dashboard
⏰ Time: ${new Date().toLocaleString()}
    
🔐 Admin Login Details:
👤 Username: Raihan
🔑 Password: 0088
    `);
    
    // Verify files exist
    const files = ['index.html', 'admin.html', 'admin-dashboard.html'];
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} found`);
        } else {
            console.log(`❌ ${file} missing`);
        }
    });
});
