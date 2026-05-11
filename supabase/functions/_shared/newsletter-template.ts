// Shared newsletter HTML wrapper – Design analog zum OTP-Mail.
// Der Admin liefert nur den Inhalt (bodyHtml); dieser Wrapper kümmert sich
// um Card-Layout, Header mit Logo, Footer mit Copyright + Abmelden-Link.

const LOGO_URL = "https://fresh-start-git.lovable.app/ditax-logo-email.png";

export interface NewsletterTemplateInput {
  subject: string;
  bodyHtml: string;
  appUrl: string;
  isTest?: boolean;
  // Tracking (optional – nur in echten Versänden gesetzt, nicht in Tests)
  unsubscribeUrl?: string;
  clickTrackBase?: string; // z.B. "https://<proj>.supabase.co/functions/v1/newsletter-track-click?t=<token>&u="
}

export function wrapNewsletterHtml({
  subject,
  bodyHtml,
  appUrl,
  isTest = false,
  unsubscribeUrl,
  clickTrackBase,
}: NewsletterTemplateInput): string {
  const year = new Date().getFullYear();
  const safeSubject = escapeHtml(subject);
  const preheader = safeSubject;

  const testBanner = isTest
    ? `
      <div style="
        background-color:#fef3c7;
        border:1px solid #f59e0b;
        color:#92400e;
        padding:12px 14px;
        border-radius:10px;
        font-size:13px;
        line-height:1.5;
        margin:0 0 24px 0;
      ">
        ⚠️ Dies ist eine Test-E-Mail (Vorschau). Sie wurde nicht an Abonnenten versendet.
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:0;margin:0;">
              <div style="background:linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%);padding:20px 24px;">
                <img
                  src="${LOGO_URL}"
                  alt="Ditax"
                  width="160"
                  style="display:block;width:160px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </div>
              <!-- weiche Trennung -->
              <div style="height:14px;background-color:#ffffff;border-radius:16px 16px 0 0;margin-top:-14px;"></div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:34px 40px 36px 40px;">
              ${testBanner}
              <h2 style="margin:0 0 18px 0;color:#18181b;font-size:22px;font-weight:700;letter-spacing:-0.2px;line-height:1.3;">
                ${safeSubject}
              </h2>
              <div style="color:#52525b;font-size:16px;line-height:1.65;">
                ${rewriteLinksForTracking(renderBody(bodyHtml), clickTrackBase)}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
                Du erhältst diese E-Mail, weil du dich für Marketing-E-Mails angemeldet hast.
              </p>
              <p style="margin:8px 0 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
                <a href="${unsubscribeUrl || `${appUrl}/privacy-settings`}" style="color:#1D64FF;text-decoration:underline;font-weight:600;">
                  Newsletter abbestellen
                </a>
              </p>
              <p style="margin:14px 0 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
                © ${year} Ditax. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Wenn der Admin reinen Text eingibt, in Absätze + <br /> umwandeln.
// Wenn bereits HTML (Block-Tags) drin ist, unverändert lassen.
function renderBody(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  const hasBlockHtml = /<\s*(p|div|br|h[1-6]|ul|ol|li|table|section|article|blockquote)\b/i.test(trimmed);
  if (hasBlockHtml) return trimmed;

  // Normalize line endings, escape HTML, dann in Absätze splitten.
  const normalized = trimmed.replace(/\r\n?/g, "\n");
  const escaped = escapeHtml(normalized);

  const paragraphs = escaped
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs
    .map((p, idx) => {
      const withBr = p.replace(/\n/g, "<br />");
      const withLinks = autoLink(withBr);
      const isLast = idx === paragraphs.length - 1;
      const margin = isLast ? "0" : "0 0 16px 0";
      return `<p style="margin:${margin};color:#52525b;font-size:16px;line-height:1.65;">${withLinks}</p>`;
    })
    .join("");
}

function autoLink(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#1D64FF;text-decoration:underline;">$1</a>',
  );
}

// Ersetzt jeden href="https?://..." durch einen Click-Tracking-Redirect.
// Lässt mailto:, tel: und bereits umgeschriebene Tracking-URLs unangetastet.
function rewriteLinksForTracking(html: string, clickTrackBase?: string): string {
  if (!clickTrackBase) return html;
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match, url: string) => {
      // bereits Tracking-URL? Nicht doppelt einpacken.
      if (url.startsWith(clickTrackBase.split("?")[0])) {
        return `href="${url}"`;
      }
      return `href="${clickTrackBase}${encodeURIComponent(url)}"`;
    },
  );
}


