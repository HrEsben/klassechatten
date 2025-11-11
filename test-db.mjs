import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uxdmqhgilcynzxjpbfui.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZG1xaGdpbGN5bnp4anBiZnVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTA2MTQzMywiZXhwIjoyMDQ2NjM3NDMzfQ.yfLI4OOgTyKj_dA9nGOH3jdwgT8VNvXjBEgmE45AErI';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking database schema...\n');

// Check tables
const tables = [
  'profiles',
  'schools', 
  'classes',
  'class_members',
  'rooms',
  'messages',
  'moderation_events',
  'reports',
  'guardian_links',
  'push_tokens'
];

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1);
  
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: Table exists`);
  }
}

console.log('\n✅ Database schema verification complete!');
