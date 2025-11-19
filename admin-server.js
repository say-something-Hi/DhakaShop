// admin-server.js - Admin Panel Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('admin'));

// Admin API Routes
app.get('/admin/api/analytics', (req, res) => {
    try {
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        const productsPath = path.join(__dirname, 'data', 'products.json');
        
        let orders = [];
        let products = [];
        
        if (fs.existsSync(ordersPath)) {
            const ordersData = fs.readFileSync(ordersPath, 'utf8');
            orders = JSON.parse(ordersData);
        }
        
        if (fs.existsSync(productsPath)) {
            const productsData = fs.readFileSync(productsPath, 'utf8');
            products = JSON.parse(productsData);
        }
        
        const analytics = {
            totalSales: orders.reduce((sum, order) => sum + order.total, 0),
            totalOrders: orders.length,
            totalProducts: products.length,
            totalCustomers: new Set(orders.map(order => order.customerPhone)).size,
            pendingOrders: orders.filter(order => order.status === 'pending').length,
            recentOrders: orders.slice(-5).reverse()
        };
        
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.put('/admin/api/orders/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        
        if (fs.existsSync(ordersPath)) {
            const ordersData = fs.readFileSync(ordersPath, 'utf8');
            let orders = JSON.parse(ordersData);
            
            const orderIndex = orders.findIndex(o => o.id === req.params.id);
            if (orderIndex !== -1) {
                orders[orderIndex].status = status;
                orders[orderIndex].updatedAt = new Date().toISOString();
                
                fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
                res.json({ success: true, message: 'Order status updated' });
            } else {
                res.status(404).json({ error: 'Order not found' });
            }
        } else {
            res.status(404).json({ error: 'No orders found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`
    🔧 Raihan Premium Shop Admin Panel Started!
    🌐 URL: http://localhost:${PORT}/admin
    ⏰ Time: ${new Date().toLocaleString()}
    `);
});
