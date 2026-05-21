// Vertex AI helper – Google Cloud Switzerland region (europe-west6, Zürich).
//
// DSGVO/FADP: Alle Inference-Calls laufen in der Schweiz, kein Modell-Training
// auf Kundendaten (Vertex AI Default), keine Persistenz.
//
// Auth: Service Account JWT (RS256) → OAuth2 Access Token (in-memory gecached).

import { SignJWT, importPKCS8 } from "npm:jose@5";

const DEFAULT_LOCATION = "europe-west6";
const DEFAULT_MODEL = "gemini-2.5-pro";

export class VertexAiError extends Error {
  constructor(public code: string, message: string, public status = 502) {
    super(message);
  }
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("GCP_VERTEX_SA_JSON");
  if (!raw) throw new VertexAiError("vertex_not_configured", "GCP_VERTEX_SA_JSON missing", 500);
  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VertexAiError("vertex_not_configured", "GCP_VERTEX_SA_JSON invalid JSON", 500);
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new VertexAiError("vertex_not_configured", "service account missing fields", 500);
  }
  return parsed;
}

function getProjectId(): string {
  const pid = Deno.env.get("GCP_VERTEX_PROJECT_ID");
  if (!pid) throw new VertexAiError("vertex_not_configured", "GCP_VERTEX_PROJECT_ID missing", 500);
  return pid;
}

function getLocation(): string {
  return Deno.env.get("GCP_VERTEX_LOCATION") || DEFAULT_LOCATION;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const sa = loadServiceAccount();
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

  const pk = await importPKCS8(sa.private_key.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);

  const resp = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("[vertex-ai] token exchange failed", resp.status, txt.slice(0, 200));
    throw new VertexAiError("vertex_unauthorized", `oauth ${resp.status}`, 502);
  }
  const body = await resp.json();
  cachedToken = { token: body.access_token, exp: now + (body.expires_in ?? 3500) };
  return cachedToken.token;
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GenerateOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: unknown;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  json?: unknown;
}

export async function generateContent(
  parts: GeminiPart[],
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const token = await getAccessToken();
  const projectId = getProjectId();
  const location = getLocation();
  const model = opts.model || DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 90_000;

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
    `/locations/${location}/publishers/google/models/${model}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.1,
    maxOutputTokens: opts.maxOutputTokens ?? 8192,
  };
  if (opts.responseMimeType) generationConfig.responseMimeType = opts.responseMimeType;
  if (opts.responseSchema) generationConfig.responseSchema = opts.responseSchema;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings: [
      "HARM_CATEGORY_HARASSMENT",
      "HARM_CATEGORY_HATE_SPEECH",
      "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "HARM_CATEGORY_DANGEROUS_CONTENT",
    ].map((category) => ({ category, threshold: "BLOCK_NONE" })),
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new VertexAiError("vertex_timeout", "Vertex timeout", 504);
    throw new VertexAiError("vertex_error", String(e?.message ?? e));
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const txt = await resp.text();
    console.error(`[vertex-ai] ${resp.status}: ${txt.slice(0, 400)}`);
    if (resp.status === 401 || resp.status === 403) {
      throw new VertexAiError("vertex_unauthorized", txt.slice(0, 200), 502);
    }
    if (resp.status === 429) throw new VertexAiError("vertex_quota", txt.slice(0, 200), 429);
    throw new VertexAiError("vertex_error", `${resp.status} ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

  let json: unknown | undefined;
  if (opts.responseMimeType === "application/json" && text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn("[vertex-ai] JSON parse failed, returning raw text");
    }
  }
  return { text, json };
}
