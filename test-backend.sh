#!/bin/bash
# Test and wake up the Render backend

echo "🏀 Testing Basketball AI Backend"
echo "=================================="
echo ""
echo "Backend URL: https://basketballaiapp.onrender.com"
echo ""

echo "📡 Pinging backend (this may take 30-60 seconds if cold starting)..."
echo ""

# Try to wake up the backend
START_TIME=$(date +%s)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 https://basketballaiapp.onrender.com/)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is UP! (Response time: ${DURATION}s)"
    echo ""
    echo "📊 Backend Info:"
    curl -s https://basketballaiapp.onrender.com/ | python3 -m json.tool 2>/dev/null || echo "Could not parse JSON"
    echo ""
    echo "✅ Your backend is ready to analyze shots!"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ Backend timed out after 60 seconds"
    echo ""
    echo "This usually means:"
    echo "  1. Backend is cold starting (wait 30 more seconds and try again)"
    echo "  2. Backend service is down"
    echo "  3. Network connectivity issues"
    echo ""
    echo "💡 Try running this script again in 30 seconds"
else
    echo "⚠️  Backend returned HTTP $HTTP_CODE (Response time: ${DURATION}s)"
    echo ""
    echo "This might be normal if the service is starting up."
    echo "Try again in a moment."
fi

echo ""
echo "=================================="
echo ""
echo "To test in your app:"
echo "  1. Open Expo Go"
echo "  2. Record a basketball shot"
echo "  3. Press 'Analyze' or 'Compare with Curry'"
echo "  4. Wait for results (first request may be slow)"
echo ""
