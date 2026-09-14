// Deletes the authenticated caller's Supabase Auth user.
//
// Security model:
// - The caller's JWT (the `Authorization: Bearer <token>` header that
//   supabase-js automatically attaches to functions.invoke calls) is
//   verified against Supabase Auth using the ANON key — this never trusts
//   a client-supplied user ID.
// - The actual deletion uses the SERVICE_ROLE key, read only from this
//   function's server-side environment (Deno.env.get) and never returned
//   in any response or exposed to the client.
// - Deleting the `auth.users` row cascades (via the ON DELETE CASCADE
//   foreign keys already defined in supabase/schema.sql) to
//   public.profiles, public.lists, and public.list_items — no manual
//   table cleanup is required here.
// - Listrr's avatars are base64 data URIs stored directly in
//   profiles.avatar_url (see supabase/schema.sql), not Supabase Storage
//   objects, so there is nothing in Storage to remove separately. If
//   avatars ever move to Storage, add a
//   `storage.from('avatars').remove([...])` call here before deleting
//   the user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required Supabase environment variables for delete-account function');
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Verify the caller's JWT using the ANON key + their own token.
    //    This never trusts a client-supplied user ID.
    const jwt = authHeader.replace('Bearer ', '');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // 2. Delete the user with the service-role key. This key is read only
    //    from the server-side environment and never leaves this function.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError.message);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in delete-account function:', err);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});