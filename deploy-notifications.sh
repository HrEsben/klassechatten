#!/bin/bash

# KlasseChatten Notification System Deployment Script
# This script deploys the notification system to Supabase

set -e

echo "🚀 KlasseChatten Notification System Deployment"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase${NC}"
    echo "Login with: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Get project ref
PROJECT_REF="uxdmqhgilcynzxjpbfui"

echo ""
echo "📋 Deployment Steps:"
echo "1. Deploy database migrations"
echo "2. Deploy Edge Function"
echo "3. Configure Database Webhook"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Step 1: Deploy Migrations
echo ""
echo "📦 Step 1: Deploying database migrations..."
echo "-------------------------------------------"

# Link to project if not already linked
supabase link --project-ref $PROJECT_REF || true

# Push all migrations to remote
echo "Pushing migrations to remote database..."
supabase db push --linked

echo -e "${GREEN}✅ Migrations deployed${NC}"

# Step 2: Deploy Edge Function
echo ""
echo "🔧 Step 2: Deploying Edge Function..."
echo "--------------------------------------"

supabase functions deploy send_notification \
  --project-ref $PROJECT_REF

echo -e "${GREEN}✅ Edge Function deployed${NC}"

# Step 3: Configure Database Webhook
echo ""
echo "🔔 Step 3: Configure Database Webhook"
echo "--------------------------------------"
echo ""
echo -e "${YELLOW}⚠️  Manual Step Required${NC}"
echo ""
echo "Go to Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/database/hooks"
echo ""
echo "Create a new webhook with these settings:"
echo ""
echo "  Name: send_notification_webhook"
echo "  Table: notifications"
echo "  Events: INSERT"
echo "  Type: HTTP Request"
echo "  HTTP Method: POST"
echo "  URL: https://$PROJECT_REF.supabase.co/functions/v1/send_notification"
echo "  Headers:"
echo "    Authorization: Bearer [YOUR_ANON_KEY]"
echo "    Content-Type: application/json"
echo ""
echo "Payload:"
echo '  {"type":"{{event.type}}","record":{{event.record}}}'
echo ""

read -p "Have you configured the webhook? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Remember to configure the webhook later!${NC}"
fi

# Step 4: Verify Deployment
echo ""
echo "🔍 Step 4: Verification"
echo "-----------------------"
echo ""
echo "Checking if tables exist..."

# This would require actual DB connection - skip for now
echo -e "${YELLOW}⚠️  Manual verification recommended:${NC}"
echo ""
echo "Run these SQL queries in Supabase SQL Editor:"
echo ""
echo "-- Check tables"
echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'notification%' OR tablename = 'push_tokens';"
echo ""
echo "-- Check functions"
echo "SELECT proname FROM pg_proc WHERE proname LIKE 'notify_%' OR proname LIKE '%notification%';"
echo ""
echo "-- Check triggers"
echo "SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';"
echo ""

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Test notifications:"
echo "   - Send a message in the app"
echo "   - Check notifications table for new entry"
echo "   - Check delivery logs"
echo ""
echo "2. Configure mobile app:"
echo "   - Add Expo project ID to app.json"
echo "   - Initialize push notifications on app start"
echo ""
echo "3. Monitor Edge Function logs:"
echo "   supabase functions logs send_notification --project-ref $PROJECT_REF"
echo ""
echo "4. Read full documentation:"
echo "   cat NOTIFICATIONS.md"
echo ""
