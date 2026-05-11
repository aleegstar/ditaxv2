/**
 * Malware Scanning & Upload Validation Edge Function
 *
 * Hardening layers (fail-closed throughout):
 *  1. Auth gate via shared requireAuth() (Origin + Bearer JWT)
 *  2. Size + magic-byte + MIME-mismatch + polyglot + active-PDF checks
 *  3. ClamAV remote scan with timeout + retry; rejects on any error
 *  4. Quarantine on infection + immutable audit log
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, corsHeaders, preflight } from "../_shared/auth.ts";
import { validateFileBlob, MAX_FILE_BYTES } from "../_shared/file-validation.ts";

interface ScanRequest {
  filePath: string;
  bucket: string;
  documentId: string;
  declaredMime?: string;
}

interface ScanResult {
  infected: boolean;
  virusName?: string;
  scanTime: number;
}

const CLAMAV_TIMEOUT_MS = 30_000;
const CLAMAV_RETRIES = 2;

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const { userId, supabaseAdmin } = auth;

  let body: ScanRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { filePath, bucket, documentId, declaredMime } = body ?? {};
  if (!filePath || !bucket || !documentId) {
    return json({ error: "missing_fields" }, 400);
  }

  // Defense: paths must be scoped to the calling user's folder.
  const pathOwner = filePath.split("/")[0];
  if (pathOwner !== userId) {
    await audit(supabaseAdmin, userId, "SCAN_PATH_OWNERSHIP_VIOLATION", filePath, false);
    return json({ error: "path_ownership_violation" }, 403);
  }

  // 1) Download
  const { data: fileData, error: downloadError } = await supabaseAdmin
    .storage.from(bucket).download(filePath);
  if (downloadError || !fileData) {
    return json({ error: "download_failed", detail: downloadError?.message }, 404);
  }
  if (fileData.size > MAX_FILE_BYTES) {
    await quarantine(supabaseAdmin, userId, bucket, filePath, fileData, "oversize");
    return json({ error: "file_too_large" }, 413);
  }

  // 2) Static validation (magic bytes / MIME / polyglot / active-PDF)
  const v = await validateFileBlob(fileData, declaredMime);
  if (!v.ok) {
    await quarantine(supabaseAdmin, userId, bucket, filePath, fileData, v.reason ?? "static_validation");
    await markDocument(supabaseAdmin, documentId, "rejected", { reason: v.reason });
    return json({ status: "rejected", reason: v.reason }, 415);
  }

  // 3) Remote AV scan (fail-closed)
  let scan: ScanResult;
  try {
    scan = await scanWithClamAVHardened(fileData);
  } catch (e) {
    await audit(supabaseAdmin, userId, "SCANNER_UNAVAILABLE", filePath, false,
      e instanceof Error ? e.message : String(e));
    return json({ error: "scanner_unavailable" }, 503);
  }

  if (scan.infected) {
    await quarantine(supabaseAdmin, userId, bucket, filePath, fileData,
      `infected:${scan.virusName ?? "unknown"}`);
    await markDocument(supabaseAdmin, documentId, "quarantined", {
      infected: true, virus_name: scan.virusName,
    });
    await audit(supabaseAdmin, userId, "MALWARE_DETECTED", filePath, false,
      `Virus: ${scan.virusName}`);
    return json({ status: "infected", virus: scan.virusName,
      message: "Datei wurde unter Quarantäne gestellt" }, 403);
  }

  await audit(supabaseAdmin, userId, "FILE_SCAN_CLEAN", filePath, true, undefined, {
    scan_time: scan.scanTime, real_mime: v.realMime,
  });
  return json({ status: "clean", scanTime: scan.scanTime, realMime: v.realMime });
});

// ---- helpers ----

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function audit(
  admin: any, userId: string, action: string, resource: string,
  success: boolean, errorMessage?: string, metadata?: Record<string, unknown>,
) {
  await admin.from("security_audit_logs").insert({
    user_id: userId, action, resource, success,
    error_message: errorMessage, metadata,
  });
}

async function markDocument(admin: any, documentId: string, status: string, metadata: Record<string, unknown>) {
  await admin.from("uploaded_documents").update({ status, metadata }).eq("id", documentId);
}

async function quarantine(
  admin: any, userId: string, bucket: string, filePath: string,
  data: Blob, reason: string,
) {
  const qPath = `infected/${userId}/${Date.now()}_${filePath.split("/").pop()}`;
  try {
    await admin.storage.from("quarantine").upload(qPath, data, {
      contentType: "application/octet-stream", upsert: false,
    });
  } catch (e) {
    console.error("Quarantine upload failed:", e);
  }
  await admin.storage.from(bucket).remove([filePath]);
  await audit(admin, userId, "FILE_QUARANTINED", filePath, false, reason, {
    quarantine_path: qPath, reason,
  });
}

async function scanWithClamAVHardened(blob: Blob): Promise<ScanResult> {
  const clamavUrl = Deno.env.get("CLAMAV_SERVICE_URL");
  if (!clamavUrl) throw new Error("CLAMAV_SERVICE_URL not configured");

  const start = Date.now();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= CLAMAV_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLAMAV_TIMEOUT_MS);
    try {
      const res = await fetch(`${clamavUrl}/scan`, {
        method: "POST", body: blob, signal: controller.signal,
        headers: { "Content-Type": "application/octet-stream" },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`scanner_http_${res.status}`);
      const r = await res.json();
      return {
        infected: r.infected === true,
        virusName: r.virus_name,
        scanTime: Date.now() - start,
      };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < CLAMAV_RETRIES) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error(`scanner_failed: ${lastErr instanceof Error ? lastErr.message : "unknown"}`);
}
