#!/bin/bash

# Deploy Reactions Migration Script
# This script deploys the reactions feature to Supabase

echo "🚀 Deploying Reactions Migration to Supabase..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Install it with: npm install -g supabase"
    echo ""
    echo "Or manually run the migration:"
    echo "1. Open https://supabase.com/dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy and paste contents of: supabase/migrations/20241114_add_reactions.sql"
    echo "4. Click 'Run'"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Not linked to a Supabase project."
    echo ""
    echo "Link to your project with:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

echo "📊 Checking current database state..."
echo ""

# Run the migration
echo "📝 Running migration: 20241114_add_reactions.sql"
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration deployed successfully!"
    echo ""
    echo "🎉 Emoji reactions are now enabled!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your dev server (if running)"
    echo "2. Open a chat room"
    echo "3. Click the + button under any message"
    echo "4. Select an emoji to test!"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Manual deployment option:"
    echo "1. Open https://supabase.com/dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy and paste contents of: supabase/migrations/20241114_add_reactions.sql"
    echo "4. Click 'Run'"
    echo ""
    exit 1
fi
