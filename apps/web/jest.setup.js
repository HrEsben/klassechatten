import '@testing-library/jest-dom';

// Suppress watchman warnings
process.env.JEST_DISABLE_SPYABLE = 'true';

// Set Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
