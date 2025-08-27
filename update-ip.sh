#!/bin/bash

# Enhanced script to set up development environment with automatic IP detection

echo "🔍 Setting up development environment..."

# Get current IP address (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    exit 1
fi

echo "📍 Current IP address: $CURRENT_IP"

# Create or update the .env file for mobile app
ENV_FILE="social-learning-app/mobile/.env"

echo "📝 Creating/updating mobile app environment file..."

cat > "$ENV_FILE" << EOF
# Auto-generated environment configuration
# Generated on $(date)

# API Configuration - your Mac's IP address
EXPO_PUBLIC_API_HOST=$CURRENT_IP

# Development Settings
NODE_ENV=development
EOF

echo "✅ Created $ENV_FILE with IP: $CURRENT_IP"

# Test the backend connection
echo "🧪 Testing backend connection..."
if curl -s --connect-timeout 5 --max-time 10 "http://$CURRENT_IP:3000/hackernews/stories?limit=1" > /dev/null; then
    echo "✅ Backend connection successful!"
elif curl -s --connect-timeout 5 --max-time 10 "http://localhost:3000/hackernews/stories?limit=1" > /dev/null; then
    echo "⚠️  Backend is running on localhost only"
    echo "💡 Make sure your backend is configured to listen on 0.0.0.0:3000"
    echo "   Check your backend's main.ts file"
else
    echo "❌ Backend connection failed"
    echo "💡 Make sure your backend is running with: npm run start:dev"
    echo "   Backend should be accessible at: http://$CURRENT_IP:3000"
fi

echo ""
echo "🎉 Development environment configured!"
echo ""
echo "📱 Mobile app will now connect to: http://$CURRENT_IP:3000"
echo "💡 Next steps:"
echo "   1. Restart your mobile app if it's already running"
echo "   2. Make sure your backend is running: cd social-learning-app/backend && npm run start:dev"
echo "   3. Your mobile app should now work on any WiFi network!"
echo ""
echo "🔄 Run this script again whenever you change WiFi networks"
