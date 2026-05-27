// Admin-only: delete auth users with last_sign_in_at NULL or older than 10 days.
// Requires caller to be authenticated AND have 'admin' role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dryRun === true;
    const thresholdDays: number = Number(body?.thresholdDays ?? 10);
    const cutoffMs = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;

    // Page through all users
    const toDelete: { id: string; email: string | null; last_sign_in_at: string | null }[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        // Never delete the calling admin
        if (u.id === user.id) continue;
        const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        if (!u.last_sign_in_at || last < cutoffMs) {
          toDelete.push({ id: u.id, email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null });
        }
      }
      if (data.users.length < perPage) break;
      page++;
    }

    const results: { id: string; email: string | null; ok: boolean; error?: string }[] = [];
    if (!dryRun) {
      for (const u of toDelete) {
        const { error } = await admin.auth.admin.deleteUser(u.id);
        results.push({ id: u.id, email: u.email, ok: !error, error: error?.message });
      }
    }

    return new Response(JSON.stringify({
      dryRun, thresholdDays, candidateCount: toDelete.length,
      candidates: toDelete, results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
