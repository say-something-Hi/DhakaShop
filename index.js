const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('.')); // Serve all files from root directory

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// API routes for admin
app.get('/api/admin/orders', (req, res) => {
    // Sample orders data
    const orders = [
        {
            id: 'RPS001',
            customerName: 'আনিকা ইসলাম',
            customerPhone: '০১৭১২৩৪৫৬৭৮',
            total: 4520,
            status: 'completed',
            date: '২০২৪-০৩-২০',
            items: [
                { name: 'সamsung গ্যালাক্সি A15', price: 25500, quantity: 1 },
                { name: 'ব্লুটুথ হেডফোন', price: 1800, quantity: 2 }
            ]
        }
    ];
    res.json(orders);
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🛍️  Raihan Premium Shop Server Started!
    🌐 Main Site: http://localhost:${PORT}
    🔧 Admin Panel: http://localhost:${PORT}/admin
    📊 Admin Dashboard: http://localhost:${PORT}/admin-dashboard
    ⏰ Time: ${new Date().toLocaleString()}
    `);
    console.log(`
    🔐 Admin Login Details:
    👤 Username: Raihan
    🔑 Password: 0088
    `);
});
