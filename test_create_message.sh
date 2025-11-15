#!/bin/bash

# Test create_message Edge Function
# Usage: ./test_create_message.sh

# Get your access token from browser dev tools (Application > Local Storage > supabase.auth.token)
# Replace YOUR_ACCESS_TOKEN with the actual token

ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
SUPABASE_URL="https://uxdmqhgilcynzxjpbfui.supabase.co"

curl -X POST \
  "${SUPABASE_URL}/functions/v1/create_message" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "YOUR_ROOM_ID",
    "body": "Test message from curl"
  }' \
  -v

echo ""
echo "---"
echo "If you see a valid JSON response above, the function works!"
echo "If you see HTML or an error, check:"
echo "1. The ACCESS_TOKEN is correct (copy from browser localStorage)"
echo "2. The ROOM_ID exists and you have access to it"
echo "3. Check Edge Function logs in Supabase Dashboard"
