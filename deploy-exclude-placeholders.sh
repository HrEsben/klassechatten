#!/bin/bash

# Deploy the updated get_all_users_with_auth function to exclude placeholder users
# This ensures the admin users page doesn't show placeholder accounts

echo "🚀 Deploying updated get_all_users_with_auth function..."

# Get Supabase project details
PROJECT_REF="uxdmqhgilcynzxjpbfui"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Read the SQL file
SQL_CONTENT=$(cat supabase/migrations/20251119_get_all_users_with_auth.sql)

# Execute the SQL using Supabase CLI
echo "📝 Updating function to exclude placeholder users..."
echo "$SQL_CONTENT" | npx supabase db execute --project-ref "$PROJECT_REF"

if [ $? -eq 0 ]; then
  echo "✅ Function updated successfully!"
  echo "   - Placeholder users will no longer appear in admin users page"
  echo "   - Only real users (is_placeholder = false or NULL) will be shown"
else
  echo "❌ Failed to update function"
  exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo "   Visit: ${SUPABASE_URL}/admin/users to see the changes"
