// Create Supabase client for storage operations
// Using service role key for server-side operations
let supabaseStorage: any = null;

try {
  // Dynamic import to handle case where package might not be installed
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    supabaseStorage = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
} catch (error) {
  console.warn('@supabase/supabase-js is not installed. Supabase storage features will be disabled.');
}

export { supabaseStorage };

// Helper function to get public URL for a file
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabaseStorage) {
    throw new Error(
      'Supabase storage is not configured. Please install @supabase/supabase-js and configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  const { data } = supabaseStorage.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
