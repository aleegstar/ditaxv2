// Azure Document Intelligence client (Region: Switzerland North).
// Datenschutz: Dokumente verlassen die Schweiz nicht, kein Training,
// keine persistente Speicherung bei Azure (Subscription-Default).
//
// Verwendung:
//   const result = await analyzeDocument(bytes, "application/pdf", "prebuilt-layout");
//   const text = extractPlainText(result);
//   const tables = extractTables(result);

const API_VERSION = "2024-11-30";

export interface AzureWord {
  content: string;
  confidence?: number;
}

export interface AzureLine {
  content: string;
  polygon?: number[];
}

export interface AzurePage {
  pageNumber: number;
  width?: number;
  height?: number;
  lines?: AzureLine[];
  words?: AzureWord[];
  selectionMarks?: Array<{
    state: "selected" | "unselected";
    polygon?: number[];
    confidence?: number;
  }>;
}

export interface AzureTableCell {
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  content: string;
  kind?: "columnHeader" | "rowHeader" | "content";
}

export interface AzureTable {
  rowCount: number;
  columnCount: number;
  cells: AzureTableCell[];
}

export interface AzureKeyValuePair {
  key?: { content: string };
  value?: { content: string };
  confidence?: number;
}

export interface AzureAnalyzeResult {
  apiVersion?: string;
  modelId?: string;
  content?: string;
  pages?: AzurePage[];
  tables?: AzureTable[];
  keyValuePairs?: AzureKeyValuePair[];
}

export class AzureDocIntelError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | "azure_unauthorized"
      | "rate_limited"
      | "azure_timeout"
      | "azure_error"
      | "azure_not_configured",
  ) {
    super(message);
  }
}

function getEnv() {
  const endpoint = (Deno.env.get("AZURE_DOC_INTEL_ENDPOINT") ?? "").replace(/\/+$/, "");
  const key = Deno.env.get("AZURE_DOC_INTEL_KEY") ?? "";
  if (!endpoint || !key) {
    throw new AzureDocIntelError(
      "Azure Document Intelligence not configured",
      500,
      "azure_not_configured",
    );
  }
  return { endpoint, key };
}

/**
 * Submit a document to Azure Document Intelligence and poll until the analysis
 * result is ready. Returns the parsed AnalyzeResult.
 *
 * @param bytes Raw document bytes (PDF, JPEG, PNG, TIFF, ...)
 * @param mimeType IANA MIME type, used as Content-Type for the POST
 * @param model Azure model id, default "prebuilt-layout"
 *              ("prebuilt-read" for text only, "prebuilt-layout" for text+tables+selection marks)
 * @param pollTimeoutMs Hard timeout in ms (default 60s)
 */
export async function analyzeDocument(
  bytes: Uint8Array,
  mimeType: string,
  model: "prebuilt-read" | "prebuilt-layout" = "prebuilt-layout",
  pollTimeoutMs = 60_000,
): Promise<AzureAnalyzeResult> {
  const { endpoint, key } = getEnv();

  const analyzeUrl =
    `${endpoint}/documentintelligence/documentModels/${model}:analyze` +
    `?api-version=${API_VERSION}`;

  const submit = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": mimeType || "application/pdf",
    },
    body: bytes,
  });

  if (submit.status === 401 || submit.status === 403) {
    throw new AzureDocIntelError("Azure auth failed", submit.status, "azure_unauthorized");
  }
  if (submit.status === 429) {
    throw new AzureDocIntelError("Azure rate limit", 429, "rate_limited");
  }
  if (submit.status !== 202) {
    const txt = await submit.text().catch(() => "");
    console.error(`[azure-doc-intel] submit ${submit.status}: ${txt.slice(0, 300)}`);
    throw new AzureDocIntelError(`Azure submit failed (${submit.status})`, 502, "azure_error");
  }

  const opLoc = submit.headers.get("Operation-Location") ?? submit.headers.get("operation-location");
  if (!opLoc) {
    throw new AzureDocIntelError("Missing Operation-Location header", 502, "azure_error");
  }

  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < pollTimeoutMs) {
    attempt++;
    // Backoff: 1s, 1s, 1.5s, 2s, 2s, ...
    const delay = attempt <= 2 ? 1000 : Math.min(2000, 1000 + attempt * 200);
    await new Promise((r) => setTimeout(r, delay));

    const poll = await fetch(opLoc, {
      method: "GET",
      headers: { "Ocp-Apim-Subscription-Key": key },
    });

    if (poll.status === 401 || poll.status === 403) {
      throw new AzureDocIntelError("Azure auth failed", poll.status, "azure_unauthorized");
    }
    if (poll.status === 429) {
      // transient — keep polling but log it
      console.warn(`[azure-doc-intel] poll 429 attempt=${attempt}`);
      continue;
    }
    if (!poll.ok) {
      const txt = await poll.text().catch(() => "");
      console.error(`[azure-doc-intel] poll ${poll.status}: ${txt.slice(0, 200)}`);
      throw new AzureDocIntelError(`Azure poll failed (${poll.status})`, 502, "azure_error");
    }

    const body = await poll.json();
    const status = body?.status as string | undefined;
    if (status === "succeeded") {
      const elapsed = Date.now() - startedAt;
      console.log(`[azure-doc-intel] succeeded model=${model} ms=${elapsed} attempts=${attempt}`);
      return (body?.analyzeResult ?? {}) as AzureAnalyzeResult;
    }
    if (status === "failed") {
      console.error("[azure-doc-intel] analysis failed:", JSON.stringify(body?.error ?? {}).slice(0, 300));
      throw new AzureDocIntelError("Azure analysis failed", 502, "azure_error");
    }
    // "running" | "notStarted" — keep polling
  }

  throw new AzureDocIntelError("Azure analysis timed out", 504, "azure_timeout");
}

/** Concatenate all line content into one plain-text string (line-separated). */
export function extractPlainText(result: AzureAnalyzeResult): string {
  if (result.content && typeof result.content === "string") return result.content;
  const out: string[] = [];
  for (const page of result.pages ?? []) {
    for (const line of page.lines ?? []) {
      if (line?.content) out.push(line.content);
    }
  }
  return out.join("\n");
}

/** Group cells into a row-major 2D array for easier iteration. */
export function tableToRows(table: AzureTable): string[][] {
  const rows: string[][] = Array.from({ length: table.rowCount }, () =>
    Array.from({ length: table.columnCount }, () => ""),
  );
  for (const cell of table.cells) {
    if (cell.rowIndex < table.rowCount && cell.columnIndex < table.columnCount) {
      rows[cell.rowIndex][cell.columnIndex] = (cell.content ?? "").trim();
    }
  }
  return rows;
}

/** Extract all tables as row arrays (header row included as rows[0]). */
export function extractTables(result: AzureAnalyzeResult): string[][][] {
  return (result.tables ?? []).map(tableToRows);
}
