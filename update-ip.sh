#!/bin/bash

# Script to automatically update the mobile app's API base URL with current IP address

echo "🔍 Detecting current IP address..."

# Get current IP address (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    exit 1
fi

echo "📍 Current IP address: $CURRENT_IP"

# Update the API base URL in the mobile app
API_FILE="social-learning-app/mobile/src/services/api.ts"

if [ ! -f "$API_FILE" ]; then
    echo "❌ API file not found: $API_FILE"
    exit 1
fi

# Backup the original file
cp "$API_FILE" "$API_FILE.backup"

# Update the IP address
sed -i "" "s|http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3000|http://$CURRENT_IP:3000|g" "$API_FILE"

echo "✅ Updated API base URL to: http://$CURRENT_IP:3000"

# Test the connection
echo "🧪 Testing API connection..."
if curl -s --connect-timeout 5 --max-time 10 "http://$CURRENT_IP:3000/hackernews/stories?limit=1" > /dev/null; then
    echo "✅ API connection successful!"
    rm "$API_FILE.backup"
else
    echo "❌ API connection failed. Restoring backup..."
    mv "$API_FILE.backup" "$API_FILE"
    exit 1
fi

echo "🎉 IP address updated successfully!"
echo "💡 You may need to restart your mobile app to see the changes."
