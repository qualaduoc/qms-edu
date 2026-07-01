import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Tránh crash trong quá trình build nếu chưa có env, nhưng sẽ log cảnh báo
  console.warn('Supabase URL or Anon Key is missing. Connect Supabase to complete setup.');
}

// Client dùng cho Client Components hoặc Server Components thông thường (tuân thủ RLS)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Client dùng cho các tác vụ đặc quyền ở phía server (Server Actions, API Routes)
// Bỏ qua các quy tắc RLS (Row Level Security) - Chỉ sử dụng ở Server-Side!
export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase Service Role Key or URL is missing. Cannot initialize admin client.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
