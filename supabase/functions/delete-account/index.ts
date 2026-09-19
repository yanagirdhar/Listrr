import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const AVATAR_BUCKET = 'avatars';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Reads a key that Supabase may inject either as a plain string (legacy) or
 * as a JSON dictionary keyed by key name (new API-key system).
 *
 *   SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOi..."
 *   SUPABASE_SECRET_KEYS      = {"default":"sb_secret_..."}
 */
function resolveKey(dictVarName: string, legacyVarName: string): string | null {
  const dictRaw = Deno.env.get(dictVarName);
  if (dictRaw) {
    try {
      const parsed = JSON.parse(dictRaw) as Record<string, string>;
      // Prefer the conventional "default" key, otherwise take the first one.
      const candidate = parsed.default ?? Object.values(parsed)[0];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    } catch {
      // Not JSON — some runtimes inject it as a bare string. Fall through.
      if (dictRaw.trim().length > 0) return dictRaw.trim();
    }
  }

  const legacy = Deno.env.get(legacyVarName);
  return legacy && legacy.trim().length > 0 ? legacy.trim() : null;
}

function getBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;

  // Some clients send a bare token with no "Bearer " prefix.
  return authHeader.trim() || null;
}

/**
 * Deletes this user's application rows. Ordered child-before-parent so the
 * function is correct even if a cascade is ever dropped from the schema.
 */
async function purgeUserData(admin: SupabaseClient, userId: string) {
  const { error: itemsError } = await admin
    .from('list_items')
    .delete()
    .eq('user_id', userId);
  if (itemsError) {
    throw Object.assign(new Error(itemsError.message), { stage: 'list_items' });
  }

  const { error: listsError } = await admin
    .from('lists')
    .delete()
    .eq('user_id', userId);
  if (listsError) {
    throw Object.assign(new Error(listsError.message), { stage: 'lists' });
  }

  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', userId);
  if (profileError) {
    throw Object.assign(new Error(profileError.message), { stage: 'profiles' });
  }
}

/**
 * Removes every object under `<userId>/` in the avatars bucket.
 * A missing folder is NOT an error — a user may never have set an avatar.
 */
async function purgeAvatars(admin: SupabaseClient, userId: string) {
  const { data: files, error: listError } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(userId);

  if (listError) {
    // A missing bucket or empty prefix must not block account deletion.
    console.warn('Avatar listing failed (continuing):', listError.message);
    return;
  }

  if (!files || files.length === 0) return;

  const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
  const { error: removeError } = await admin.storage
    .from(AVATAR_BUCKET)
    .remove(paths);

  if (removeError) {
    console.warn('Avatar cleanup failed (continuing):', removeError.message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed', detail: `Received ${req.method}` }, 405);
  }

  let stage = 'init';

  try {
    stage = 'auth-header';
    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return json(
        {
          error: 'Missing authorization bearer token',
          detail: 'Send the signed-in user access token in the Authorization header.',
          stage,
        },
        401
      );
    }

    stage = 'env';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = resolveKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      const missing = [
        !supabaseUrl && 'SUPABASE_URL',
        !serviceKey && 'SUPABASE_SECRET_KEYS or SUPABASE_SERVICE_ROLE_KEY',
      ]
        .filter(Boolean)
        .join(', ');

      console.error('delete-account: missing environment configuration:', missing);
      return json(
        {
          error: 'The account deletion service is not configured correctly.',
          detail: `Missing: ${missing}`,
          stage,
        },
        500
      );
    }

    // Privileged client. Never leaves this server-side runtime.
    stage = 'admin-client';
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate the CALLER's token. GoTrue verifies the signature and
    // expiry, so a forged or stale token cannot reach the delete path.
    stage = 'verify-caller';
    const { data: userData, error: userError } = await adminClient.auth.getUser(bearerToken);

    if (userError || !userData?.user?.id) {
      return json(
        {
          error: 'Your session is no longer valid. Please sign in again.',
          detail: userError?.message ?? 'Supabase auth rejected this token.',
          stage,
        },
        401
      );
    }

    const userId = userData.user.id;

    stage = 'avatars';
    await purgeAvatars(adminClient, userId);

    stage = 'app-data';
    await purgeUserData(adminClient, userId);

    // Delete the actual Supabase Auth user. This requires the service-role
    // key and can never be done from the app.
    stage = 'auth-user';
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      // The app rows are already gone; surface the real reason so this is
      // debuggable instead of collapsing into a generic non-2xx.
      console.error('delete-account: auth user deletion failed:', deleteUserError.message);
      return json(
        {
          error: 'Your data was removed but the account itself could not be deleted.',
          detail: deleteUserError.message,
          stage,
        },
        500
      );
    }

    return json({ success: true, userId }, 200);
  } catch (err) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    const failedStage = (err as { stage?: string })?.stage ?? stage;
    console.error(`delete-account error [${failedStage}]:`, detail);

    return json(
      {
        error: 'Unable to delete the account. Please try again.',
        detail,
        stage: failedStage,
      },
      500
    );
  }
});
