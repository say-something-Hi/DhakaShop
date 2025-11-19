# Dockerfile for Raihan Premium Shop
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Create necessary directories
RUN mkdir -p public admin data

# Verify files are copied
RUN ls -la && \
    echo "=== HTML Files ===" && \
    ls -la *.html && \
    echo "=== JS Files ===" && \
    ls -la *.js

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "index.js"]
