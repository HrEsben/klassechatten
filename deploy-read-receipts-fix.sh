#!/bin/bash

# Deploy fix for read_receipts RLS policies
# This script applies the missing policies that were removed in the rollback migration

echo "🔧 Deploying read_receipts RLS policy fix..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Get the project reference
PROJECT_REF="uxdmqhgilcynzxjpbfui"

echo "📋 Migration file: supabase/migrations/20241114_fix_read_receipts_policies.sql"
echo "🎯 Target project: $PROJECT_REF"
echo ""

# Apply the migration
echo "🚀 Applying migration..."
supabase db push --project-ref "$PROJECT_REF"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📝 What was fixed:"
    echo "  - read_receipts_select: Users can view receipts in their classes"
    echo "  - read_receipts_insert: Users can insert their own receipts"
    echo "  - read_receipts_update: Users can update their own receipts (for upsert)"
    echo ""
    echo "🧪 Test by:"
    echo "  1. Restart the mobile app"
    echo "  2. Open a chat room"
    echo "  3. Check console - should see 'Successfully marked messages as read'"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error above and try again"
    exit 1
fi
