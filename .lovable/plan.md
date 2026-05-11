## Newsletter-Design im Stil des OTP-Mails

### Ziel
Newsletter-Mails (Test- und echter Versand) erhalten ein einheitliches, sauberes Grunddesign analog zum OTP-Mail: heller Hintergrund, weisses gerundetes Card-Layout mit Logo-Header, Schatten, gepflegter Footer. Der Admin schreibt im `/admin/newsletter` weiterhin nur den Inhalt (Plain HTML/Text) – das Wrapping erfolgt automatisch beim Versand.

### Was geändert wird

1. **Neuer Shared-Wrapper für Edge Functions**
   - Datei: `supabase/functions/_shared/newsletter-template.ts`
   - Exportierte Funktion: `wrapNewsletterHtml({ subject, bodyHtml, appUrl, isTest })` → liefert das vollständige HTML-Dokument.
   - Aufbau identisch zum OTP-Mail:
     - Outer: `background:#f4f4f5`, Padding 40px/20px, zentriert.
     - Card: `max-width:600px`, `background:#ffffff`, `border-radius:16px`, `box-shadow:0 10px 25px rgba(0,0,0,0.08)`.
     - Header: linearer Gradient `#f3f4f6 → #e5e7eb`, Padding 20px/24px, Ditax-Logo links (160px Breite, `https://fresh-start-git.lovable.app/ditax-logo-email.png` – derselbe Asset wie OTP).
     - Weiche Trennung 14px wie im OTP (`border-radius:16px 16px 0 0; margin-top:-14px`).
     - Content-Bereich: Padding 34px 40px 36px, H2 `#18181b` 20px 700, Body-Fliesstext `#52525b` 16px line-height 1.65, Links `#1D64FF` unterstrichen.
     - Footer: `background:#fafafa`, `border-top:1px solid #e4e4e7`, Padding 22px 40px, Copyright `© {Jahr} Ditax. Alle Rechte vorbehalten.` + Abmelden-Link (`{appUrl}/privacy-settings`).
   - Test-Modus: oberhalb des Inhalts der bekannte gelbe „Test-E-Mail (Vorschau)"-Banner, aber innerhalb der Card und mit weicheren Rundungen, damit das Layout konsistent bleibt.
   - Subject wird als H2 oben im Content-Bereich verwendet (so wirkt es wie eine Headline), zusätzlich als Preheader unsichtbar.
   - `bodyHtml` des Admins wird unverändert in einen `<div>` mit den Grundtext-Styles eingebettet, damit auch reine Textabsätze gut aussehen.

2. **`send-newsletter-test/index.ts`**
   - `personalizedHtml`-Block durch `wrapNewsletterHtml({ subject, bodyHtml: html_content, appUrl, isTest: true })` ersetzen.
   - Abmelden-Hinweis nicht mehr inline, sondern aus dem Wrapper.

3. **`send-newsletter/index.ts`**
   - Analog: pro Empfänger wird `wrapNewsletterHtml({ subject: campaign.subject, bodyHtml: campaign.html_content, appUrl, isTest: false })` verwendet.

4. **Redeploy** beider Functions am Schluss.

### Was sich für den Admin nicht ändert
- Eingabefelder bleiben „Betreff" + „Inhalt (HTML)" wie heute.
- Der Admin muss/soll keinerlei Layout-HTML mehr selber schreiben – einfacher Text in `<p>`-Tags reicht völlig, das Design liefert der Wrapper.
- Bestehende Kampagnen-Drafts in der Datenbank bleiben unverändert nutzbar (der Wrapper umschliesst nur den Inhalt).

### Nicht Teil dieses Plans
- Kein Wechsel des E-Mail-Providers (bleibt Resend).
- Kein Visual Editor / WYSIWYG im Admin – falls gewünscht, separat angehen.
- Keine Änderung an OTP-/Auth-Mails.

### Verifikation
- Im Admin → Newsletter eine Test-Mail an dich senden. Erwartet: weisses Card-Layout mit Logo-Header, gelben „Test-E-Mail"-Hinweis innerhalb der Card, sauberer Footer mit Copyright + Abmelden-Link – visuell konsistent zum OTP-Mail.
