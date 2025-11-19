#!/bin/bash

# Raihan Premium Shop Build Script
echo "🚀 Starting Raihan Premium Shop Build Process..."

# Create necessary directories
mkdir -p public
mkdir -p admin
mkdir -p data

# Copy HTML files to public directory
cp *.html public/ 2>/dev/null || true
cp *.css public/ 2>/dev/null || true
cp *.js public/ 2>/dev/null || true

# Copy admin files
cp admin.html admin/ 2>/dev/null || true
cp admin.css admin/ 2>/dev/null || true
cp admin.js admin/ 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create data files if they don't exist
if [ ! -f "data/products.json" ]; then
    echo "📁 Creating sample products data..."
    node -e "
    const sampleProducts = [
        {
            id: 1,
            name: '৩ IN ১ হেয়ার ট্রিমার মেশিন',
            price: 1250,
            description: 'প্রফেশনাল হেয়ার ট্রিমার মেশিন। ওয়াটারপ্রুফ ডিজাইন। ২ ঘন্টা ব্যাকআপ।',
            image: 'https://i.imgur.com/nun51uF.jpeg',
            category: 'beauty',
            stock: 25,
            rating: 4.5,
            reviews: 128
        }
    ];
    require('fs').writeFileSync('data/products.json', JSON.stringify(sampleProducts, null, 2));
    "
fi

if [ ! -f "data/orders.json" ]; then
    echo "📁 Creating orders data file..."
    echo "[]" > data/orders.json
fi

echo "✅ Build completed successfully!"
echo "🎯 To start the server: npm start"
