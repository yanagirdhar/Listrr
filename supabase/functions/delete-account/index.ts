// supabase/functions/delete-account/index.ts
//
// Deploy with:  supabase functions deploy delete-account
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically into every Edge Function's environment by Supabase — you do
// NOT need to set them yourself, and the service-role key never reaches the
// mobile app. This is the piece the client can never safely do on its own.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Bound to the CALLER's own JWT — used only to find out who is asking.
    // This client can never be used to act on anyone else's account.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Admin client with the service-role key. Only exists inside this
    // function's server-side runtime — it is never sent to the app.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Remove any avatar files stored under this user's folder.
    const { data: files, error: listFilesError } = await adminClient.storage
      .from('avatars')
      .list(userId);

    if (!listFilesError && files && files.length > 0) {
      const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
      await adminClient.storage.from('avatars').remove(paths);
    }

    // 2. Explicitly delete app data. The foreign keys are already
    //    ON DELETE CASCADE, so deleting the auth user below would also
    //    remove these — but doing it explicitly first means a misconfigured
    //    cascade fails loudly here instead of silently orphaning data.
    await adminClient.from('lists').delete().eq('user_id', userId);
    await adminClient.from('profiles').delete().eq('id', userId);

    // 3. Delete the actual Supabase Auth user. This is the step that
    //    requires the service-role key and can never be done from the app.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw deleteUserError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});