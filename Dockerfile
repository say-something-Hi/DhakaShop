# Use the official Nginx image
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy your project files to the default Nginx web directory
COPY . /usr/share/nginx/html/

# Expose port 80 for web access
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
