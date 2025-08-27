#!/bin/bash

# Social Learning App - Enhanced Development Starter Script
echo "🚀 Starting Social Learning App Development Environment..."

# Function to kill background processes on script exit
cleanup() {
    echo "🛑 Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Auto-configure IP address for mobile development
echo "🔧 Configuring network settings..."
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -n "$CURRENT_IP" ]; then
    echo "📍 Detected IP address: $CURRENT_IP"
    
    # Create mobile .env file
    cat > mobile/.env << EOF
# Auto-generated on $(date)
EXPO_PUBLIC_API_HOST=$CURRENT_IP
NODE_ENV=development
EOF
    echo "✅ Mobile app configured for IP: $CURRENT_IP"
else
    echo "⚠️  Could not detect IP address, using localhost"
fi

# Start backend in background
echo "📡 Starting NestJS backend..."
cd backend
npm run start:dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Test backend connection
if [ -n "$CURRENT_IP" ]; then
    TEST_URL="http://$CURRENT_IP:3000"
else
    TEST_URL="http://localhost:3000"
fi

if curl -s --connect-timeout 5 --max-time 10 "$TEST_URL/hackernews/stories?limit=1" > /dev/null; then
    echo "✅ Backend is ready at $TEST_URL"
else
    echo "⚠️  Backend may still be starting up..."
fi

# Start React Native with iPhone 16 simulator
echo "📱 Starting React Native with iPhone 16 simulator..."
cd ../mobile

# Set the simulator device to iPhone 16
export EXPO_IOS_SIMULATOR_DEVICE_NAME="iPhone 16"

# Start Expo with iOS simulator
npx expo start --ios &
EXPO_PID=$!
echo "✅ React Native started (PID: $EXPO_PID)"

echo ""
echo "🎉 Development environment is running!"
echo "📡 Backend: $TEST_URL"
echo "📱 Mobile app: Running on iPhone 16 simulator"
echo "🔄 Mobile app will automatically connect to: $TEST_URL"
echo ""
echo "💡 If you change WiFi networks, restart this script to reconfigure"
echo "Press Ctrl+C to stop all services"

# Wait for user to stop the script
wait