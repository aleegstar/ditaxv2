// Admin-only: seedet 6 Aikido-Testaccounts (2 Mandanten × 3 Rollen)
// für Privilege-Escalation- und Cross-Tenant-Leak-Tests.
//
// Aufruf: POST /functions/v1/seed-aikido-users  (Bearer Admin-JWT)
// Body (optional): { "reset": true }  -> löscht zuerst alle bestehenden aikido_* User
//
// Liefert die 6 Credentials zurück — Output bitte sicher an Aikido weitergeben.
//
// Sicherheit: JWT-Verify in-code, Admin-Rolle via has_role(), service_role-Operationen.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "admin" | "user";

interface SeedSpec {
  email: string;
  role: Role;
  aikido_label: "Admin" | "Manager" | "Viewer";
  tenant: "A" | "B";
  first_name: string;
  last_name: string;
}

// Note: app_role enum has only "admin" and "user".
// Aikido Manager + Viewer both map to "user" (no privilege between admin and user).
const SPECS: SeedSpec[] = [
  { email: "aikido_admin_a@ditax.test",   role: "admin", aikido_label: "Admin",   tenant: "A", first_name: "Aikido", last_name: "AdminA"   },
  { email: "aikido_manager_a@ditax.test", role: "user",  aikido_label: "Manager", tenant: "A", first_name: "Aikido", last_name: "ManagerA" },
  { email: "aikido_viewer_a@ditax.test",  role: "user",  aikido_label: "Viewer",  tenant: "A", first_name: "Aikido", last_name: "ViewerA"  },
  { email: "aikido_admin_b@ditax.test",   role: "admin", aikido_label: "Admin",   tenant: "B", first_name: "Aikido", last_name: "AdminB"   },
  { email: "aikido_manager_b@ditax.test", role: "user",  aikido_label: "Manager", tenant: "B", first_name: "Aikido", last_name: "ManagerB" },
  { email: "aikido_viewer_b@ditax.test",  role: "user",  aikido_label: "Viewer",  tenant: "B", first_name: "Aikido", last_name: "ViewerB"  },
];

function randomPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return "Aik!" + btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "x").slice(0, 22);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: callerId, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const reset = body?.reset === true;

    // Optionally wipe existing aikido_*@ditax.test accounts first.
    if (reset) {
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        for (const u of data.users) {
          if (u.email && u.email.endsWith("@ditax.test") && u.email.startsWith("aikido_")) {
            await admin.auth.admin.deleteUser(u.id);
          }
        }
        if (data.users.length < 1000) break;
        page++;
        if (page > 50) break;
      }
    }

    const created: Array<{
      email: string; password: string; role: Role; tenant: "A" | "B";
      user_id: string; tax_filer_id: string; tax_return_id: string;
    }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const spec of SPECS) {
      // Skip if already exists (and not reset).
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const dupe = existing?.users.find((u) => u.email?.toLowerCase() === spec.email.toLowerCase());
      if (dupe) {
        skipped.push({ email: spec.email, reason: "already exists" });
        continue;
      }

      const password = randomPassword();
      const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
        email: spec.email,
        password,
        email_confirm: true,
        user_metadata: {
          aikido_test: true,
          tenant: spec.tenant,
          role: spec.role,
        },
      });
      if (createErr || !createRes?.user) {
        skipped.push({ email: spec.email, reason: createErr?.message ?? "create failed" });
        continue;
      }
      const uid = createRes.user.id;

      // Assign role (in addition to the default 'user' role the trigger may add).
      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: uid, role: spec.role,
      });
      if (roleErr && !roleErr.message.includes("duplicate")) {
        console.warn(`[seed] role insert failed for ${spec.email}: ${roleErr.message}`);
      }

      // Create tax_filer.
      const { data: filer, error: filerErr } = await admin.from("tax_filers").insert({
        user_id: uid,
        first_name: spec.first_name,
        last_name: spec.last_name,
        relationship: "self",
        is_primary: true,
      }).select("id").single();
      if (filerErr || !filer) {
        skipped.push({ email: spec.email, reason: `tax_filer: ${filerErr?.message}` });
        continue;
      }

      // Create dummy tax_return for 2024.
      const { data: ret, error: retErr } = await admin.from("tax_returns").insert({
        user_id: uid,
        tax_filer_id: filer.id,
        tax_year: "2024",
        status: "pending",
        workflow_step: "data_collection",
      }).select("id").single();
      if (retErr || !ret) {
        skipped.push({ email: spec.email, reason: `tax_return: ${retErr?.message}` });
        continue;
      }

      created.push({
        email: spec.email, password, role: spec.role, tenant: spec.tenant,
        user_id: uid, tax_filer_id: filer.id, tax_return_id: ret.id,
      });
    }

    return new Response(JSON.stringify({
      created_count: created.length,
      skipped_count: skipped.length,
      role_mapping: {
        aikido_admin: "admin",
        aikido_manager: "moderator (closest equivalent — no separate Manager role)",
        aikido_viewer: "user",
      },
      credentials: created,
      skipped,
      cleanup_hint: "Call POST /functions/v1/cleanup-pentest-data to remove all aikido_*@ditax.test users",
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[seed-aikido-users] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
