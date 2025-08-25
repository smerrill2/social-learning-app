#!/bin/bash

# Social Learning App - Development Starter Script
echo "🚀 Starting Social Learning App Development Environment..."

# Function to kill background processes on script exit
cleanup() {
    echo "🛑 Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start backend in background
echo "📡 Starting NestJS backend..."
cd backend
npm run start:dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to initialize
sleep 3

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
echo "📡 Backend: http://localhost:3000"
echo "📱 Mobile app: Running on iPhone 16 simulator"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop the script
wait